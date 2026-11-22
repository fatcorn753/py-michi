// C の char は 1 バイト。インタプリタの中では文字列を「1 文字 = 1 バイト(0〜255)」の JS 文字列で持ち、
// 入口(文字列リテラル・入力)で UTF-8 に変え、出口(出力・表示)で戻す。日本語も本物の C と同じバイト数になる

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBytes(s: string): string {
  let out = '';
  for (const b of enc.encode(s)) out += String.fromCharCode(b);
  return out;
}

export function fromBytes(s: string): string {
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
  return dec.decode(a);
}

/** 先頭 n バイトを戻したときの長さ(文字の途中で切れる所は、その文字を含めない) */
export function decodedLength(bytes: string, n: number): number {
  return fromBytes(trimPartial(bytes.slice(0, n))).length;
}

function trimPartial(s: string): string {
  // 末尾の、まだ揃っていない UTF-8 の並びを落とす
  let i = s.length - 1, k = 0;
  while (i >= 0 && k < 3 && (s.charCodeAt(i) & 0xc0) === 0x80) { i--; k++; }
  if (i < 0) return s;
  const lead = s.charCodeAt(i);
  const need = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 1;
  return s.length - i < need ? s.slice(0, i) : s;
}
