// 学習者の Python は Web Worker で動かす。画面が固まらず、止めるときは Worker ごと捨てられる
import type { PyodideAPI } from 'pyodide';
import { installTracer, runPython } from './core';
import type { PyRunOptions } from './types';

// 本体(約 10MB)はサイトに同梱せず CDN から読む。版は package.json の pyodide と合わせる
export const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

export type ToWorker = { type: 'run'; id: number; code: string; opts: PyRunOptions };
export type FromWorker =
  | { type: 'ready'; ms: number }
  | { type: 'load-error'; message: string }
  | { type: 'result'; id: number; result: ReturnType<typeof runPython> };

const post = (m: FromWorker) => self.postMessage(m);

const t0 = performance.now();
const ready: Promise<PyodideAPI> = (async () => {
  const mod = await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`);
  const py: PyodideAPI = await mod.loadPyodide({ indexURL: PYODIDE_URL });
  installTracer(py);
  return py;
})();

ready.then(
  () => post({ type: 'ready', ms: Math.round(performance.now() - t0) }),
  (e) => post({ type: 'load-error', message: String(e?.message ?? e) }),
);

self.onmessage = async (ev: MessageEvent<ToWorker>) => {
  const m = ev.data;
  if (m.type !== 'run') return;
  const py = await ready;
  post({ type: 'result', id: m.id, result: runPython(py, m.code, m.opts) });
};
