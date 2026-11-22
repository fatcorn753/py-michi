// 画面側から Python を動かす窓口。
// 無限ループは 2 段で止める:
//   1. Python 側でステップ数の上限を超えたら StepLimit を投げる(Worker は生かしたまま)
//   2. それでも返ってこない(C で書かれた重い処理など)か、止めるボタンが押されたら、
//      Worker を terminate して作り直す。GitHub Pages では COOP/COEP を付けられず
//      SharedArrayBuffer の割り込みが使えないため、この方法にしている。
import type { FromWorker, ToWorker } from './worker';
import type { PyRunOptions, PyRunResult } from './types';

const empty = (status: PyRunResult['status'], message: string): PyRunResult => ({
  status, steps: 0, trace: [], traceTruncated: false, stdout: '',
  error: { type: status === 'timeout' ? 'Timeout' : 'Stopped', message, line: null },
});

export class PyRunner {
  private worker!: Worker;
  private ready!: Promise<void>;
  private nextId = 1;
  private pending: { id: number; resolve: (r: PyRunResult) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  /** 読み込みにかかった時間(ms)。試作での計測用 */
  loadMs: number | null = null;

  constructor(private onStatus: (s: 'loading' | 'ready' | 'error', detail?: string) => void = () => {}) {
    this.spawn();
  }

  private spawn() {
    this.onStatus('loading');
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker = w;
    this.ready = new Promise((resolve, reject) => {
      w.onmessage = (ev: MessageEvent<FromWorker>) => {
        const m = ev.data;
        if (m.type === 'ready') { this.loadMs = m.ms; this.onStatus('ready'); resolve(); }
        else if (m.type === 'load-error') { this.onStatus('error', m.message); reject(new Error(m.message)); }
        else if (m.type === 'result' && this.pending?.id === m.id) {
          const p = this.pending; this.pending = null;
          clearTimeout(p.timer);
          p.resolve(m.result);
        }
      };
    });
    this.ready.catch(() => {}); // 読み込み失敗は onStatus で知らせる
  }

  /** 実行の順番待ち。採点と例題の実行が同時に来ても、互いに止め合わないよう 1 つずつ流す */
  private chain: Promise<unknown> = Promise.resolve();

  run(code: string, opts: PyRunOptions = {}, timeoutMs = 5000): Promise<PyRunResult> {
    const job = this.chain.then(() => this.runOne(code, opts, timeoutMs));
    this.chain = job.catch(() => {});
    return job;
  }

  private async runOne(code: string, opts: PyRunOptions, timeoutMs: number): Promise<PyRunResult> {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.kill(empty('timeout', `${timeoutMs / 1000} 秒たっても終わらなかったので止めました。無限ループになっていないか確かめてください。`));
      }, timeoutMs);
      this.pending = { id, resolve, timer };
      const msg: ToWorker = { type: 'run', id, code, opts };
      this.worker.postMessage(msg);
    });
  }

  /** 実行中なら Worker ごと止め、待っている側には「止めました」を返す */
  stop() {
    if (this.pending) this.kill(empty('stopped', '実行を止めました。'));
  }

  private kill(result: PyRunResult) {
    const p = this.pending; this.pending = null;
    if (p) clearTimeout(p.timer);
    this.worker.terminate();
    this.spawn(); // 次の実行に備えてすぐ作り直す。2 回目からはブラウザのキャッシュで速い
    p?.resolve(result);
  }
}
