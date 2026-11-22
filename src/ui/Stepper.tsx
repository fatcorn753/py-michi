import { useCallback, useEffect, useState } from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { RunResult } from '../interp/interp';
import { CodeView } from './CodeEditor';
import { MemoryView } from './MemoryView';
import { ErrorNotice } from './RunPanel';

interface Props {
  code: string;
  result: RunResult;
  /** 予測してから見るモードで始める */
  predictFirst?: boolean;
}

/** 1 行ずつ進めたり戻したりしながら、メモリの様子を見る */
export function Stepper({ code, result, predictFirst = false }: Props) {
  const trace = result.trace;
  const [i, setI] = useState(0);
  const [predict, setPredict] = useState(predictFirst);
  const [revealed, setRevealed] = useState(true);
  const last = Math.max(0, trace.length - 1);

  useEffect(() => { setI(0); setRevealed(true); }, [result]);

  const go = useCallback((n: number) => {
    const to = Math.max(0, Math.min(last, n));
    // 予測モードでは、1 つ進めるとき変わった値を隠し、もう一度押すと見せる
    if (predict && to === i + 1 && revealed) { setI(to); setRevealed(false); return; }
    if (predict && !revealed && to === i + 1) { setRevealed(true); return; }
    setRevealed(true);
    setI(to);
  }, [last, predict, revealed, i]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  };

  if (trace.length === 0) return null;
  const s = trace[i];
  const isLast = i === last;
  const err = isLast && result.error && result.error.kind !== 'compile' ? result.error : undefined;

  return (
    <div className="stack" onKeyDown={onKey}>
      <div className="step-controls" role="group" aria-label="ステップ実行">
        <button className="td-btn" data-icon-only type="button" aria-label="最初へ" onClick={() => go(0)} disabled={i === 0}><ChevronFirst className="icon" strokeWidth={1.75} aria-hidden /></button>
        <button className="td-btn" data-icon-only type="button" aria-label="1 つ戻る(←)" onClick={() => go(i - 1)} disabled={i === 0}><ChevronLeft className="icon" strokeWidth={1.75} aria-hidden /></button>
        <button className="td-btn" type="button" onClick={() => go(i + 1)} disabled={isLast && revealed}>
          {predict && !revealed ? <><Eye className="icon-sm" strokeWidth={1.75} aria-hidden />答えを見る</> : <>次へ<ChevronRight className="icon-sm" strokeWidth={1.75} aria-hidden /></>}
        </button>
        <button className="td-btn" data-icon-only type="button" aria-label="最後へ" onClick={() => go(last)} disabled={isLast}><ChevronLast className="icon" strokeWidth={1.75} aria-hidden /></button>
        <input type="range" min={0} max={last} value={i} onChange={(e) => { setRevealed(true); setI(+e.target.value); }} aria-label="何歩目かを選ぶ" />
        <span className="step-count" aria-live="polite">{i + 1} / {trace.length}</span>
        <label className="td-check">
          <span>予測してから見る</span>
          <input className="td-switch" type="checkbox" role="switch" checked={predict} onChange={(e) => { setPredict(e.target.checked); setRevealed(true); }} />
        </label>
      </div>
      {predict && !revealed && <p className="small muted" role="status">→ の行を実行すると、どの値がどう変わるか予想してから「答えを見る」を押してください。</p>}
      <div className="stepper">
        <div className="stack">
          <CodeView code={code} current={s.line} errorLine={err?.line} />
          <div>
            <p className="label-sm">ここまでの出力</p>
            <pre className="output">{result.stdout.slice(0, s.out)}</pre>
          </div>
          {s.event && <p className="step-event">{s.event}</p>}
        </div>
        <div className="stack">
          <p className="small muted">{isLast ? '実行が終わった時点' : '→ の行を実行する前'}のメモリです。点線の箱は、まだ値を入れていない変数です。</p>
          <MemoryView snap={s} prev={i > 0 ? trace[i - 1] : undefined} hideChanges={predict && !revealed} bad={err?.detail} />
          {err && <ErrorNotice error={err} />}
        </div>
      </div>
    </div>
  );
}
