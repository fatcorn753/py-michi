import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { AppInput, PyRunOptions, PyRunResult, UiElement } from '../../py/types';
import { PyErrorNotice } from './PyRunPanel';
import { PyStepper } from './PyStepper';

type Run = (code: string, opts?: PyRunOptions) => Promise<PyRunResult>;

/** 入力欄。打っている間は実行せず、Enter か欄を離れたときに確定して実行し直す(Streamlit と同じ) */
function Field({ el, onCommit }: { el: UiElement & { kind: 'text_input' | 'number_input' }; onCommit: (v: string | number) => void }) {
  const [draft, setDraft] = useState(String(el.value));
  useEffect(() => { setDraft(String(el.value)); }, [el.value]);
  const commit = () => {
    if (draft === String(el.value)) return;
    if (el.kind === 'number_input') {
      const n = Number(draft);
      if (draft.trim() === '' || Number.isNaN(n)) { setDraft(String(el.value)); return; }
      onCommit(n);
    } else onCommit(draft);
  };
  const id = `app-${el.id}`;
  return (
    <div className="td-field">
      <label className="td-label" htmlFor={id}>{el.label}</label>
      <input
        id={id} className="td-input" value={draft}
        inputMode={el.kind === 'number_input' ? 'decimal' : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
    </div>
  );
}

/** ui の部品を、本物の画面の部品として描く */
export function AppView({ elements, busy, onInput, onClick }: {
  elements: UiElement[];
  busy: boolean;
  onInput: (id: string, v: string | number) => void;
  onClick: (id: string) => void;
}) {
  return (
    <div className="app-screen" aria-busy={busy}>
      {elements.length === 0 && <p className="small muted">(画面に何も出していません)</p>}
      {elements.map((e, i) => {
        switch (e.kind) {
          case 'title': return <h3 key={i} className="app-title">{e.text}</h3>;
          case 'header': return <h4 key={i} className="app-header">{e.text}</h4>;
          case 'write': return <p key={i} className="app-text">{e.text}</p>;
          case 'divider': return <hr key={i} />;
          case 'text_input': case 'number_input':
            return <Field key={e.id} el={e} onCommit={(v) => onInput(e.id, v)} />;
          case 'selectbox':
            return (
              <div className="td-field" key={e.id}>
                <label className="td-label" htmlFor={`app-${e.id}`}>{e.label}</label>
                <select id={`app-${e.id}`} className="td-input" value={e.value} onChange={(ev) => onInput(e.id, ev.target.value)}>
                  {e.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            );
          case 'button':
            return <div key={e.id}><button className="td-btn" type="button" onClick={() => onClick(e.id)}>{e.label}</button></div>;
          case 'metric':
            return (
              <div key={i} className="td-stat">
                <span className="td-stat-label">{e.label}</span>
                <span className="td-stat-value">{e.text}</span>
              </div>
            );
          case 'table':
            if (e.rows.length === 0) return <p key={i} className="small muted">(表はまだ空です)</p>;
            return (
              <div key={i} className="td-table-wrap">
                <table className="td-table">
                  {e.columns && <thead><tr>{e.columns.map((c, j) => <th key={j} scope="col">{c}</th>)}</tr></thead>}
                  <tbody>{e.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          case 'bar_chart': {
            const max = Math.max(0, ...e.data.map(([, v]) => v));
            return (
              <div key={i} className="app-bars" role="img" aria-label={e.data.map(([k, v]) => `${k} ${v}`).join('、')}>
                {e.data.map(([k, v]) => (
                  <div className="app-bar" key={k}>
                    <span className="app-bar-label">{k}</span>
                    <span className="app-bar-track"><span className="app-bar-fill" style={{ width: `${max > 0 ? Math.max(0, (v / max) * 100) : 0}%` }} /></span>
                    <span className="app-bar-value">{v}</span>
                  </div>
                ))}
              </div>
            );
          }
        }
      })}
    </div>
  );
}

/**
 * アプリを動かして見せる。部品に触るたびにプログラムを上から実行し直す。
 * 開いたときに 1 回目を実行する。最初からやり直したいときは、親が key を変える
 */
export function AppPanel({ code, run }: { code: string; run: Run }) {
  const app = useRef<AppInput>({ inputs: {}, clicked: null, state: null });
  const [result, setResult] = useState<PyRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState(0);
  // ファイルを書くアプリだけに「保存も消す」を出す
  const usesFiles = /\bopen\s*\(/.test(code);

  // 実行は順番待ちにする。入力欄を確定した直後にボタンを押すと 2 つの実行が続けて来るが、
  // 後の実行が前の実行の state を受け取れるよう、中身は順番が来たときに組み立てる
  const chain = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const go = useCallback((change?: (a: AppInput) => void) => {
    pending.current += 1;
    setBusy(true);
    chain.current = chain.current.then(async () => {
      change?.(app.current);
      try {
        const r = await run(code, { app: { ...app.current, inputs: { ...app.current.inputs } } });
        // ボタンは押した直後の 1 回だけ。ファイルを消すのも頼まれた 1 回だけ。state は次の実行へ持ち越す
        app.current.clicked = null;
        app.current.wipeFiles = false;
        if (r.app) app.current.state = r.app.state;
        setResult(r);
        setRuns((n) => n + 1);
      } catch {
        // 読み込みの失敗は、画面の上の案内で知らせる
      } finally {
        pending.current -= 1;
        if (pending.current === 0) setBusy(false);
      }
    });
  }, [code, run]);

  // 開発時の StrictMode は effect を 2 回呼ぶので、最初の実行は 1 回だけにする
  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; go(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 「最初から」は state を捨てるが、保存したファイルは残す(アプリを開き直したのと同じ)
  const restart = (wipeFiles = false) => {
    setRuns(0);
    go((a) => { a.inputs = {}; a.clicked = null; a.state = null; a.wipeFiles = wipeFiles; });
  };

  return (
    <div className="stack" aria-live="polite">
      <div className="app-frame">
        <div className="app-frame-bar">
          <span className="small muted">あなたのアプリ{runs > 0 && `(${runs} 回目の実行)`}</span>
          <span className="row">
            {usesFiles && (
              <button className="td-btn" data-variant="ghost" type="button" onClick={() => restart(true)} disabled={busy}>
                <Trash2 className="icon-sm" strokeWidth={1.75} aria-hidden />保存も消す
              </button>
            )}
            <button className="td-btn" data-variant="ghost" type="button" onClick={() => restart()} disabled={busy}>
              <RotateCcw className="icon-sm" strokeWidth={1.75} aria-hidden />最初から
            </button>
          </span>
        </div>
        {result?.app ? (
          <AppView
            elements={result.app.elements}
            busy={busy}
            onInput={(id, v) => go((a) => { a.inputs[id] = v; })}
            onClick={(id) => go((a) => { a.clicked = id; })}
          />
        ) : (
          <p className="small muted app-screen" role="status">{busy ? '動かしています…' : '画面を作れませんでした。'}</p>
        )}
      </div>
      {result && <PyErrorNotice result={result} />}
      {result && result.stdout && (
        <div>
          <p className="label-sm">print の出力</p>
          <pre className="output">{result.stdout}</pre>
        </div>
      )}
      {result && result.trace.length > 1 && (
        <details>
          <summary>いまの実行を 1 行ずつ見る</summary>
          <PyStepper code={code} result={result} />
        </details>
      )}
    </div>
  );
}
