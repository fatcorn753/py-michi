import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { RunResult } from '../interp/interp';
import { explainError } from '../learn/explain';

const ic = { className: 'icon', strokeWidth: 1.75, 'aria-hidden': true } as const;

export function ErrorNotice({ error }: { error: NonNullable<RunResult['error']> }) {
  const title = error.kind === 'compile' ? `${error.line} 行目: 実行の前に見つかった誤り` : error.kind === 'limit' ? '実行を止めました' : `${error.line} 行目: 実行中に起きた誤り`;
  const more = explainError(error.code);
  return (
    <div className="td-notice" data-tone="error" role="alert">
      <AlertCircle {...ic} />
      <div>
        <p className="td-notice-title">{title}</p>
        <p>{error.message}</p>
        {more && <p className="small">{more}</p>}
      </div>
    </div>
  );
}

/** 実行結果(出力・エラー・警告・メモリリーク)をまとめて見せる */
export function RunPanel({ result, showOutput = true }: { result: RunResult; showOutput?: boolean }) {
  return (
    <div className="stack" aria-live="polite">
      {result.error && <ErrorNotice error={result.error} />}
      {result.warnings.map((w, i) => (
        <div className="td-notice" data-tone="warning" role="status" key={i}>
          <AlertTriangle {...ic} />
          <div><p className="td-notice-title">{w.line} 行目: 注意</p><p>{w.msg}</p></div>
        </div>
      ))}
      {result.leaks.length > 0 && (
        <div className="td-notice" data-tone="warning" role="status">
          <AlertTriangle {...ic} />
          <div>
            <p className="td-notice-title">メモリリーク</p>
            <p>{result.leaks.map((l) => `${l.line} 行目で確保した ${l.size} バイト`).join('、')}が、free されないまま終わりました。使い終わったら free してください。</p>
          </div>
        </div>
      )}
      {showOutput && result.error?.kind !== 'compile' && (
        <div>
          <p className="label-sm">出力</p>
          <pre className="output">{result.stdout}</pre>
        </div>
      )}
      {result.ok && !result.warnings.length && !result.leaks.length && showOutput && (
        <p className="row small muted"><CheckCircle2 className="icon-sm" strokeWidth={1.75} aria-hidden />{result.steps.toLocaleString()} 歩で終わりました(終了コード {result.exitCode})。</p>
      )}
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="td-notice" role="status">
      <Info {...ic} />
      <div>{children}</div>
    </div>
  );
}
