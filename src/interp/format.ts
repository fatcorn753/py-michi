// printf の書式を C と同じ規則で文字列にする
import { CError } from './errors';
import { isPtr, type Ptr, type Value } from './memory';
import type { CType } from './types';

interface Helpers {
  str: (p: Ptr) => string;
  addr: (p: Ptr) => number;
}

export function formatPrintf(fmt: string, args: Value[], tys: CType[], h: Helpers, line: number): string {
  let out = '';
  let ai = 0;
  const re = /%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?(hh|h|ll|l|z)?([diouxXcsfFeEgGp%])/g;
  let last = 0;
  for (let m = re.exec(fmt); m; m = re.exec(fmt)) {
    out += fmt.slice(last, m.index);
    last = re.lastIndex;
    const [, flags, w, prec, , conv] = m;
    if (conv === '%') { out += '%'; continue; }
    const width = w === '*' ? Number(args[ai++]) : w ? parseInt(w, 10) : 0;
    const precision = prec === undefined ? undefined : prec === '*' ? Number(args[ai++]) : parseInt(prec || '0', 10);
    if (ai >= args.length) {
      throw new CError('runtime', `printf の書式に「%${conv}」がありますが、表示する値が渡されていません。`, line, 0, 'other');
    }
    const v = args[ai];
    const ty = tys[ai];
    ai++;
    let s: string;
    const asNum = (): number => (isPtr(v) ? h.addr(v) : v);
    switch (conv) {
      case 'd': case 'i': {
        let n = asNum();
        if (ty?.k === 'double') n = Math.trunc(n); // 型の不一致は警告済み。値は整数にして見せる
        s = Math.abs(n).toString();
        if (precision !== undefined) s = s.padStart(precision, '0');
        s = (n < 0 ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '') + s;
        break;
      }
      case 'u': s = toUnsigned(asNum(), ty).toString(); break;
      case 'x': case 'X': case 'o': {
        const base = conv === 'o' ? 8 : 16;
        s = toUnsigned(asNum(), ty).toString(base);
        if (conv === 'X') s = s.toUpperCase();
        if (precision !== undefined) s = s.padStart(precision, '0');
        if (flags.includes('#') && s !== '0') s = (conv === 'o' ? '0' : conv === 'x' ? '0x' : '0X') + s;
        break;
      }
      case 'c': s = String.fromCharCode(asNum() & 0xff); break;
      case 's': {
        if (!isPtr(v)) throw new CError('runtime', '%s には文字列を渡してください。整数や文字(char)を渡すと、プログラムが落ちます。1 文字なら %c を使います。', line, 0, 'bad-pointer');
        s = h.str(v);
        if (precision !== undefined) s = s.slice(0, precision);
        break;
      }
      case 'p': s = isPtr(v) && v.b === 0 ? '(nil)' : '0x' + asNum().toString(16); break;
      default: {
        const n = asNum();
        const p = precision ?? 6;
        if (!Number.isFinite(n)) s = Number.isNaN(n) ? 'nan' : n > 0 ? 'inf' : '-inf';
        else if (conv === 'f' || conv === 'F') s = n.toFixed(p);
        else if (conv === 'e' || conv === 'E') s = expo(n, p);
        else s = gfmt(n, p, flags.includes('#'));
        if (conv === 'E' || conv === 'G') s = s.toUpperCase();
        if (n >= 0 && flags.includes('+')) s = '+' + s;
        else if (n >= 0 && flags.includes(' ')) s = ' ' + s;
      }
    }
    if (s.length < width) {
      if (flags.includes('-')) s = s.padEnd(width, ' ');
      else if (flags.includes('0') && 'diouxXfFeEgG'.includes(conv) && !(precision !== undefined && 'diouxX'.includes(conv))) {
        const sign = /^[+\- ]/.test(s) ? s[0] : '';
        s = sign + s.slice(sign.length).padStart(width - sign.length, '0');
      } else s = s.padStart(width, ' ');
    }
    out += s;
  }
  out += fmt.slice(last);
  return out;
}

function toUnsigned(n: number, ty?: CType): number {
  if (n >= 0) return n;
  const size = ty?.k === 'int' ? ty.size : 4;
  return size === 8 ? Number(BigInt.asUintN(64, BigInt(n))) : n + 2 ** (size * 8);
}

function expo(n: number, p: number): string {
  const s = n.toExponential(p);
  // C は指数を 2 桁以上で書く(1e+5 ではなく 1e+05)
  return s.replace(/e([+-])(\d)$/, 'e$10$2');
}

function gfmt(n: number, p: number, keepZeros: boolean): string {
  const P = p === 0 ? 1 : p;
  if (n === 0) return '0';
  const x = Math.floor(Math.log10(Math.abs(n)));
  let s: string;
  if (x < -4 || x >= P) {
    s = expo(n, P - 1);
    if (!keepZeros) s = s.replace(/\.?0+e/, 'e');
  } else {
    s = n.toFixed(Math.max(0, P - 1 - x));
    if (!keepZeros && s.includes('.')) s = s.replace(/\.?0+$/, '');
  }
  return s;
}
