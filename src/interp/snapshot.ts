// 1 文ごとのメモリの様子を、図に描ける形に写し取る
import type { Sym } from './ast';
import type { Frame } from './interp';
import type { Block, Memory, Ptr } from './memory';
import { sizeOf, typeName, type CType } from './types';

export interface PtrView {
  /** 指す先のブロック。0 は NULL、負はどこも指していない */
  blockId: number;
  offset: number;
  /** 指す先が配列なら何番目の要素か */
  index?: number;
  dead?: boolean;
  outside?: boolean;
}

export interface CellView {
  text: string;
  init: boolean;
  ptr?: PtrView;
  /** 文字として読める値なら、その文字 */
  ch?: string;
}

export interface VarView {
  name: string;
  type: string;
  blockId: number;
  addr: string;
  isArray: boolean;
  cells: CellView[];
  /** 表示を省いた要素の数 */
  more: number;
}

export interface HeapView extends VarView {
  line: number;
  freed: boolean;
  freedLine?: number;
}

export interface FrameView { fn: string; vars: VarView[] }

export interface Snapshot {
  line: number;
  out: number;
  event?: string;
  error?: boolean;
  frames: FrameView[];
  globals: VarView[];
  heap: HeapView[];
}

const MAX_CELLS = 48;

export function snapshot(
  mem: Memory, frames: Frame[], globals: { sym: Sym; block: Block }[],
  line: number, out: number, event?: string, error?: boolean,
): Snapshot {
  const heap: HeapView[] = [];
  for (const b of mem.blocks.values()) {
    if (b.kind !== 'heap') continue;
    const ty = b.viewTy;
    const v = view(mem, b, b.name, ty ? { k: 'array', of: ty, len: Math.floor(b.size / sizeOf(ty)) } : undefined);
    heap.push({ ...v, line: b.line, freed: !b.alive, freedLine: b.deadLine });
  }
  return {
    line, out, event, error,
    frames: frames.map((f) => ({ fn: f.fn, vars: f.vars.map((x) => view(mem, x.block, x.sym.name, actualType(x.sym, x.block))) })),
    globals: globals.map((g) => view(mem, g.block, g.sym.name, g.sym.ty)),
    heap,
  };
}

function actualType(sym: Sym, b: Block): CType {
  // 可変長配列は、実際に確保した大きさで見せる
  if (sym.ty.k === 'array' && sym.ty.len === null) {
    return { k: 'array', of: sym.ty.of, len: Math.floor(b.size / sizeOf(sym.ty.of)) };
  }
  return sym.ty;
}

function view(mem: Memory, b: Block, name: string, ty: CType | undefined): VarView {
  const base: VarView = { name, type: ty ? typeName(ty) : `${b.size} バイト`, blockId: b.id, addr: '0x' + b.base.toString(16), isArray: false, cells: [], more: 0 };
  if (!ty) {
    // 型がまだ分からない malloc の領域は、バイトの数だけ見せる
    base.cells = [{ text: '?', init: false }];
    return base;
  }
  if (ty.k === 'array') {
    let inner: CType = ty.of;
    while (inner.k === 'array') inner = inner.of;
    const es = sizeOf(inner);
    const n = Math.floor(b.size / es);
    base.isArray = true;
    for (let i = 0; i < Math.min(n, MAX_CELLS); i++) base.cells.push(cell(mem, b, i * es, inner));
    base.more = Math.max(0, n - MAX_CELLS);
    return base;
  }
  base.cells = [cell(mem, b, 0, ty)];
  return base;
}

function cell(mem: Memory, b: Block, o: number, ty: CType): CellView {
  const size = sizeOf(ty);
  let init = true;
  for (let i = 0; i < size; i++) if (!b.init[o + i]) init = false;
  if (!init) return { text: '?', init: false };
  if (ty.k === 'ptr') {
    const p = b.ptrs.get(o);
    const raw = mem.readInt(b, o, 8, false);
    if (!p) return raw === 0 ? { text: 'NULL', init: true, ptr: { blockId: 0, offset: 0 } } : { text: '0x' + raw.toString(16), init: true, ptr: { blockId: -1, offset: raw } };
    return { text: '0x' + mem.addr(p).toString(16), init: true, ptr: ptrView(mem, p, ty.to) };
  }
  if (ty.k === 'double') {
    const v = new DataView(b.bytes.buffer).getFloat64(o, true);
    return { text: Number.isInteger(v) ? v.toFixed(1) : String(+v.toPrecision(8)), init: true };
  }
  if (ty.k === 'int') {
    const v = mem.readInt(b, o, ty.size, ty.unsigned);
    const c: CellView = { text: String(v), init: true };
    if (ty.size === 1 && !ty.bool) {
      if (v === 0) c.ch = '\\0';
      else if (v === 10) c.ch = '\\n';
      else if (v >= 32 && v < 127) c.ch = String.fromCharCode(v);
    }
    return c;
  }
  return { text: '?', init: false };
}

function ptrView(mem: Memory, p: Ptr, to: CType): PtrView {
  if (p.b <= 0) return { blockId: p.b, offset: p.o };
  const tb = mem.blocks.get(p.b)!;
  const es = to.k === 'void' ? 1 : sizeOf(to.k === 'array' ? to.of : to);
  return {
    blockId: p.b, offset: p.o,
    index: es > 0 ? Math.floor(p.o / es) : undefined,
    dead: !tb.alive,
    outside: p.o < 0 || p.o >= tb.size,
  };
}
