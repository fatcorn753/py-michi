import { useEffect, useState } from 'react';
import { Square } from 'lucide-react';
import { runPy, stopPy, usePyLoad, warmUp } from '../../py/session';
import type { PyRunResult } from '../../py/types';
import { CodeEditor } from '../CodeEditor';
import { PyRunPanel } from '../py/PyRunPanel';
import { PyStepper } from '../py/PyStepper';
import { AppPanel } from '../py/AppPanel';
import { usesUi } from '../../py/app';
import { EXAMPLES } from '../../content/examples';

const KEY = 'py-michi:play';

export function Playground() {
  const [code, setCode] = useState(() => { try { return localStorage.getItem(KEY) ?? EXAMPLES[0].code; } catch { return EXAMPLES[0].code; } });
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<PyRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  // ui を使うコードは、アプリとして画面に出す。実行のたびに数を変えて、最初から動かし直す
  const [appRun, setAppRun] = useState<{ n: number; code: string } | null>(null);
  const load = usePyLoad();

  useEffect(() => { warmUp(); }, []);

  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(KEY, code); } catch { /* 保存できなくても続ける */ } }, 400);
    return () => clearTimeout(t);
  }, [code]);

  const go = async () => {
    if (busy) return;
    if (usesUi(code)) {
      setResult(null);
      setAppRun((a) => ({ n: (a?.n ?? 0) + 1, code }));
      return;
    }
    setAppRun(null);
    setBusy(true);
    try {
      setResult(await runPy(code, { stdin }));
    } catch {
      // 読み込みに失敗したときは、下の案内で知らせる
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <h1>自由に書く</h1>
      <p className="lead">好きなコードを書いて動かせます。Ctrl + Enter(Mac は ⌘ + Enter)でも実行できます。書いた内容はこの端末に自動で保存されます。</p>
      <div className="row">
        <label className="td-label" htmlFor="ex">例を読み込む</label>
        <select id="ex" className="td-input" style={{ width: 'auto' }} defaultValue="" onChange={(e) => { const ex = EXAMPLES.find((x) => x.title === e.target.value); if (ex) { setCode(ex.code); setStdin(ex.stdin ?? ''); setResult(null); setAppRun(null); } }}>
          <option value="" disabled>選んでください</option>
          {EXAMPLES.map((x) => <option key={x.title}>{x.title}</option>)}
        </select>
      </div>
      <CodeEditor value={code} onChange={setCode} label="コード" errorLine={result?.error?.line} onRun={go} />
      <div className="td-field">
        <label className="td-label" htmlFor="stdin">入力(input() で 1 行ずつ読む内容)<span className="td-optional">任意</span></label>
        <textarea id="stdin" className="td-input" rows={2} value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} style={{ fontFamily: 'var(--font-mono)', height: 'auto' }} />
      </div>
      {load.state === 'loading' && <p className="small muted" role="status">Python を準備しています。初めてのときは 10MB ほど読み込むので、少し時間がかかります。</p>}
      {load.state === 'error' && (
        <div className="td-notice" data-tone="error" role="alert">
          <div>
            <p className="td-notice-title">Python を読み込めませんでした</p>
            <p>ネットにつながっているか確かめて、ページを読み込み直してください。({load.detail})</p>
          </div>
        </div>
      )}
      <div className="row row-end">
        {busy && <button className="td-btn" type="button" onClick={() => stopPy()}><Square className="icon-sm" strokeWidth={1.75} aria-hidden />止める</button>}
        <button className="td-btn" data-variant="primary" type="button" onClick={go} aria-busy={busy} disabled={load.state === 'error'}>実行</button>
      </div>
      {appRun && <AppPanel key={appRun.n} code={appRun.code} run={runPy} />}
      {result && <PyRunPanel result={result} />}
      {result && result.trace.length > 1 && (
        <section className="stack" aria-labelledby="step-h">
          <h2 id="step-h">1 行ずつ見る</h2>
          <PyStepper code={code} result={result} />
        </section>
      )}
      <details className="small muted">
        <summary>このサイトの Python について</summary>
        <div className="prose">
          <p>ブラウザの中で本物の Python(CPython 3.14 を WebAssembly にした Pyodide)を動かしています。標準ライブラリの多くが使えます。</p>
          <p>input() は、上の「入力」欄に書いた行を順に読みます。実行の途中で入力を待つことはできません。</p>
          <p><code>import ui</code> と書くと、画面のあるアプリとして動きます。部品に触るたびに、プログラムが上から実行し直されます(Streamlit と同じ考え方です)。</p>
          <p>10 万行を実行しても終わらないとき、または 5 秒たっても終わらないときは、無限ループとみなして止めます。</p>
        </div>
      </details>
    </div>
  );
}
