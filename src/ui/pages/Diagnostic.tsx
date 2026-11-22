import { useMemo, useState } from 'react';
import { COURSES, DIAG } from '../../content';
import { kcLabel } from '../../learn/catalog';
import { store } from '../../learn/store';
import type { TestRecord } from '../../learn/store';
import { Quiz, type QuizResult } from '../Quiz';

/** 診断テスト(最初)と実力テスト(途中)。同じ問題の型で、数字だけを変える */
export function Diagnostic({ kind }: { kind: 'diag' | 'post' }) {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<{ rec: TestRecord; start?: string } | null>(null);
  const seeds = useMemo(() => DIAG.map((_, i) => (kind === 'diag' ? 1000 + i : (Date.now() + i * 31337) >>> 0)), [kind]);

  const finish = (r: QuizResult[]) => {
    const byKc: Record<string, [number, number]> = {};
    for (const x of r) for (const k of x.problem.kcs) {
      const v = byKc[k] ?? [0, 0];
      byKc[k] = [v[0] + (x.ok ? 1 : 0), v[1] + 1];
    }
    const rec: TestRecord = { at: Date.now(), kind, score: r.filter((x) => x.ok).length, total: r.length, byKc };
    let start: string | undefined;
    if (kind === 'diag') {
      // 単元で出した問題を全部正解していたら、その単元は飛ばしてよい。最初に穴のある単元から始める
      const main = COURSES[0];
      const firstGap = main.units.find((u) => {
        const tested = u.kcs.filter((k) => byKc[k]);
        return tested.length === 0 || tested.some((k) => byKc[k][0] < byKc[k][1]);
      });
      start = firstGap?.id ?? main.units[main.units.length - 1].id;
      const kc = { ...store.get().kc };
      // 診断は出発点を決めるための初期値。すでに問題を解いて推定した習得度は上書きしない
      for (const [k, [ok, n]] of Object.entries(byKc)) if (!kc[k]?.attempts) kc[k] = { p: ok === n ? 0.6 : 0.1, attempts: 0, correct: 0, last: Date.now() };
      store.update((s) => ({ tests: [...s.tests, rec], startUnit: start!, kc }));
    } else {
      store.update((s) => ({ tests: [...s.tests, rec] }));
    }
    setResult({ rec, start });
  };

  if (result) {
    const startUnit = COURSES[0].units.find((u) => u.id === result.start);
    const prev = store.get().tests.filter((t) => t.kind === 'diag')[0];
    return (
      <div className="page page-narrow">
        <h1>{kind === 'diag' ? '診断の結果' : '実力テストの結果'}</h1>
        <div className="td-stats">
          <div className="td-stat"><span className="td-stat-label">正解</span><span className="td-stat-value">{result.rec.score}<span className="td-stat-unit">/ {result.rec.total}</span></span></div>
          {kind === 'post' && prev && <div className="td-stat"><span className="td-stat-label">診断のとき</span><span className="td-stat-value">{prev.score}<span className="td-stat-unit">/ {prev.total}</span></span></div>}
        </div>
        <div className="prose">
          <p>項目ごとの結果:</p>
          <ul>{Object.entries(result.rec.byKc).map(([k, [ok, n]]) => <li key={k}>{kcLabel(k)}: {ok} / {n}</li>)}</ul>
        </div>
        {startUnit && <p>「{startUnit.title}」から始めるのがおすすめです。{startUnit.id !== COURSES[0].units[0].id && 'それより前の単元も開いているので、いつでも見直せます。'}</p>}
        <div className="row row-end"><a className="td-btn" data-variant="primary" href={startUnit ? `#/learn/main/${startUnit.id}` : '#/course'}>{startUnit ? `「${startUnit.title}」へ進む` : 'コースへ'}</a></div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="page page-narrow">
        <h1>{kind === 'diag' ? '診断テスト' : '実力テスト'}</h1>
        <p className="lead">{DIAG.length} 問です。分からない問題は、当てずっぽうで答えず「分からない」を選んでください。そのほうが、ちょうどよい出発点を選べます。</p>
        <div className="row row-end"><button className="td-btn" data-variant="primary" type="button" onClick={() => setStarted(true)}>始める</button></div>
      </div>
    );
  }
  return (
    <div className="page">
      <h1>{kind === 'diag' ? '診断テスト' : '実力テスト'}</h1>
      <Quiz label="テストの進み具合" items={DIAG} seeds={seeds} onFinish={finish} />
    </div>
  );
}
