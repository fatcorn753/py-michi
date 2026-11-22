import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HeapEntry, Step } from '../../py/types';

interface Props {
  step: Step;
  prev?: Step;
  /** 変わったところを隠す(予測してから見るため) */
  hideChanges?: boolean;
}

// 数・文字列などは箱の中にそのまま書く。それ以外(リストや辞書など)は右に箱を作り、矢印で指す
const INLINE = new Set(['int', 'float', 'bool', 'complex', 'str', 'bytes', 'NoneType']);
const isInline = (e: HeapEntry | undefined) => !!e && INLINE.has(e.type);

const TYPE_LABEL: Record<string, string> = {
  list: 'list(リスト)', tuple: 'tuple(タプル)', dict: 'dict(辞書)', set: 'set(集合)',
  frozenset: 'frozenset', function: '関数', type: 'クラス', builtin_function_or_method: '組み込み関数',
};

/** 中身を比べるための文字列。子は id で比べる(同じ id の中身の変化は子の側で拾う) */
function signature(e: HeapEntry | undefined): string {
  if (!e) return '';
  return JSON.stringify([e.type, e.repr, e.items, e.pairs, e.attrs, e.truncated]);
}

interface Arrow { d: string }

/** 名前(フレームごと)とオブジェクトを並べ、名前からオブジェクトへ矢印を引く */
export function ObjectView({ step, prev, hideChanges }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const heap = step.heap;

  const objects = useMemo(() => step.order.filter((id) => !isInline(heap[id])), [step, heap]);

  // 前のステップから変わったもの: 名前の指す先と、オブジェクトの中身
  const changed = useMemo(() => {
    const names = new Set<string>();
    const objs = new Set<string>();
    if (!prev) return { names, objs };
    step.frames.forEach((f, fi) => {
      const pf = prev.frames[fi];
      const before = pf && pf.name === f.name ? new Map(pf.locals) : new Map<string, string>();
      for (const [n, id] of f.locals) {
        const old = before.get(n);
        if (old !== id || (isInline(heap[id]) && signature(prev.heap[old!]) !== signature(heap[id]))) names.add(`${fi}:${n}`);
      }
    });
    for (const id of objects) {
      if (prev.heap[id] && signature(prev.heap[id]) !== signature(heap[id])) objs.add(id);
    }
    return { names, objs };
  }, [step, prev, heap, objects]);

  // 矢印は、描いた後の位置から引く
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const o = el.getBoundingClientRect();
      const out: Arrow[] = [];
      el.querySelectorAll<HTMLElement>('[data-ref-to]').forEach((src) => {
        const target = el.querySelector<HTMLElement>(`[data-obj="${src.dataset.refTo}"]`);
        if (!target) return;
        const a = src.getBoundingClientRect(), b = target.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - o.left, y1 = a.top + a.height / 2 - o.top;
        if (b.left >= a.right - 1) {
          // 右の箱へ: 箱の左端の、見出しの高さに刺す
          const x2 = b.left - o.left, y2 = b.top + 14 - o.top;
          const bend = Math.max(24, (x2 - x1) / 2);
          out.push({ d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}` });
        } else {
          // 同じ列(狭い画面や、箱の中から別の箱へ): 右に膨らませて回り込む。
          // 狭い画面では .obj の右の余白を通り道にし、枠の外には出さない
          const x2 = b.right - o.left, y2 = b.top + 14 - o.top;
          const bulge = Math.min(Math.max(x1, x2) + 36, o.width - 6);
          out.push({ d: `M${x1},${y1} C${bulge},${y1} ${bulge},${y2} ${x2},${y2}` });
        }
      });
      setArrows(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step, hideChanges]);

  /** 名前や要素の「値の欄」。数や文字列はそのまま、ほかは矢印の根元 */
  const slot = (id: string, masked: boolean, label: string) => {
    const e = heap[id];
    if (masked) return <span className="obj-val" aria-label={`${label}: 隠しています`}>?</span>;
    if (isInline(e)) return <span className="obj-val" aria-label={`${label}: ${e!.repr}`}>{e!.repr}</span>;
    return (
      <span className="obj-val obj-ref" aria-label={`${label}: ${e ? typeName(e) : '?'} を指す`}>
        <span className="obj-dot" data-ref-to={id} />
      </span>
    );
  };

  const frames = step.frames;
  return (
    <div className="obj" ref={box}>
      <div className="obj-col">
        <h3>名前</h3>
        {frames.map((f, fi) => {
          const top = fi === frames.length - 1;
          return (
            <div className="obj-frame" key={fi} data-top={top ? '' : undefined}>
              <div className="obj-frame-name">{f.name === '<module>' ? 'プログラム全体' : `${f.name}()`}{top && frames.length > 1 ? ' ← いま動いている' : ''}</div>
              {f.locals.length === 0 && !(top && step.ret) && <p className="muted small">名前はまだありません。</p>}
              {f.locals.map(([n, id]) => {
                const ch = changed.names.has(`${fi}:${n}`);
                return (
                  <div className="obj-row" key={n} data-changed={ch && !hideChanges ? '' : undefined}>
                    <span className="obj-name">{n}</span>
                    {slot(id, !!hideChanges && ch, n)}
                  </div>
                );
              })}
              {top && step.ret && (
                <div className="obj-row obj-ret">
                  <span className="obj-name">戻り値</span>
                  {slot(step.ret, !!hideChanges, '戻り値')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="obj-col">
        <h3>オブジェクト</h3>
        {objects.length === 0 && <p className="muted small">リストや辞書などは、作るとここに出ます。</p>}
        {objects.map((id) => {
          const e = heap[id];
          const masked = !!hideChanges && (changed.objs.has(id) || (!!prev && !prev.heap[id]));
          return (
            <div className="obj-box" key={id} data-obj={id} data-changed={changed.objs.has(id) && !hideChanges ? '' : undefined}>
              <div className="obj-type">{typeName(e)}</div>
              {masked ? <p className="obj-body">?</p> : <ObjBody e={e} heap={heap} slot={slot} />}
            </div>
          );
        })}
      </div>
      <svg className="obj-arrows" aria-hidden="true">
        <defs>
          <marker id="obj-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" />
          </marker>
        </defs>
        {arrows.map((a, i) => <path key={i} d={a.d} markerEnd="url(#obj-head)" />)}
      </svg>
    </div>
  );
}

function typeName(e: HeapEntry): string {
  if (e.type === 'function' || e.type === 'type' || e.type === 'builtin_function_or_method') return `${TYPE_LABEL[e.type]} ${e.repr ?? ''}`;
  if (TYPE_LABEL[e.type]) return TYPE_LABEL[e.type];
  return e.attrs ? `${e.type} のインスタンス` : e.type;
}

function ObjBody({ e, heap, slot }: { e: HeapEntry; heap: Step['heap']; slot: (id: string, masked: boolean, label: string) => JSX.Element }) {
  const more = e.truncated ? <span className="muted small">ほか {e.truncated - 50} 個</span> : null;
  if (e.items) {
    if (e.items.length === 0) return <p className="obj-body muted small">(空)</p>;
    const indexed = e.type === 'list' || e.type === 'tuple';
    return (
      <div className="obj-items" role="list">
        {e.items.map((id, i) => (
          <span className="obj-item" role="listitem" key={i}>
            {indexed && <small>{i}</small>}
            {slot(id, false, indexed ? `[${i}]` : '要素')}
          </span>
        ))}
        {more}
      </div>
    );
  }
  const rows = e.pairs ?? e.attrs;
  if (rows) {
    if (rows.length === 0) return <p className="obj-body muted small">(空)</p>;
    return (
      <div className="obj-pairs">
        {rows.map(([k, v], i) => (
          <div className="obj-row" key={i}>
            <span className="obj-name">{e.pairs ? heap[k]?.repr ?? '?' : k}</span>
            {slot(v, false, e.pairs ? `${heap[k]?.repr ?? '?'} の値` : k)}
          </div>
        ))}
        {more}
      </div>
    );
  }
  return null;
}

