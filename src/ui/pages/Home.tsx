import { ArrowRight } from 'lucide-react';
import { store, useStore } from '../../learn/store';
import { dueReviews } from '../../learn/catalog';
import { COURSES } from '../../content';

export function Home() {
  const s = useStore();
  const started = s.started;
  const due = dueReviews(s).length;
  const main = COURSES[0];
  const next = main.units.find((u) => s.passed[u.id] === undefined);

  if (!started) {
    return (
      <div className="page page-narrow">
        <h1>Python を、名前とオブジェクトを見ながら学ぶ</h1>
        <p className="lead">書いたコードを 1 行ずつ動かし、変数の名前がどのオブジェクトを指しているかを図で確かめながら進みます。インストールは要りません。記録はこの端末の中だけに保存されます。</p>
        <div className="prose">
          <p>このサイトの進め方は、学習の研究で効果が確かめられた方法に沿っています。</p>
          <ul>
            <li>書く前に、出力を予測したり、変数の値を追ったりして「読む力」を付けます。</li>
            <li>間違えたら、どこで考えがずれたかを図で示します。</li>
            <li>単元の終わりの確認テストに合格すると、次の単元が開きます。</li>
            <li>忘れかけたころに、数字を変えた問題で復習します。</li>
          </ul>
          <p>本編で文法を学んだあと、入力欄とボタンのある「家計簿アプリ」や、文章の単語を数えて多い順に並べる「テキスト集計ツール」を作ります。</p>
        </div>
        <div className="row row-end">
          <button className="td-btn" data-variant="primary" type="button" onClick={() => store.update(() => ({ started: true }))}>始める</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <h1>おかえりなさい</h1>
      {s.tests.length === 0 && (
        <section className="td-card stack" aria-labelledby="diag-h">
          <h2 id="diag-h">まず 10 分の診断テスト</h2>
          <p className="muted">いまの力を測って、どの単元から始めればよいかを決めます。プログラミングが初めてなら、全部「分からない」で構いません。</p>
          <div className="row row-end">
            <a className="td-btn" href="#/course">診断せずに最初から始める</a>
            <a className="td-btn" data-variant="primary" href="#/diag">診断テストを始める</a>
          </div>
        </section>
      )}
      {s.tests.length > 0 && (
        <div className="stack">
          {due > 0 && (
            <a className="td-row" href="#/review">
              <span className="td-row-main"><span className="td-row-title">復習が {due} 問あります</span><span className="td-row-meta">忘れかけたころに解くと、長く覚えていられます。</span></span>
              <ArrowRight className="icon" strokeWidth={1.75} aria-hidden />
            </a>
          )}
          {next ? (
            <a className="td-row" href={`#/learn/main/${next.id}`}>
              <span className="td-row-main"><span className="td-row-title">続き: {next.title}</span><span className="td-row-meta">{next.summary}</span></span>
              <ArrowRight className="icon" strokeWidth={1.75} aria-hidden />
            </a>
          ) : (
            <a className="td-row" href="#/course">
              <span className="td-row-main"><span className="td-row-title">本編を終えました。作品コースへ進みましょう</span></span>
              <ArrowRight className="icon" strokeWidth={1.75} aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
