import { useCallback, useEffect, useState } from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { PyRunResult, Step } from '../../py/types';
import { CodeView } from '../CodeEditor';
import { ObjectView } from './ObjectView';
import { PyErrorNotice } from './PyRunPanel';

interface Props {
  code: string;
  result: PyRunResult;
  /** 予測してから見るモードで始める */
  predictFirst?: boolean;
}

function caption(s: Step, isLast: boolean, failed: boolean): string {
  if (failed) return '止まった時点';
  if (s.event === 'return') {
    const fn = s.frames.at(-1)?.name;
    return !fn || fn === '<module>' ? '実行が終わった時点' : `${fn}() から戻るところ`;
  }
  return isLast ? '止まった時点' : '→ の行を実行する前';
}

/** 1 行ずつ進めたり戻したりしながら、名前とオブジェクトの様子を見る */
export function PyStepper({ code, result, predictFirst = false }: Props) {
  const trace = result.trace;
  const [i, setI] = useState(0);
  const [predict, setPredict] = useState(predictFirst);
  const [revealed, setRevealed] = useState(true);
  const last = Math.max(0, trace.length - 1);

  useEffect(() => { setI(0); setRevealed(true); }, [result]);

  const go = useCallback((n: number) => {
    const to = Math.max(0, Math.min(last, n));
    // 予測モードでは、1 つ進めるとき変わったところを隠し、もう一度押すと見せる
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
  const failed = isLast && result.status !== 'ok';

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
      {predict && !revealed && <p className="small muted" role="status">直前の行で、どの名前がどこを指すようになったか予想してから「答えを見る」を押してください。</p>}
      {result.traceTruncated && <p className="small muted">記録は最初の {trace.length.toLocaleString()} 歩までです。</p>}
      <div className="stepper">
        <div className="stack">
          <CodeView code={code} current={s.line} errorLine={failed && result.error?.line ? result.error.line : undefined} />
          <div>
            <p className="label-sm">ここまでの出力</p>
            <pre className="output">{result.stdout.slice(0, s.stdoutLen)}</pre>
          </div>
        </div>
        <div className="stack">
          <p className="small muted">{caption(s, isLast, failed)}の様子です。矢印は、名前がどのオブジェクトを指しているかを表します。</p>
          <ObjectView step={s} prev={i > 0 ? trace[i - 1] : undefined} hideChanges={predict && !revealed} />
          {failed && <PyErrorNotice result={result} />}
        </div>
      </div>
    </div>
  );
}
