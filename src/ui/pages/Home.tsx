import { ArrowRight, Cpu, Terminal } from 'lucide-react';
import { store, useStore } from '../../learn/store';
import { dueReviews } from '../../learn/catalog';
import { COURSES } from '../../content';
import { InfoNote } from '../RunPanel';

const ic = { className: 'icon', strokeWidth: 1.75, 'aria-hidden': true } as const;

export function Home() {
  const s = useStore();
  const started = s.track !== null;
  const due = dueReviews(s).length;
  const main = COURSES[0];
  const next = main.units.find((u) => s.passed[u.id] === undefined);

  if (!started) {
    return (
      <div className="page page-narrow">
        <h1>C 言語を、メモリを見ながら学ぶ</h1>
        <p className="lead">書いたコードを 1 行ずつ動かし、変数やポインタがメモリのどこで何をしているかを図で確かめながら進みます。インストールは要りません。記録はこの端末の中だけに保存されます。</p>
        <div className="prose">
          <p>このサイトの進め方は、学習の研究で効果が確かめられた方法に沿っています。</p>
          <ul>
            <li>書く前に、出力を予測したり、変数の値を追ったりして「読む力」を付けます。</li>
            <li>間違えたら、どこで考えがずれたかを図で示します。</li>
            <li>単元の終わりの確認テストに合格すると、次の単元が開きます。</li>
            <li>忘れかけたころに、数字を変えた問題で復習します。</li>
          </ul>
        </div>
        <h2>最後に何を作りたいですか?</h2>
        <p className="muted small">本編で文法を学んだあと、選んだ方向の作品を作るコースに進みます。あとから変えられます。</p>
        <div className="track-options">
          <button className="choice" type="button" onClick={() => store.update(() => ({ track: 'pc' }))}>
            <Terminal {...ic} />
            <span><strong>パソコンで動く道具</strong><br /><span className="small muted">文字数を数える wc や、文字列を探す grep の小さな版を作ります。</span></span>
          </button>
          <button className="choice" type="button" onClick={() => store.update(() => ({ track: 'mcu' }))}>
            <Cpu {...ic} />
            <span><strong>マイコンを動かす</strong><br /><span className="small muted">LED やセンサーをつなぐマイコンのプログラムです。この作品コースは準備中のため、先に本編を進めます。</span></span>
          </button>
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
      {s.track === 'mcu' && <InfoNote><p>マイコンの作品コースは準備中です。本編のポインタまで終えると、マイコンのプログラムを読むための力がそろいます。</p></InfoNote>}
      <p className="small muted">
        作品の方向: {s.track === 'pc' ? 'パソコンで動く道具' : 'マイコンを動かす'}{' '}
        <button className="td-btn" data-variant="ghost" type="button" onClick={() => store.update((x) => ({ track: x.track === 'pc' ? 'mcu' : 'pc' }))}>変える</button>
      </p>
    </div>
  );
}
