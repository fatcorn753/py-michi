import type { RunOptions, RunResult } from './interp';

let current: Worker | null = null;
let settle: ((r: RunResult) => void) | null = null;

const stopped = (message: string): RunResult => ({
  ok: false, stdout: '', exitCode: null, warnings: [], leaks: [], steps: 0, trace: [],
  error: { kind: 'limit', message, line: 0, col: 0, code: 'step-limit' },
});

/** Worker で実行する。timeoutMs を過ぎたら Worker ごと止める */
export function runAsync(code: string, opts: RunOptions = {}, timeoutMs = 8000): Promise<RunResult> {
  stopRun();
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  current = w;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      stopRun(`${timeoutMs / 1000} 秒たっても終わらなかったので止めました。無限ループになっていないか確かめてください。`);
    }, timeoutMs);
    settle = (r) => { clearTimeout(timer); resolve(r); };
    w.onmessage = (ev: MessageEvent<RunResult>) => {
      w.terminate();
      if (current === w) current = null;
      const f = settle; settle = null;
      f?.(ev.data);
    };
    w.postMessage({ code, opts });
  });
}

/** 実行中のものを止める。待っている側には「止めました」という結果を返す */
export function stopRun(message = '実行を止めました。') {
  current?.terminate();
  current = null;
  const f = settle; settle = null;
  f?.(stopped(message));
}
