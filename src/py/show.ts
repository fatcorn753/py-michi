// 記録したオブジェクトを、Python の repr に近い文字列にする(トレース表の正解などに使う)
import type { Step } from './types';

export function showValue(step: Step, id: string, depth = 0): string {
  const e = step.heap[id];
  if (!e) return '?';
  if (depth > 4) return '...';
  const sub = (x: string) => showValue(step, x, depth + 1);
  const more = e.truncated ? ', ...' : '';
  if (e.items) {
    const inner = e.items.map(sub).join(', ') + more;
    if (e.type === 'list') return `[${inner}]`;
    if (e.type === 'tuple') return e.items.length === 1 ? `(${inner},)` : `(${inner})`;
    return e.items.length ? `{${inner}}` : 'set()';
  }
  if (e.pairs) return `{${e.pairs.map(([k, v]) => `${sub(k)}: ${sub(v)}`).join(', ')}${more}}`;
  if (e.repr !== undefined) return e.repr;
  return `<${e.type}>`;
}

/** フレームの中の名前を探し、その値を文字列にする。なければ undefined */
export function lookup(step: Step, name: string): string | undefined {
  const top = step.frames[step.frames.length - 1];
  const hit = top?.locals.find(([n]) => n === name) ?? step.frames[0]?.locals.find(([n]) => n === name);
  return hit ? showValue(step, hit[1]) : undefined;
}
