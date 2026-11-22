// Pyodide 試作ページ。本番の画面に組み込むまでの確認用
import { PyRunner } from '../py/runner';
import type { PyRunResult } from '../py/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $('status'), out = $('out'), snap = $('snap'), stepLabel = $('stepLabel');
const code = $<HTMLTextAreaElement>('code'), slider = $<HTMLInputElement>('step');

const runner = new PyRunner((s, d) => {
  status.textContent = s === 'ready' ? `準備完了(読み込み ${runner.loadMs} ms)` : s === 'loading' ? '読み込み中…' : `失敗: ${d}`;
});
let last: PyRunResult | null = null;

// 試験から結果を読めるようにしておく
declare global { interface Window { __last?: PyRunResult; __runner?: PyRunner } }
window.__runner = runner;

async function go(src: string, timeoutMs = 5000) {
  out.textContent = '実行中…';
  const t = performance.now();
  last = await runner.run(src, {}, timeoutMs);
  window.__last = last;
  const ms = Math.round(performance.now() - t);
  const err = last.error ? `\n[${last.status}] ${last.error.type}: ${last.error.message}${last.error.line ? `(${last.error.line} 行目)` : ''}` : '';
  out.textContent = `${last.stdout}${err}\n— ${last.status}, ${last.steps} ステップ, ${ms} ms`;
  slider.max = String(Math.max(0, last.trace.length - 1));
  slider.value = '0';
  show();
}

function show() {
  if (!last || last.trace.length === 0) { snap.textContent = ''; stepLabel.textContent = ''; return; }
  const s = last.trace[Number(slider.value)];
  stepLabel.textContent = `${Number(slider.value) + 1} / ${last.trace.length}(${s.event} ${s.line} 行目)`;
  const fmt = (id: string): string => {
    const e = s.heap[id];
    if (!e) return '?';
    if (e.repr !== undefined) return e.repr;
    if (e.items) return `${e.type}#${id.slice(-4)}[${e.items.map(fmt).join(', ')}]`;
    if (e.pairs) return `dict#${id.slice(-4)}{${e.pairs.map(([k, v]) => `${fmt(k)}: ${fmt(v)}`).join(', ')}}`;
    return e.type;
  };
  snap.textContent = s.frames
    .map((f) => `${f.name}(${f.line} 行目)\n` + f.locals.map(([n, id]) => `  ${n} → ${fmt(id)}`).join('\n'))
    .join('\n');
}

slider.oninput = show;
$('run').onclick = () => go(code.value);
$('stop').onclick = () => runner.stop();
$('loop').onclick = () => go('i = 0\nwhile True:\n    i += 1\n');
// ステップ上限が効かない処理(1 行の中で長く回る)。Worker を捨てて止める経路の確認用
$('heavy').onclick = () => go('x = sum(range(10**12))\nprint(x)\n', 3000);
