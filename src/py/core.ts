// Pyodide で学習者のコードを動かす中心部分。Worker からも Node のテストからも使えるよう、
// 読み込み方(CDN かローカルか)には触れず、読み込み済みの pyodide を受け取る。
import type { PyodideAPI } from 'pyodide';
import { TRACER_PY } from './tracer';
import type { PyRunOptions, PyRunResult } from './types';

export const DEFAULTS = { maxSteps: 100_000, maxTrace: 2_000 } as const;

/** トレーサーを読み込む。pyodide を読み込んだ直後に 1 回だけ呼ぶ */
export function installTracer(py: PyodideAPI) {
  py.runPython(TRACER_PY, { globals: py.globals });
}

export function runPython(py: PyodideAPI, code: string, opts: PyRunOptions = {}): PyRunResult {
  // batched は改行まで溜めるので、print(..., end="") の途中経過が測れない。write で受ける
  let stdout = '';
  const dec = new TextDecoder();
  const write = (buf: Uint8Array) => { stdout += dec.decode(buf, { stream: true }); return buf.length; };
  py.setStdout({ write });
  py.setStderr({ write });

  // input() には、あらかじめ渡された行を順に返す。足りなければ EOF にする
  const lines = (opts.stdin ?? '').split('\n');
  if (opts.stdin === undefined || opts.stdin === '') lines.length = 0;
  let i = 0;
  py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : undefined), autoEOF: true });

  const entry = py.globals.get('run_entry');
  try {
    const json: string = entry(
      code,
      opts.maxSteps ?? DEFAULTS.maxSteps,
      opts.maxTrace ?? DEFAULTS.maxTrace,
      () => stdout.length,
    );
    const st = JSON.parse(json);
    return {
      status: st.status, error: st.error, steps: st.steps,
      trace: st.trace, traceTruncated: st.traceTruncated, stdout,
    };
  } finally {
    entry.destroy();
  }
}
