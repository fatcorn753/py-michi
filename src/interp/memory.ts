// メモリの模型。1 つの変数・1 回の malloc・1 つの文字列リテラルが、それぞれ 1 つの「ブロック」になる。
// ブロック単位で範囲・生存・初期化を記録するので、範囲外アクセスや free 後の使用を確実に見つけられる。
import { CError } from './errors';
import { sizeOf, wrapInt, type CType } from './types';

export interface Ptr { b: number; o: number }
export type Value = number | Ptr;
export const NULLPTR: Ptr = { b: 0, o: 0 };
export const STDIN_PTR: Ptr = { b: -2, o: 0 };
export const isPtr = (v: Value): v is Ptr => typeof v === 'object';

export type BlockKind = 'stack' | 'heap' | 'global' | 'str';

export interface Block {
  id: number;
  name: string;
  kind: BlockKind;
  size: number;
  base: number;
  bytes: Uint8Array;
  init: Uint8Array;
  /** ポインタ値を書いた場所。バイト列だけでは、どのブロックを指すかが失われるため */
  ptrs: Map<number, Ptr>;
  alive: boolean;
  /** 消えた理由。free されたのか、関数やブロックを抜けて消えたのか */
  deadBy?: 'free' | 'scope';
  deadLine?: number;
  readonly?: boolean;
  /** 図で中身を見せるときの要素の型 */
  viewTy?: CType;
  line: number;
  fn?: string;
}

const BASES: Record<BlockKind, number> = { str: 0x402000, global: 0x404000, heap: 0x5a5a1000, stack: 0x7ffc8000 };

export class Memory {
  blocks = new Map<number, Block>();
  private nextId = 1;
  private cursor: Record<BlockKind, number> = { ...BASES };

  alloc(kind: BlockKind, size: number, name: string, line: number, opts: { zero?: boolean; viewTy?: CType; fn?: string } = {}): Block {
    let base: number;
    // スタックは下(小さいアドレス)へ伸びる。ほかは上へ伸びる
    if (kind === 'stack') {
      this.cursor.stack -= Math.max(16, align(size));
      base = this.cursor.stack;
    } else {
      base = this.cursor[kind];
      this.cursor[kind] += align(size) + (kind === 'heap' ? 16 : 0);
    }
    const b: Block = {
      id: this.nextId++, name, kind, size, base,
      bytes: new Uint8Array(size), init: new Uint8Array(size).fill(opts.zero ? 1 : 0),
      ptrs: new Map(), alive: true, line, viewTy: opts.viewTy, fn: opts.fn,
    };
    this.blocks.set(b.id, b);
    return b;
  }

  /** スタックの領域を、関数を抜けたときに戻す */
  stackMark(): number { return this.cursor.stack; }
  stackRelease(mark: number) { this.cursor.stack = mark; }

  addr(p: Ptr): number {
    if (p.b === 0) return 0;
    if (p.b < 0) return p.o;
    const b = this.blocks.get(p.b);
    return b ? b.base + p.o : p.o;
  }

  /** 整数をアドレスとして使ったとき、そのアドレスを含むブロックを探す */
  fromAddr(a: number): Ptr {
    if (a === 0) return NULLPTR;
    for (const b of this.blocks.values()) {
      if (a >= b.base && a <= b.base + b.size) return { b: b.id, o: a - b.base };
    }
    return { b: -1, o: a };
  }

  /** 読み書きの前に、ポインタが有効な場所を指しているかを確かめる */
  check(p: Ptr, size: number, line: number, write: boolean, what = ''): Block {
    if (p.b === 0) {
      throw new CError('runtime', `NULL ポインタの指す先を${write ? '書き換えよう' : '読もう'}としました。${what}ポインタが NULL でないか、使う前に確かめてください(malloc の失敗や、初期化を忘れていないか)。`, line, 0, 'null-deref');
    }
    if (p.b === -2) throw new CError('runtime', 'stdin は読み書きする場所ではありません。', line, 0, 'bad-pointer');
    if (p.b < 0) {
      throw new CError('runtime', `どの変数も指していないアドレス(0x${p.o.toString(16)})を使いました。整数をポインタとして使っていないか、ポインタに値を入れ忘れていないか確かめてください。`, line, 0, 'bad-pointer');
    }
    const b = this.blocks.get(p.b)!;
    if (!b.alive) {
      if (b.deadBy === 'free') {
        throw new CError('runtime', `free で解放したメモリ(${b.line} 行目で確保、${b.deadLine} 行目で解放)を${write ? '書き換え' : '読み'}ました。解放した後は使えません(use-after-free)。`, line, 0, 'use-after-free', { blockId: b.id, offset: p.o, size });
      }
      throw new CError('runtime', `もう消えた変数「${b.name}」を${write ? '書き換え' : '読み'}ました。関数やブロックを抜けると、その中の変数は消えます。消える変数のアドレスを返したり保存したりしないでください。`, line, 0, 'use-after-free', { blockId: b.id, offset: p.o, size });
    }
    if (p.o < 0 || p.o + size > b.size) {
      const elem = b.viewTy ? sizeOf(b.viewTy) : 1;
      const idx = Math.floor(p.o / elem);
      const n = Math.floor(b.size / elem);
      const where = b.kind === 'heap' ? `malloc で確保した ${b.size} バイトの領域(${b.line} 行目)` : b.kind === 'str' ? '文字列リテラル' : `${b.kind === 'global' ? '大域変数' : '変数'}「${b.name}」`;
      const hint = elem > 0 && n > 0 && b.viewTy ? `添字で言うと [${idx}] ですが、使えるのは [0] 〜 [${n - 1}] です。` : '';
      throw new CError('runtime', `${where}の範囲の外を${write ? '書き換え' : '読み'}ました。${hint}配列の添字やループの終わりの条件(< と <= など)を確かめてください。`, line, 0, 'out-of-bounds', { blockId: b.id, offset: p.o, size });
    }
    if (write && b.readonly) {
      throw new CError('runtime', '文字列リテラル("..." で書いた文字列)は書き換えられません。書き換えたいなら char s[] = "..."; のように配列にコピーしてください。', line, 0, 'bad-pointer');
    }
    return b;
  }

  load(p: Ptr, ty: CType, line: number, what = ''): Value {
    const size = sizeOf(ty);
    const b = this.check(p, size, line, false, what);
    for (let i = 0; i < size; i++) {
      if (!b.init[p.o + i]) {
        const name = b.kind === 'heap' ? `malloc で確保した領域(${b.line} 行目)` : `変数「${b.name}」`;
        throw new CError('runtime', `${name}の、まだ値を入れていない場所を読みました。中身は決まっていない(ゴミの値)ので、先に値を入れてください。`, line, 0, 'uninit', { blockId: b.id, offset: p.o, size });
      }
    }
    if (ty.k === 'ptr') {
      const q = b.ptrs.get(p.o);
      if (q) return q;
      const n = this.readInt(b, p.o, 8, false);
      return this.fromAddr(n);
    }
    if (ty.k === 'double') return new DataView(b.bytes.buffer).getFloat64(p.o, true);
    if (ty.k === 'int') return this.readInt(b, p.o, ty.size, ty.unsigned);
    throw new CError('runtime', 'この型の値は読めません。', line);
  }

  store(p: Ptr, ty: CType, v: Value, line: number) {
    const size = sizeOf(ty);
    const b = this.check(p, size, line, true);
    this.clearPtrs(b, p.o, size);
    if (ty.k === 'ptr') {
      const q = isPtr(v) ? v : this.fromAddr(v);
      this.writeInt(b, p.o, 8, this.addr(q));
      if (q.b !== 0) b.ptrs.set(p.o, q);
    } else if (ty.k === 'double') {
      new DataView(b.bytes.buffer).setFloat64(p.o, isPtr(v) ? this.addr(v) : v, true);
    } else if (ty.k === 'int') {
      this.writeInt(b, p.o, ty.size, wrapInt(isPtr(v) ? this.addr(v) : v, ty));
    }
    b.init.fill(1, p.o, p.o + size);
    if (!b.viewTy && (b.kind === 'heap')) b.viewTy = ty;
  }

  private clearPtrs(b: Block, o: number, size: number) {
    if (b.ptrs.size === 0) return;
    for (const k of [...b.ptrs.keys()]) if (k + 8 > o && k < o + size) b.ptrs.delete(k);
  }

  readInt(b: Block, o: number, size: number, unsigned: boolean): number {
    const dv = new DataView(b.bytes.buffer);
    switch (size) {
      case 1: return unsigned ? dv.getUint8(o) : dv.getInt8(o);
      case 2: return unsigned ? dv.getUint16(o, true) : dv.getInt16(o, true);
      case 4: return unsigned ? dv.getUint32(o, true) : dv.getInt32(o, true);
      default: return Number(unsigned ? dv.getBigUint64(o, true) : dv.getBigInt64(o, true));
    }
  }

  writeInt(b: Block, o: number, size: number, v: number) {
    const dv = new DataView(b.bytes.buffer);
    switch (size) {
      case 1: dv.setUint8(o, v & 0xff); break;
      case 2: dv.setUint16(o, v & 0xffff, true); break;
      case 4: dv.setUint32(o, v >>> 0, true); break;
      default: dv.setBigInt64(o, BigInt.asIntN(64, BigInt(Math.trunc(v))), true);
    }
  }

  /** 1 バイトずつ読む(文字列関数用)。初期化と範囲を確かめる */
  byte(p: Ptr, line: number, fn: string): number {
    const b = this.check(p, 1, line, false);
    if (!b.init[p.o]) {
      throw new CError('runtime', `${fn} が、まだ値を入れていない場所を読みました。文字列の終わりの印 '\\0' がないか、文字列を入れ忘れています。`, line, 0, 'uninit', { blockId: b.id, offset: p.o, size: 1 });
    }
    return b.bytes[p.o];
  }

  setByte(p: Ptr, v: number, line: number) {
    const b = this.check(p, 1, line, true);
    this.clearPtrs(b, p.o, 1);
    b.bytes[p.o] = v & 0xff;
    b.init[p.o] = 1;
  }

  /** C の文字列('\0' まで)を読む。'\0' がないまま範囲を出たら、分かりやすく知らせる */
  cstr(p: Ptr, line: number, fn: string): string {
    let s = '';
    for (let i = 0; ; i++) {
      const q = { b: p.b, o: p.o + i };
      let c: number;
      try {
        c = this.byte(q, line, fn);
      } catch (e) {
        if (e instanceof CError && e.code === 'out-of-bounds') {
          throw new CError('runtime', `${fn} が文字列の終わりの印 '\\0' を見つけられないまま、領域の外まで読み進めました。文字列の最後に '\\0' が入っているか、配列の大きさが足りているか確かめてください。`, line, 0, 'out-of-bounds', e.detail);
        }
        throw e;
      }
      if (c === 0) return s;
      s += String.fromCharCode(c);
    }
  }

  free(p: Ptr, line: number) {
    if (p.b === 0) return;
    const b = p.b > 0 ? this.blocks.get(p.b) : undefined;
    if (!b || b.kind !== 'heap') {
      throw new CError('runtime', `free に渡せるのは malloc で確保したメモリだけです。${b ? `「${b.name}」は普通の変数${b.kind === 'str' ? '(文字列リテラル)' : ''}です。` : ''}`, line, 0, 'bad-free');
    }
    if (!b.alive) {
      throw new CError('runtime', `同じメモリを 2 回 free しました(1 回目は ${b.deadLine} 行目)。1 つの malloc に free は 1 回だけです。`, line, 0, 'double-free', { blockId: b.id });
    }
    if (p.o !== 0) {
      throw new CError('runtime', 'free には、malloc が返したアドレスそのものを渡してください。途中を指すポインタは渡せません。', line, 0, 'bad-free', { blockId: b.id, offset: p.o });
    }
    b.alive = false;
    b.deadBy = 'free';
    b.deadLine = line;
  }

  kill(b: Block, line: number) {
    b.alive = false;
    b.deadBy = 'scope';
    b.deadLine = line;
  }
}

function align(n: number): number {
  return Math.max(8, Math.ceil(n / 8) * 8);
}
