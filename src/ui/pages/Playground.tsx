import { useEffect, useState } from 'react';
import { Square } from 'lucide-react';
import { runAsync, stopRun } from '../../interp/runAsync';
import type { RunResult } from '../../interp/interp';
import { CodeEditor } from '../CodeEditor';
import { RunPanel } from '../RunPanel';
import { Stepper } from '../Stepper';
import { EXAMPLES } from '../../content/examples';

const KEY = 'c-michi:play';

export function Playground() {
  const [code, setCode] = useState(() => { try { return localStorage.getItem(KEY) ?? EXAMPLES[0].code; } catch { return EXAMPLES[0].code; } });
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(KEY, code); } catch { /* 保存できなくても続ける */ } }, 400);
    return () => clearTimeout(t);
  }, [code]);

  const go = async () => {
    setBusy(true);
    setResult(await runAsync(code, { stdin, trace: true }));
    setBusy(false);
  };

  return (
    <div className="page">
      <h1>自由に書く</h1>
      <p className="lead">好きなコードを書いて動かせます。Ctrl + Enter(Mac は ⌘ + Enter)でも実行できます。書いた内容はこの端末に自動で保存されます。</p>
      <div className="row">
        <label className="td-label" htmlFor="ex">例を読み込む</label>
        <select id="ex" className="td-input" style={{ width: 'auto' }} defaultValue="" onChange={(e) => { const ex = EXAMPLES.find((x) => x.title === e.target.value); if (ex) { setCode(ex.code); setStdin(ex.stdin ?? ''); setResult(null); } }}>
          <option value="" disabled>選んでください</option>
          {EXAMPLES.map((x) => <option key={x.title}>{x.title}</option>)}
        </select>
      </div>
      <CodeEditor value={code} onChange={setCode} label="コード" errorLine={result?.error?.line} onRun={go} />
      <div className="td-field">
        <label className="td-label" htmlFor="stdin">入力(scanf や getchar で読む内容)<span className="td-optional">任意</span></label>
        <textarea id="stdin" className="td-input" rows={2} value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} style={{ fontFamily: 'var(--font-mono)', height: 'auto' }} />
      </div>
      <div className="row row-end">
        {busy && <button className="td-btn" type="button" onClick={() => stopRun()}><Square className="icon-sm" strokeWidth={1.75} aria-hidden />止める</button>}
        <button className="td-btn" data-variant="primary" type="button" onClick={go} aria-busy={busy}>実行</button>
      </div>
      {result && <RunPanel result={result} />}
      {result && result.trace.length > 1 && (
        <section className="stack" aria-labelledby="step-h">
          <h2 id="step-h">1 行ずつ見る</h2>
          <Stepper code={code} result={result} />
        </section>
      )}
      <details className="small muted">
        <summary>このサイトの C でできること・できないこと</summary>
        <div className="prose">
          <p>使えるもの: int・char・long・double・unsigned、配列(多次元・可変長)、ポインタ、関数と再帰、文字列、malloc / free、printf / scanf / getchar / fgets、string.h・ctype.h・math.h の主な関数。</p>
          <p>まだ使えないもの: 構造体(struct)、typedef、関数ポインタ、ファイルの読み書き。構造体は次の版で加えます。</p>
          <p>本物の C との違い: 本物では黙って壊れる誤り(範囲外アクセスや未初期化の読み出しなど)を、このサイトでは止めて知らせます。</p>
        </div>
      </details>
    </div>
  );
}
