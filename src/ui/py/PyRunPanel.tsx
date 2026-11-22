import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PyRunResult } from '../../py/types';
import { explainPyError } from '../../learn/pyExplain';

const ic = { className: 'icon', strokeWidth: 1.75, 'aria-hidden': true } as const;

/** 止まった理由を伝える。成功したときは何も出さない */
export function PyErrorNotice({ result }: { result: PyRunResult }) {
  if (result.status === 'ok') return null;
  const e = result.error;
  let title: string;
  let body: string;
  let more: string | undefined;
  if (result.status === 'step-limit') {
    title = '実行を止めました';
    body = `${result.steps.toLocaleString()} 行を実行しても終わらなかったので止めました。無限ループになっていないか確かめてください。`;
  } else if (result.status === 'error' && e) {
    title = e.line ? `${e.line} 行目: ${e.type}` : e.type;
    body = e.message || '(説明なし)';
    more = explainPyError(e.type);
  } else {
    title = '実行を止めました';
    body = e?.message ?? '';
  }
  return (
    <div className="td-notice" data-tone="error" role="alert">
      <AlertCircle {...ic} />
      <div>
        <p className="td-notice-title">{title}</p>
        <p lang={result.status === 'error' ? 'en' : undefined}>{body}</p>
        {more && <p className="small">{more}</p>}
      </div>
    </div>
  );
}

/** 実行結果(出力とエラー)をまとめて見せる */
export function PyRunPanel({ result, showOutput = true }: { result: PyRunResult; showOutput?: boolean }) {
  const syntax = result.error?.type === 'SyntaxError' || result.error?.type === 'IndentationError' || result.error?.type === 'TabError';
  return (
    <div className="stack" aria-live="polite">
      <PyErrorNotice result={result} />
      {showOutput && !syntax && (
        <div>
          <p className="label-sm">出力</p>
          <pre className="output">{result.stdout}</pre>
        </div>
      )}
      {result.status === 'ok' && showOutput && (
        <p className="row small muted"><CheckCircle2 className="icon-sm" strokeWidth={1.75} aria-hidden />{result.steps.toLocaleString()} 歩で終わりました。</p>
      )}
    </div>
  );
}
