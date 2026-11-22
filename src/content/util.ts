// 教材を書くための小さな道具。コードは String.raw で書き、\n をそのまま Python の文字列に残す

/** 先頭の空行と共通の字下げを取り除く */
export function src(s: string): string {
  const lines = s.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(ind)).join('\n') + '\n';
}

export const r = String.raw;

/** 箇条書きなどの本文を行ごとに書く */
export const L = (...s: string[]) => s.join('\n');
