// 型の表現と、型どうしの計算
export type CType =
  | { k: 'int'; size: 1 | 2 | 4 | 8; unsigned: boolean; bool?: boolean }
  | { k: 'double'; size: 8 }
  | { k: 'void' }
  | { k: 'ptr'; to: CType }
  | { k: 'array'; of: CType; len: number | null }
  | { k: 'func'; ret: CType; params: CType[]; variadic: boolean };

export const T = {
  char: { k: 'int', size: 1, unsigned: false } as CType,
  uchar: { k: 'int', size: 1, unsigned: true } as CType,
  short: { k: 'int', size: 2, unsigned: false } as CType,
  int: { k: 'int', size: 4, unsigned: false } as CType,
  uint: { k: 'int', size: 4, unsigned: true } as CType,
  long: { k: 'int', size: 8, unsigned: false } as CType,
  ulong: { k: 'int', size: 8, unsigned: true } as CType,
  bool: { k: 'int', size: 1, unsigned: true, bool: true } as CType,
  double: { k: 'double', size: 8 } as CType,
  void: { k: 'void' } as CType,
};

export const ptrTo = (t: CType): CType => ({ k: 'ptr', to: t });

export function sizeOf(t: CType): number {
  switch (t.k) {
    case 'int': return t.size;
    case 'double': return 8;
    case 'ptr': return 8;
    case 'array': return t.len === null ? 0 : t.len * sizeOf(t.of);
    case 'void': return 1;
    case 'func': return 8;
  }
}

export const isInt = (t: CType) => t.k === 'int';
export const isArith = (t: CType) => t.k === 'int' || t.k === 'double';
export const isPtrLike = (t: CType) => t.k === 'ptr' || t.k === 'array';
export const isScalar = (t: CType) => isArith(t) || t.k === 'ptr';

/** 配列は式の中ではポインタとして振る舞う */
export function decay(t: CType): CType {
  if (t.k === 'array') return ptrTo(t.of);
  if (t.k === 'func') return ptrTo(t);
  return t;
}

export function typeName(t: CType): string {
  switch (t.k) {
    case 'int':
      if (t.bool) return 'bool';
      return (t.unsigned ? 'unsigned ' : '') + ({ 1: 'char', 2: 'short', 4: 'int', 8: 'long' } as const)[t.size];
    case 'double': return 'double';
    case 'void': return 'void';
    case 'ptr': return t.to.k === 'func' ? '関数ポインタ' : `${typeName(t.to)} *`;
    case 'array': return `${typeName(t.of)}[${t.len ?? ''}]`;
    case 'func': return `${typeName(t.ret)}(${t.params.map(typeName).join(', ')})`;
  }
}

/** 算術変換。int より小さい整数は int に上げ、片方が double なら double */
export function arithResult(a: CType, b: CType): CType {
  if (a.k === 'double' || b.k === 'double') return T.double;
  const sa = a.k === 'int' ? Math.max(a.size, 4) : 4;
  const sb = b.k === 'int' ? Math.max(b.size, 4) : 4;
  const size = Math.max(sa, sb) as 4 | 8;
  const unsigned = (a.k === 'int' && a.unsigned && a.size >= size && !a.bool) || (b.k === 'int' && b.unsigned && b.size >= size && !b.bool);
  return { k: 'int', size, unsigned };
}

export function promote(t: CType): CType {
  if (t.k === 'int' && t.size < 4) return T.int;
  return t;
}

export function sameType(a: CType, b: CType): boolean {
  if (a.k !== b.k) return false;
  if (a.k === 'int' && b.k === 'int') return a.size === b.size && a.unsigned === b.unsigned;
  if (a.k === 'ptr' && b.k === 'ptr') return sameType(a.to, b.to);
  if (a.k === 'array' && b.k === 'array') return sameType(a.of, b.of) && a.len === b.len;
  return true;
}

/** 整数を型の幅に切り詰める(2 の補数で折り返す) */
export function wrapInt(v: number, t: CType): number {
  if (t.k !== 'int') return v;
  if (t.bool) return v ? 1 : 0;
  if (!Number.isFinite(v)) return 0;
  v = Math.trunc(v);
  if (t.size === 8) {
    // 8 バイト整数は JS の数で扱える範囲(±2^53)だけを正確に扱う
    if (t.unsigned && v < 0) return Number(BigInt.asUintN(64, BigInt(v)));
    return v;
  }
  const bits = t.size * 8;
  const mod = 2 ** bits;
  let r = ((v % mod) + mod) % mod;
  if (!t.unsigned && r >= mod / 2) r -= mod;
  return r;
}

export function intRange(t: CType): [number, number] {
  if (t.k !== 'int') return [-Infinity, Infinity];
  if (t.size === 8) return t.unsigned ? [0, Number.MAX_SAFE_INTEGER] : [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  const bits = t.size * 8;
  return t.unsigned ? [0, 2 ** bits - 1] : [-(2 ** (bits - 1)), 2 ** (bits - 1) - 1];
}
