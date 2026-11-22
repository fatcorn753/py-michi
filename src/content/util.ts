// 教材を書くための小さな道具。コードは String.raw で書き、\n をそのまま C の文字列に残す

/** 先頭の空行と共通の字下げを取り除く */
export function src(s: string): string {
  const lines = s.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(ind)).join('\n') + '\n';
}

/** main の中身だけを書くと、#include と main の枠を付ける。本文の 1 行目はファイルの (ヘッダー数 + 3) 行目になる */
export function C(body: string, inc: string[] = ['stdio.h']): string {
  const b = src(body).replace(/\n$/, '').split('\n').map((l) => (l ? '    ' + l : l)).join('\n');
  return `${inc.map((h) => `#include <${h}>`).join('\n')}\n\nint main(void) {\n${b}\n    return 0;\n}\n`;
}

export const r = String.raw;
