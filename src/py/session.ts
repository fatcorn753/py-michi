// サイト全体で 1 つだけ Python の実行環境を持つ。最初に使う画面が開いたときに読み込みを始める
import { useSyncExternalStore } from 'react';
import { PyRunner } from './runner';
import type { PyRunOptions, PyRunResult } from './types';

export type PyLoadState = { state: 'idle' | 'loading' | 'ready' | 'error'; detail?: string };

let runner: PyRunner | null = null;
let load: PyLoadState = { state: 'idle' };
const subs = new Set<() => void>();

function getRunner(): PyRunner {
  if (!runner) {
    runner = new PyRunner((s, detail) => {
      load = { state: s, detail };
      subs.forEach((f) => f());
    });
  }
  return runner;
}

/** 読み込みを先に始めておく(画面を開いた時点で呼ぶ) */
export function warmUp() { getRunner(); }

export function runPy(code: string, opts: PyRunOptions = {}, timeoutMs?: number): Promise<PyRunResult> {
  return getRunner().run(code, opts, timeoutMs);
}

export function stopPy() { runner?.stop(); }

export function usePyLoad(): PyLoadState {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => load,
  );
}
