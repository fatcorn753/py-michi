// C サブセットの字句解析。プリプロセッサは #include の確認と、単純な #define 定数だけを扱う。
import { CError } from './errors';
import { toBytes } from './bytes';

export type TokKind = 'num' | 'float' | 'char' | 'str' | 'id' | 'kw' | 'op' | 'eof';
export interface Token {
  kind: TokKind;
  text: string;
  value?: number | string;
  line: number;
  col: number;
}

export const KEYWORDS = new Set([
  'int', 'char', 'long', 'short', 'double', 'float', 'void', 'unsigned', 'signed', 'const',
  'if', 'else', 'while', 'for', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default',
  'sizeof', 'static', 'size_t', 'bool', '_Bool', 'struct', 'typedef', 'goto',
]);

// このサイトで使える標準ヘッダー。ほかのヘッダーは分かりやすいエラーにする
export const KNOWN_HEADERS = new Set([
  'stdio.h', 'stdlib.h', 'string.h', 'ctype.h', 'math.h', 'stdbool.h', 'limits.h', 'stddef.h',
]);

const OPS = [
  '<<=', '>>=', '...', '->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
  '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '|', '^', '?', ':', ';', ',', '.',
  '(', ')', '[', ']', '{', '}',
];

const ESC: Record<string, number> = { n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11 };

export function lex(src: string): Token[] {
  const toks: Token[] = [];
  const defines = new Map<string, Token[]>();
  let i = 0, line = 1, col = 1;
  let atLineStart = true;

  const adv = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === '\n') { line++; col = 1; atLineStart = true; } else col++;
      i++;
    }
  };

  const readEscape = (): number => {
    // 呼び出し時点で src[i] は '\\'
    adv();
    const c = src[i];
    if (c === 'x') {
      adv();
      let h = '';
      while (/[0-9a-fA-F]/.test(src[i] ?? '')) { h += src[i]; adv(); }
      return parseInt(h || '0', 16);
    }
    if (c in ESC) { adv(); return ESC[c]; }
    throw new CError('compile', `「\\${c}」というエスケープ文字はありません。`, line, col);
  };

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { adv(); continue; }
    if (c === ' ' || c === '\t' || c === '\r') { adv(); continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') adv(); continue; }
    if (c === '/' && src[i + 1] === '*') {
      const sl = line, sc = col;
      adv(2);
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) adv();
      if (i >= src.length) throw new CError('compile', 'コメント「/*」が閉じられていません。「*/」を書いてください。', sl, sc);
      adv(2);
      continue;
    }
    if (c === '#' && atLineStart) {
      const sl = line;
      let text = '';
      while (i < src.length && src[i] !== '\n') { text += src[i]; adv(); }
      const inc = text.match(/^#\s*include\s*[<"]([^>"]+)[>"]/);
      if (inc) {
        if (!KNOWN_HEADERS.has(inc[1])) {
          throw new CError('compile', `ヘッダー「${inc[1]}」はこのサイトでは使えません。使えるのは ${[...KNOWN_HEADERS].join(', ')} です。`, sl, 1);
        }
        continue;
      }
      const def = text.match(/^#\s*define\s+([A-Za-z_]\w*)\s+(.+)$/);
      if (def) {
        const body = lex(def[2]).filter((t) => t.kind !== 'eof').map((t) => ({ ...t, line: sl }));
        defines.set(def[1], body);
        continue;
      }
      throw new CError('compile', `「${text.trim()}」は、このサイトでは使えないプリプロセッサ命令です。#include と単純な #define だけ使えます。`, sl, 1);
    }
    atLineStart = false;
    const sl = line, sc = col;

    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let s = '';
      if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        s = '0x'; adv(2);
        while (/[0-9a-fA-F]/.test(src[i] ?? '')) { s += src[i]; adv(); }
        while (/[uUlL]/.test(src[i] ?? '')) adv();
        toks.push({ kind: 'num', text: s, value: parseInt(s, 16), line: sl, col: sc });
        continue;
      }
      let isFloat = false;
      while (/[0-9.eE]/.test(src[i] ?? '') || ((src[i] === '-' || src[i] === '+') && /[eE]/.test(src[i - 1]))) {
        if (/[.eE]/.test(src[i])) isFloat = true;
        s += src[i]; adv();
      }
      if (/[fF]/.test(src[i] ?? '')) { isFloat = true; adv(); }
      while (/[uUlL]/.test(src[i] ?? '')) adv();
      toks.push({ kind: isFloat ? 'float' : 'num', text: s, value: isFloat ? parseFloat(s) : parseInt(s, 10), line: sl, col: sc });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let s = '';
      while (/[A-Za-z0-9_]/.test(src[i] ?? '')) { s += src[i]; adv(); }
      const d = defines.get(s);
      if (d) { for (const t of d) toks.push({ ...t, line: sl, col: sc }); continue; }
      toks.push({ kind: KEYWORDS.has(s) ? 'kw' : 'id', text: s, line: sl, col: sc });
      continue;
    }
    if (c === "'") {
      adv();
      let v: number;
      if (src[i] === '\\') v = readEscape();
      else { v = src.charCodeAt(i); adv(); }
      if (src[i] !== "'") throw new CError('compile', "文字定数は「'a'」のように 1 文字だけを ' で囲んでください。", sl, sc);
      adv();
      toks.push({ kind: 'char', text: String.fromCharCode(v), value: v, line: sl, col: sc });
      continue;
    }
    if (c === '"') {
      adv();
      let s = '';
      while (src[i] !== '"') {
        if (i >= src.length || src[i] === '\n') throw new CError('compile', '文字列が閉じられていません。行の終わりまでに「"」を書いてください。', sl, sc);
        if (src[i] === '\\') s += String.fromCharCode(readEscape());
        else { s += src[i]; adv(); }
      }
      adv();
      // 隣り合う文字列リテラルは連結する
      const prev = toks[toks.length - 1];
      if (prev && prev.kind === 'str') { prev.value = (prev.value as string) + s; prev.text += s; continue; }
      toks.push({ kind: 'str', text: s, value: toBytes(s), line: sl, col: sc });
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) {
      const shown = c.charCodeAt(0) > 0x7f ? `全角文字「${c}」` : `「${c}」`;
      throw new CError('compile', `${shown}は C のコードには書けません。${c.charCodeAt(0) > 0x7f ? '全角の空白や記号が混ざっていないか確かめてください。' : ''}`, sl, sc);
    }
    adv(op.length);
    toks.push({ kind: 'op', text: op, line: sl, col: sc });
  }
  toks.push({ kind: 'eof', text: '(ファイルの終わり)', line, col });
  return toks;
}
