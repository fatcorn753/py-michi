// 学習者のコードは Web Worker で動かす。重い処理でも画面が固まらず、止めるボタンで確実に止められる
import { run, type RunOptions } from './interp';

self.onmessage = (ev: MessageEvent<{ code: string; opts: RunOptions }>) => {
  const { code, opts } = ev.data;
  self.postMessage(run(code, opts));
};
