// 構文木をそのまま実行するインタプリタ。1 文ごとに歩数を数え、必要ならメモリの様子を記録する
import { decodedLength, fromBytes, toBytes } from './bytes';
import type { Declarator, Expr, FuncDef, Stmt, Sym } from './ast';
import { CError } from './errors';
import { Memory, NULLPTR, STDIN_PTR, isPtr, type Block, type Ptr, type Value } from './memory';
import { parse } from './parser';
import { check, type Warning } from './sema';
import { formatPrintf } from './format';
import { snapshot, type Snapshot } from './snapshot';
import { T, arithResult, decay, intRange, isInt, ptrTo, sizeOf, typeName, wrapInt, type CType } from './types';

export interface RunOptions {
  stdin?: string;
  maxSteps?: number;
  /** 1 文ごとのメモリの様子を記録する(ステップ実行・メモリ図用) */
  trace?: boolean;
  maxTrace?: number;
}

export interface Leak { line: number; size: number }

export interface RunResult {
  ok: boolean;
  stdout: string;
  exitCode: number | null;
  error?: { kind: CError['kind']; message: string; line: number; col: number; code: CError['code']; detail?: CError['detail'] };
  warnings: Warning[];
  leaks: Leak[];
  steps: number;
  trace: Snapshot[];
}

const BREAK = 1, CONTINUE = 2, RETURN = 3;
type Signal = 0 | typeof BREAK | typeof CONTINUE | typeof RETURN;

class ExitSignal { constructor(public code: number) {} }

export interface Frame {
  fn: string;
  line: number;
  /** 宣言の順に並んだ、いま生きている変数 */
  vars: { sym: Sym; block: Block }[];
  ret?: Value;
  retTy: CType;
}

const MAX_OUT = 100_000;

export function run(src: string, opts: RunOptions = {}): RunResult {
  const res: RunResult = { ok: false, stdout: '', exitCode: null, warnings: [], leaks: [], steps: 0, trace: [] };
  let interp: Interp | null = null;
  try {
    const checked = check(parse(src));
    res.warnings = checked.warnings;
    interp = new Interp(opts, checked.globals);
    const code = interp.start(checked.funcs.get('main')!.fn!);
    res.exitCode = code;
    res.ok = true;
  } catch (e) {
    if (e instanceof CError) {
      let message = e.message;
      if (interp?.inputRanOut && (e.code === 'uninit' || e.code === 'step-limit')) {
        message += '(入力が途中で尽きています。入力欄に値を入れたか確かめてください。)';
      }
      res.error = { kind: e.kind, message, line: e.line, col: e.col, code: e.code, detail: e.detail };
      if (interp) interp.record(e.line, true);
    } else if (e instanceof RangeError) {
      // JS 自体のスタックが尽きた場合も、再帰が深すぎるとして伝える
      res.error = { kind: 'runtime', message: '関数の呼び出しが深くなりすぎました。再帰の終わりの条件を確かめてください。', line: interp?.line ?? 0, col: 0, code: 'stack-overflow' };
    } else {
      res.error = { kind: 'runtime', message: `内部エラー: ${(e as Error).message}`, line: interp?.line ?? 0, col: 0, code: 'other' };
    }
  }
  if (interp) {
    res.stdout = fromBytes(interp.out);
    res.steps = interp.steps;
    res.trace = interp.trace;
    // 記録した出力の位置はバイト数なので、戻した文字列での位置に直す
    if (res.stdout.length !== interp.out.length) for (const t of res.trace) t.out = decodedLength(interp.out, t.out);
    if (res.ok) {
      for (const b of interp.mem.blocks.values()) if (b.kind === 'heap' && b.alive) res.leaks.push({ line: b.line, size: b.size });
    }
  }
  return res;
}

class Interp {
  mem = new Memory();
  out = '';
  steps = 0;
  line = 0;
  trace: Snapshot[] = [];
  private frames: Frame[] = [];
  private globals: { sym: Sym; block: Block }[] = [];
  private symBlocks = new Map<number, Block>();
  private strBlocks = new WeakMap<Expr, Block>();
  private stdin: string;
  private inPos = 0;
  private maxSteps: number;
  private seed = 1;

  constructor(private opts: RunOptions, private globalSyms: Sym[]) {
    this.stdin = toBytes(opts.stdin ?? '');
    this.maxSteps = opts.maxSteps ?? 500_000;
  }

  start(main: FuncDef): number {
    for (const s of this.globalSyms) {
      const b = this.mem.alloc('global', sizeOf(s.ty), s.name, s.line, { zero: true, viewTy: elemTy(s.ty) });
      this.symBlocks.set(s.id, b);
      this.globals.push({ sym: s, block: b });
    }
    // 大域変数の初期化子を順に入れる
    for (const s of this.globalSyms) {
      if (s.decl?.init) this.initVar(this.symBlocks.get(s.id)!, s.ty, s.decl.init);
    }
    try {
      const v = this.callFunc(main, [], main.line);
      this.record(this.line, false, 'プログラム終了');
      return typeof v === 'number' ? v : 0;
    } catch (e) {
      if (e instanceof ExitSignal) { this.record(this.line, false, 'exit で終了'); return e.code; }
      throw e;
    }
  }

  // ───── 記録 ─────

  record(line: number, isError = false, event?: string) {
    if (!this.opts.trace) return;
    if (this.trace.length >= (this.opts.maxTrace ?? 3000) && !isError && !event) return;
    this.trace.push(snapshot(this.mem, this.frames, this.globals, line, this.out.length, event, isError));
  }

  private tick(line: number) {
    this.line = line;
    if (++this.steps > this.maxSteps) {
      throw new CError('limit', `${this.maxSteps.toLocaleString()} 歩を超えても終わりませんでした。無限ループになっていないか、ループの条件が変わっていくかを確かめてください。`, line, 0, 'step-limit');
    }
  }

  // ───── 関数 ─────

  private callFunc(f: FuncDef, args: Value[], line: number): Value | undefined {
    if (this.frames.length >= 2000) {
      throw new CError('runtime', `関数の呼び出しが ${this.frames.length} 段まで深くなりました(スタックオーバーフロー)。再帰の終わりの条件に必ず届くか確かめてください。`, line, 0, 'stack-overflow');
    }
    const mark = this.mem.stackMark();
    const frame: Frame = { fn: f.name, line: f.line, vars: [], retTy: f.ty.ret };
    this.frames.push(frame);
    f.params.forEach((p, i) => {
      const b = this.allocLocal(p.sym!, f.line);
      this.mem.store({ b: b.id, o: 0 }, p.sym!.ty, this.convert(args[i], p.sym!.ty), f.line);
    });
    const sig = this.execBlockBody(f.body.body, f.body.line);
    void sig;
    // 関数を抜けたら、その関数の変数はすべて消える
    for (const v of frame.vars) this.mem.kill(v.block, this.line);
    this.frames.pop();
    this.mem.stackRelease(mark);
    const ret = f.ty.ret;
    if (ret.k === 'void') return undefined;
    if (frame.ret === undefined) {
      if (f.name === 'main') return 0;
      throw new CError('runtime', `関数「${f.name}」が return せずに終わりました。呼び出した側は ${typeName(ret)} の値を受け取れません。`, this.line, 0, 'other');
    }
    return frame.ret;
  }

  private allocLocal(sym: Sym, line: number, size = sizeOf(sym.ty)): Block {
    const frame = this.frames[this.frames.length - 1];
    const b = this.mem.alloc('stack', size, sym.name, line, { viewTy: elemTy(sym.ty), fn: frame.fn });
    this.symBlocks.set(sym.id, b);
    frame.vars.push({ sym, block: b });
    return b;
  }

  // ───── 文 ─────

  private execBlockBody(body: Stmt[], line: number): Signal {
    const frame = this.frames[this.frames.length - 1];
    const before = frame.vars.length;
    let sig: Signal = 0;
    try {
      for (const s of body) {
        sig = this.exec(s);
        if (sig) break;
      }
    } finally {
      // ブロックを抜けたら、そのブロックで宣言した変数は消える
      if (this.frames[this.frames.length - 1] === frame) {
        const gone = frame.vars.splice(before);
        for (const v of gone) this.mem.kill(v.block, line);
      }
    }
    return sig;
  }

  private exec(s: Stmt): Signal {
    switch (s.k) {
      case 'block': return this.execBlockBody(s.body, s.line);
      case 'empty': return 0;
      case 'case': return 0;
      case 'expr':
        this.step(s.line);
        this.eval(s.e);
        return 0;
      case 'decl':
        this.step(s.line);
        for (const d of s.decls) this.declare(d);
        return 0;
      case 'if':
        this.step(s.line);
        if (this.truthy(this.eval(s.c))) return this.exec(s.t);
        return s.e ? this.exec(s.e) : 0;
      case 'while':
        for (;;) {
          this.step(s.line);
          if (!this.truthy(this.eval(s.c))) return 0;
          const sig = this.exec(s.b);
          if (sig === BREAK) return 0;
          if (sig === RETURN) return sig;
        }
      case 'dowhile':
        for (;;) {
          const sig = this.exec(s.b);
          if (sig === BREAK) return 0;
          if (sig === RETURN) return sig;
          this.step(s.c.line);
          if (!this.truthy(this.eval(s.c))) return 0;
        }
      case 'for': {
        const frame = this.frames[this.frames.length - 1];
        const before = frame.vars.length;
        try {
          if (s.init) this.exec(s.init);
          for (;;) {
            if (s.c) {
              this.step(s.line);
              if (!this.truthy(this.eval(s.c))) return 0;
            } else this.tick(s.line);
            const sig = this.exec(s.b);
            if (sig === BREAK) return 0;
            if (sig === RETURN) return sig;
            if (s.step) this.eval(s.step);
          }
        } finally {
          const gone = frame.vars.splice(before);
          for (const v of gone) this.mem.kill(v.block, s.line);
        }
      }
      case 'return': {
        this.step(s.line);
        const frame = this.frames[this.frames.length - 1];
        if (s.e) frame.ret = this.convert(this.eval(s.e), frame.retTy);
        return RETURN;
      }
      case 'break': return BREAK;
      case 'continue': return CONTINUE;
      case 'switch': {
        this.step(s.line);
        const v = this.eval(s.e) as number;
        let start = s.body.findIndex((x) => x.k === 'case' && x.v !== null && x.cv === v);
        if (start < 0) start = s.body.findIndex((x) => x.k === 'case' && x.v === null);
        if (start < 0) return 0;
        const sig = this.execBlockBody(s.body.slice(start), s.line);
        if (sig === BREAK) return 0;
        return sig;
      }
    }
  }

  private step(line: number) {
    this.tick(line);
    this.record(line);
  }

  private declare(d: Declarator) {
    const sym = d.sym!;
    let size = sizeOf(sym.ty);
    let ty = sym.ty;
    if (sym.vlaLen) {
      const n = Number(this.eval(sym.vlaLen));
      if (!(n > 0)) throw new CError('runtime', `配列「${sym.name}」の大きさが ${n} になりました。大きさは 1 以上にしてください。`, d.line, 0, 'other');
      if (n > 1_000_000) throw new CError('runtime', `配列「${sym.name}」が大きすぎます(${n} 要素)。`, d.line, 0, 'other');
      ty = { k: 'array', of: (sym.ty as { of: CType }).of, len: n };
      size = sizeOf(ty);
      this.vlaTypes.set(sym.id, ty);
    }
    const b = this.allocLocal(sym, d.line, size);
    if (d.init) this.initVar(b, ty, d.init);
  }
  private vlaTypes = new Map<number, CType>();

  private initVar(b: Block, ty: CType, init: Expr, off = 0) {
    const p = { b: b.id, o: off };
    if (ty.k === 'array') {
      const es = sizeOf(ty.of);
      if (init.k === 'str') {
        for (let i = 0; i < (ty.len ?? 0); i++) this.mem.store({ b: b.id, o: off + i }, T.char, i < init.v.length ? init.v.charCodeAt(i) & 0xff : 0, init.line);
        return;
      }
      if (init.k === 'initlist') {
        // 足りない要素は 0 で埋まる(C の決まり)
        for (let i = 0; i < (ty.len ?? 0); i++) {
          const it = init.items[i];
          if (it) this.initVar(b, ty.of, it, off + i * es);
          else this.zeroFill(b, ty.of, off + i * es, init.line);
        }
      }
      return;
    }
    const e = init.k === 'initlist' ? init.items[0] : init;
    this.mem.store(p, ty, this.convert(this.eval(e), ty, e), init.line);
  }

  private zeroFill(b: Block, ty: CType, off: number, line: number) {
    if (ty.k === 'array') {
      for (let i = 0; i < (ty.len ?? 0); i++) this.zeroFill(b, ty.of, off + i * sizeOf(ty.of), line);
      return;
    }
    this.mem.store({ b: b.id, o: off }, ty, ty.k === 'ptr' ? NULLPTR : 0, line);
  }

  // ───── 式 ─────

  private truthy(v: Value): boolean {
    return isPtr(v) ? v.b !== 0 : v !== 0;
  }

  private typeOf(e: Expr): CType {
    if (e.k === 'id' && e.sym && this.vlaTypes.has(e.sym.id)) return this.vlaTypes.get(e.sym.id)!;
    return e.ty!;
  }

  /** 左辺値(書き込める場所)のアドレスを求める */
  private loc(e: Expr): Ptr {
    switch (e.k) {
      case 'id': {
        // 再帰では同じ変数が段ごとに別の箱になるので、まず実行中の関数の変数から探す。なければ大域変数
        const vars = this.frames[this.frames.length - 1]?.vars ?? [];
        let b: Block | undefined;
        for (let i = vars.length - 1; i >= 0 && !b; i--) if (vars[i].sym.id === e.sym!.id) b = vars[i].block;
        b ??= this.symBlocks.get(e.sym!.id);
        if (!b) throw new CError('runtime', `変数「${e.name}」はまだ作られていません。`, e.line);
        return { b: b.id, o: 0 };
      }
      case 'index': {
        const at = decay(this.typeOf(e.a));
        const [pe, ie] = at.k === 'ptr' ? [e.a, e.i] : [e.i, e.a];
        const p = this.eval(pe);
        const i = this.eval(ie) as number;
        if (!isPtr(p)) throw new CError('runtime', '[ ] の前がポインタではありません。', e.line, 0, 'bad-pointer');
        const elem = this.typeOf(e);
        return { b: p.b, o: p.o + i * sizeOf(elem) };
      }
      case 'un':
        if (e.op === '*') {
          const p = this.eval(e.e);
          if (!isPtr(p)) throw new CError('runtime', 'ポインタではない値の指す先を読もうとしました。', e.line, 0, 'bad-pointer');
          return p;
        }
        break;
      case 'str': return { b: this.strBlock(e).id, o: 0 };
    }
    throw new CError('runtime', 'この式には場所(アドレス)がありません。', e.line);
  }

  private strBlock(e: Expr & { k: 'str' }): Block {
    let b = this.strBlocks.get(e);
    if (!b) {
      const label = fromBytes(e.v);
      b = this.mem.alloc('str', e.v.length + 1, `"${label.length > 12 ? label.slice(0, 12) + '…' : label}"`, e.line, { zero: true, viewTy: T.char });
      for (let i = 0; i < e.v.length; i++) b.bytes[i] = e.v.charCodeAt(i) & 0xff;
      b.readonly = true;
      this.strBlocks.set(e, b);
    }
    return b;
  }

  private load(e: Expr): Value {
    const ty = this.typeOf(e);
    const p = this.loc(e);
    if (ty.k === 'array') return p;
    const what = e.k === 'un' ? `「${describe(e.e)}」の` : '';
    return this.mem.load(p, ty, e.line, what);
  }

  eval(e: Expr): Value {
    switch (e.k) {
      case 'num':
        if (e.ty?.k === 'ptr') return e.v === -2 ? STDIN_PTR : NULLPTR;
        return e.v;
      case 'float': return e.v;
      case 'str': return { b: this.strBlock(e).id, o: 0 };
      case 'id':
      case 'index':
        return this.load(e);
      case 'sizeof': {
        if (e.t) return sizeOf(e.t);
        return sizeOf(this.typeOf(e.e!));
      }
      case 'cast': return this.convert(this.eval(e.e), e.to, e.e);
      case 'comma': this.eval(e.l); return this.eval(e.r);
      case 'cond': {
        const t = e.ty!;
        const v = this.truthy(this.eval(e.c)) ? this.eval(e.a) : this.eval(e.b);
        return this.convert(v, t);
      }
      case 'un': return this.unary(e);
      case 'incdec': {
        const ty = this.typeOf(e.e);
        const p = this.loc(e.e);
        const old = this.mem.load(p, ty, e.line, `「${describe(e.e)}」の`);
        const d = e.op === '++' ? 1 : -1;
        const nv = isPtr(old) ? { b: old.b, o: old.o + d * sizeOf((ty as { to: CType }).to) } : this.checkOverflow(old + d, ty, e.line);
        this.mem.store(p, ty, nv, e.line);
        return e.prefix ? this.mem.load(p, ty, e.line) : old;
      }
      case 'assign': return this.assign(e);
      case 'bin': return this.binary(e);
      case 'call': return this.call(e) ?? 0;
      case 'initlist': throw new CError('runtime', '{ } はここでは使えません。', e.line);
    }
  }

  private unary(e: Expr & { k: 'un' }): Value {
    switch (e.op) {
      case '&': return this.loc(e.e);
      case '*': return this.load(e);
      case '!': return this.truthy(this.eval(e.e)) ? 0 : 1;
      case '-': {
        const v = this.eval(e.e) as number;
        return e.ty!.k === 'double' ? -v : this.checkOverflow(-v, e.ty!, e.line);
      }
      case '+': return this.eval(e.e);
      case '~': return wrapInt(~(this.eval(e.e) as number), e.ty!);
    }
    throw new CError('runtime', `演算子「${e.op}」は使えません。`, e.line);
  }

  private assign(e: Expr & { k: 'assign' }): Value {
    const lt = this.typeOf(e.l);
    if (e.op === '=') {
      const v = this.convert(this.eval(e.r), lt, e.r);
      const p = this.loc(e.l);
      this.mem.store(p, lt, v, e.line);
      return this.mem.load(p, lt, e.line);
    }
    const p = this.loc(e.l);
    const old = this.mem.load(p, lt, e.line, `「${describe(e.l)}」の`);
    const r = this.eval(e.r);
    const op = e.op.slice(0, -1);
    const v = this.arith(op, old, r, lt, decay(this.typeOf(e.r)), e.line, lt);
    this.mem.store(p, lt, this.convert(v, lt), e.line);
    return this.mem.load(p, lt, e.line);
  }

  private binary(e: Expr & { k: 'bin' }): Value {
    if (e.op === '&&') return this.truthy(this.eval(e.l)) && this.truthy(this.eval(e.r)) ? 1 : 0;
    if (e.op === '||') return this.truthy(this.eval(e.l)) || this.truthy(this.eval(e.r)) ? 1 : 0;
    const l = this.eval(e.l), r = this.eval(e.r);
    return this.arith(e.op, l, r, decay(this.typeOf(e.l)), decay(this.typeOf(e.r)), e.line, e.ty!);
  }

  private arith(op: string, l: Value, r: Value, lt: CType, rt: CType, line: number, rest: CType): Value {
    // ポインタの計算
    if (isPtr(l) || isPtr(r)) {
      if (['==', '!=', '<', '>', '<=', '>='].includes(op)) {
        const la = isPtr(l) ? this.mem.addr(l) : l;
        const lb = isPtr(r) ? this.mem.addr(r) : r;
        return cmp(op, la, lb) ? 1 : 0;
      }
      if (op === '+' || op === '-') {
        if (isPtr(l) && isPtr(r)) {
          const es = sizeOf((lt as { to: CType }).to);
          if (l.b !== r.b) throw new CError('runtime', '別々の配列を指すポインタどうしを引き算しました。同じ配列の中を指すポインタどうしだけ引き算できます。', line, 0, 'bad-pointer');
          return Math.trunc((l.o - r.o) / es);
        }
        const [p, n, pt] = isPtr(l) ? [l, r as number, lt] : [r as Ptr, l as number, rt];
        const es = sizeOf((pt as { to: CType }).to);
        return { b: p.b, o: p.o + (op === '+' ? n : -n) * es };
      }
      throw new CError('runtime', `ポインタに「${op}」は使えません。`, line);
    }
    let a = l as number, b = r as number;
    const ty = ['==', '!=', '<', '>', '<=', '>='].includes(op) ? arithResult(lt, rt) : (op === '<<' || op === '>>') ? rest : arithResult(lt, rt);
    if (ty.k === 'int') {
      a = wrapInt(a, ty); b = wrapInt(b, ty.k === 'int' && (op === '<<' || op === '>>') ? T.int : ty);
    }
    switch (op) {
      case '+': return this.checkOverflow(a + b, ty, line);
      case '-': return this.checkOverflow(a - b, ty, line);
      case '*': return ty.k === 'int' && ty.size === 8 ? this.checkOverflow(Number(BigInt(a) * BigInt(b)), ty, line) : this.checkOverflow(a * b, ty, line);
      case '/':
        if (ty.k === 'int') {
          if (b === 0) throw new CError('runtime', '0 で割り算しました。割る数が 0 にならないように確かめてください。', line, 0, 'div-zero');
          return this.checkOverflow(Math.trunc(a / b), ty, line);
        }
        return a / b;
      case '%':
        if (b === 0) throw new CError('runtime', '0 で割った余り(% 0)を求めました。割る数が 0 にならないように確かめてください。', line, 0, 'div-zero');
        return a % b;
      case '<<': return wrapInt(Number(BigInt(a) << BigInt(b)), ty);
      case '>>': return wrapInt(Number(BigInt(a) >> BigInt(b)), ty);
      case '&': return wrapInt(Number(BigInt(a) & BigInt(b)), ty);
      case '|': return wrapInt(Number(BigInt(a) | BigInt(b)), ty);
      case '^': return wrapInt(Number(BigInt(a) ^ BigInt(b)), ty);
      default: return cmp(op, a, b) ? 1 : 0;
    }
  }

  /** 符号付き整数のあふれ(未定義動作)を見つける。符号なしは折り返す */
  private checkOverflow(v: number, ty: CType, line: number): number {
    if (ty.k !== 'int') return v;
    if (ty.unsigned) return wrapInt(v, ty);
    const [lo, hi] = intRange(ty);
    if (v < lo || v > hi) {
      throw new CError('runtime', `計算結果 ${v} が ${typeName(ty)} の範囲(${lo} 〜 ${hi})を超えました(オーバーフロー)。もっと大きな型(long など)を使うか、計算の順番を見直してください。`, line, 0, 'overflow');
    }
    return v;
  }

  /** 型の変換。代入・引数・キャストで使う */
  convert(v: Value, to: CType, src?: Expr): Value {
    if (v === undefined) return 0;
    if (to.k === 'ptr') {
      if (isPtr(v)) return v;
      if (v === 0) return NULLPTR;
      return this.mem.fromAddr(v);
    }
    if (to.k === 'int') {
      if (isPtr(v)) return wrapInt(this.mem.addr(v), to);
      if (src?.ty?.k === 'double' && !Number.isFinite(v)) return 0;
      return wrapInt(v, to);
    }
    if (to.k === 'double') return isPtr(v) ? this.mem.addr(v) : v;
    return v;
  }

  // ───── 関数呼び出し ─────

  private call(e: Expr & { k: 'call' }): Value | undefined {
    if (e.sym?.fn) {
      const f = e.sym.fn;
      const args = e.args.map((a, i) => this.convert(this.eval(a), f.params[i].sym!.ty, a));
      const v = this.callFunc(f, args, e.line);
      this.record(e.line, false, `${f.name} から戻った`);
      return v;
    }
    return this.builtin(e);
  }

  private str(p: Value, line: number, fn: string): string {
    if (!isPtr(p)) throw new CError('runtime', `${fn} に文字列ではない値を渡しました。`, line, 0, 'bad-pointer');
    return this.mem.cstr(p, line, fn);
  }

  private writeStr(p: Ptr, s: string, line: number, fn: string) {
    for (let i = 0; i <= s.length; i++) {
      try {
        this.mem.setByte({ b: p.b, o: p.o + i }, i < s.length ? s.charCodeAt(i) : 0, line);
      } catch (err) {
        if (err instanceof CError && err.code === 'out-of-bounds') {
          throw new CError('runtime', `${fn} で書き込む文字列(${s.length} 文字 + 終わりの '\\0')が、書き込み先の配列に入りきりません(バッファオーバーフロー)。配列を大きくするか、長さを制限してください。`, line, 0, 'out-of-bounds', err.detail);
        }
        throw err;
      }
    }
  }

  private emit(s: string, line: number) {
    this.out += s;
    if (this.out.length > MAX_OUT) throw new CError('limit', `出力が ${MAX_OUT.toLocaleString()} 文字を超えました。ループが止まっているか確かめてください。`, line, 0, 'step-limit');
  }

  private builtin(e: Expr & { k: 'call' }): Value | undefined {
    const L = e.line;
    const a = e.args.map((x) => this.eval(x));
    const num = (i: number) => (isPtr(a[i]) ? this.mem.addr(a[i] as Ptr) : (a[i] as number));
    const ptr = (i: number): Ptr => (isPtr(a[i]) ? (a[i] as Ptr) : this.mem.fromAddr(a[i] as number));
    switch (e.name) {
      case 'printf': {
        const fmt = this.str(a[0], L, 'printf');
        const s = formatPrintf(fmt, a.slice(1), e.args.slice(1).map((x) => decay(x.ty!)), {
          str: (p) => this.str(p, L, 'printf の %s'),
          addr: (p) => this.mem.addr(p),
        }, L);
        this.emit(s, L);
        return s.length;
      }
      case 'puts': { const s = this.str(a[0], L, 'puts'); this.emit(s + '\n', L); return 1; }
      case 'putchar': { this.emit(String.fromCharCode(num(0) & 0xff), L); return num(0); }
      case 'getchar': {
        if (this.inPos >= this.stdin.length) return -1;
        return this.stdin.charCodeAt(this.inPos++) & 0xff;
      }
      case 'fgets': {
        const buf = ptr(0), n = num(1);
        if (this.inPos >= this.stdin.length) return NULLPTR;
        let s = '';
        while (s.length < n - 1 && this.inPos < this.stdin.length) {
          const c = this.stdin[this.inPos++];
          s += c;
          if (c === '\n') break;
        }
        this.writeStr(buf, s, L, 'fgets');
        return buf;
      }
      case 'scanf': return this.scanf(a, e, L);
      case 'strlen': return this.str(a[0], L, 'strlen').length;
      case 'strcpy': { const s = this.str(a[1], L, 'strcpy'); this.writeStr(ptr(0), s, L, 'strcpy'); return a[0]; }
      case 'strncpy': {
        const n = num(2), dst = ptr(0);
        let s = '';
        for (let i = 0; i < n; i++) { const c = this.mem.byte({ b: (a[1] as Ptr).b, o: (a[1] as Ptr).o + i }, L, 'strncpy'); if (!c) break; s += String.fromCharCode(c); }
        for (let i = 0; i < n; i++) this.mem.setByte({ b: dst.b, o: dst.o + i }, i < s.length ? s.charCodeAt(i) : 0, L);
        return a[0];
      }
      case 'strcat': { const d = this.str(a[0], L, 'strcat'); const s = this.str(a[1], L, 'strcat'); this.writeStr({ b: ptr(0).b, o: ptr(0).o + d.length }, s, L, 'strcat'); return a[0]; }
      case 'strcmp': return Math.sign(cmpStr(this.str(a[0], L, 'strcmp'), this.str(a[1], L, 'strcmp')));
      case 'strncmp': { const n = num(2); return Math.sign(cmpStr(this.str(a[0], L, 'strncmp').slice(0, n), this.str(a[1], L, 'strncmp').slice(0, n))); }
      case 'strchr': {
        const s = this.str(a[0], L, 'strchr'), c = num(1) & 0xff;
        const i = c === 0 ? s.length : s.indexOf(String.fromCharCode(c));
        return i < 0 ? NULLPTR : { b: ptr(0).b, o: ptr(0).o + i };
      }
      case 'strstr': {
        const i = this.str(a[0], L, 'strstr').indexOf(this.str(a[1], L, 'strstr'));
        return i < 0 ? NULLPTR : { b: ptr(0).b, o: ptr(0).o + i };
      }
      case 'malloc': case 'calloc': {
        const size = e.name === 'malloc' ? num(0) : num(0) * num(1);
        if (size < 0 || size > 16_000_000) throw new CError('runtime', `${e.name} で ${size} バイトを確保しようとしました。大きさの計算(sizeof の掛け算など)を確かめてください。`, L, 0, 'other');
        const b = this.mem.alloc('heap', size, `${e.name}(${size})`, L, { zero: e.name === 'calloc' });
        return { b: b.id, o: 0 };
      }
      case 'realloc': {
        const old = ptr(0), size = num(1);
        const nb = this.mem.alloc('heap', size, `realloc(${size})`, L);
        if (old.b !== 0) {
          const ob = this.mem.check(old, 0, L, false);
          const n = Math.min(ob.size, size);
          nb.bytes.set(ob.bytes.subarray(0, n)); nb.init.set(ob.init.subarray(0, n));
          for (const [k, v] of ob.ptrs) if (k + 8 <= n) nb.ptrs.set(k, v);
          nb.viewTy = ob.viewTy;
          this.mem.free(old, L);
        }
        return { b: nb.id, o: 0 };
      }
      case 'free': this.mem.free(ptr(0), L); return undefined;
      case 'memset': {
        const p = ptr(0), n = num(2);
        for (let i = 0; i < n; i++) this.mem.setByte({ b: p.b, o: p.o + i }, num(1), L);
        return p;
      }
      case 'memcpy': {
        const d = ptr(0), s = ptr(1), n = num(2);
        const sb = this.mem.check(s, n, L, false), db = this.mem.check(d, n, L, true);
        for (let i = 0; i < n; i++) { db.bytes[d.o + i] = sb.bytes[s.o + i]; db.init[d.o + i] = sb.init[s.o + i]; }
        for (const [k, v] of sb.ptrs) if (k >= s.o && k + 8 <= s.o + n) db.ptrs.set(d.o + (k - s.o), v);
        return d;
      }
      case 'abs': return Math.abs(num(0));
      case 'atoi': { const m = this.str(a[0], L, 'atoi').match(/^\s*([+-]?\d+)/); return m ? wrapInt(parseInt(m[1], 10), T.int) : 0; }
      case 'exit': throw new ExitSignal(num(0));
      case 'rand': this.seed = (this.seed * 1103515245 + 12345) % 2147483648; return Math.floor(this.seed / 65536) % 32768;
      case 'srand': this.seed = num(0) >>> 0; return undefined;
      case 'isdigit': return /[0-9]/.test(chr(num(0))) ? 1 : 0;
      case 'isalpha': return /[A-Za-z]/.test(chr(num(0))) ? 1 : 0;
      case 'isalnum': return /[A-Za-z0-9]/.test(chr(num(0))) ? 1 : 0;
      case 'isspace': return /[ \t\n\r\v\f]/.test(chr(num(0))) ? 1 : 0;
      case 'isupper': return /[A-Z]/.test(chr(num(0))) ? 1 : 0;
      case 'islower': return /[a-z]/.test(chr(num(0))) ? 1 : 0;
      case 'toupper': return /[a-z]/.test(chr(num(0))) ? num(0) - 32 : num(0);
      case 'tolower': return /[A-Z]/.test(chr(num(0))) ? num(0) + 32 : num(0);
      case 'sqrt': return Math.sqrt(num(0));
      case 'pow': return Math.pow(num(0), num(1));
      case 'fabs': return Math.abs(num(0));
      case 'floor': return Math.floor(num(0));
      case 'ceil': return Math.ceil(num(0));
    }
    throw new CError('runtime', `関数「${e.name}」はまだ使えません。`, L);
  }

  private scanf(a: Value[], e: Expr & { k: 'call' }, L: number): number {
    const fmt = this.str(a[0], L, 'scanf');
    let ai = 1, count = 0;
    const input = this.stdin;
    const skipWs = () => { while (this.inPos < input.length && /\s/.test(input[this.inPos])) this.inPos++; };
    for (let i = 0; i < fmt.length; i++) {
      const c = fmt[i];
      if (/\s/.test(c)) { skipWs(); continue; }
      if (c !== '%') {
        if (input[this.inPos] === c) { this.inPos++; continue; }
        return count;
      }
      let j = i + 1;
      let width = '';
      while (/\d/.test(fmt[j])) width += fmt[j++];
      let len = '';
      while ('hlz'.includes(fmt[j])) len += fmt[j++];
      const conv = fmt[j];
      i = j;
      if (conv === '%') { skipWs(); if (input[this.inPos] === '%') { this.inPos++; continue; } return count; }
      const target = a[ai];
      const targetTy = e.args[ai] ? decay(e.args[ai].ty!) : undefined;
      ai++;
      if (target === undefined) throw new CError('runtime', 'scanf の書式の % の数に対して、変数が足りません。', L);
      if (!isPtr(target) || !targetTy || targetTy.k !== 'ptr') {
        throw new CError('runtime', 'scanf には変数のアドレスを渡してください。「scanf("%d", &x);」のように & を付けます。', L, 0, 'bad-pointer');
      }
      const w = width ? parseInt(width, 10) : Infinity;
      if (conv !== 'c') skipWs();
      if (this.inPos >= input.length) {
        // 入力が尽きたら EOF を返す(C の決まり)。後のエラー文で「入力が足りないかも」と添えるために記録する
        this.inputRanOut = true;
        return count === 0 ? -1 : count;
      }
      if (conv === 'd' || conv === 'i' || conv === 'u' || conv === 'x') {
        const re = conv === 'x' ? /^[+-]?(0[xX])?[0-9a-fA-F]+/ : /^[+-]?\d+/;
        const m = input.slice(this.inPos, this.inPos + (w === Infinity ? 64 : w)).match(re);
        if (!m) return count;
        this.inPos += m[0].length;
        this.mem.store(target, targetTy.to, parseInt(m[0], conv === 'x' ? 16 : 10), L);
      } else if ('fFeEgG'.includes(conv)) {
        const m = input.slice(this.inPos).match(/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
        if (!m) return count;
        this.inPos += m[0].length;
        this.mem.store(target, targetTy.to, parseFloat(m[0]), L);
      } else if (conv === 's') {
        let s = '';
        while (this.inPos < input.length && !/\s/.test(input[this.inPos]) && s.length < w) s += input[this.inPos++];
        this.writeStr(target, s, L, 'scanf の %s');
      } else if (conv === 'c') {
        this.mem.store(target, T.char, input.charCodeAt(this.inPos++) & 0xff, L);
      } else {
        throw new CError('runtime', `scanf の「%${conv}」は、このサイトではまだ使えません。`, L);
      }
      count++;
    }
    return count;
  }
  inputRanOut = false;
}

function cmp(op: string, a: number, b: number): boolean {
  switch (op) {
    case '==': return a === b; case '!=': return a !== b; case '<': return a < b;
    case '>': return a > b; case '<=': return a <= b; default: return a >= b;
  }
}

function cmpStr(a: string, b: string): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = i < a.length ? a.charCodeAt(i) : 0, y = i < b.length ? b.charCodeAt(i) : 0;
    if (x !== y) return x - y;
  }
  return 0;
}

const chr = (n: number) => String.fromCharCode(n & 0xff);

/** 図で見せるときの要素の型。配列なら一番内側の要素、そうでなければ自分の型 */
function elemTy(t: CType): CType {
  let x = t;
  while (x.k === 'array') x = x.of;
  return x;
}

function describe(e: Expr): string {
  switch (e.k) {
    case 'id': return e.name;
    case 'index': return `${describe(e.a)}[...]`;
    case 'un': return `${e.op}${describe(e.e)}`;
    default: return '式';
  }
}

export { isInt, ptrTo };
