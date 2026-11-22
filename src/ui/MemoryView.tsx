import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CellView, Snapshot, VarView } from '../interp/snapshot';

interface Props {
  snap: Snapshot;
  prev?: Snapshot;
  /** エラーの起きた場所(赤く示す) */
  bad?: { blockId?: number; offset?: number };
  /** 変わったセルの中身を隠す(予測してから見るため) */
  hideChanges?: boolean;
}

interface Arrow { d: string; bad: boolean }

/** スタック・大域・ヒープの中身を、箱と矢印で描く */
export function MemoryView({ snap, prev, bad, hideChanges }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);

  const names = useMemo(() => {
    const m = new Map<number, { name: string; isArray: boolean }>();
    const all: VarView[] = [...snap.globals, ...snap.frames.flatMap((f) => f.vars), ...snap.heap];
    for (const v of all) m.set(v.blockId, { name: v.name, isArray: v.isArray });
    return m;
  }, [snap]);

  const prevCells = useMemo(() => {
    const m = new Map<string, string>();
    if (!prev) return m;
    const all: VarView[] = [...prev.globals, ...prev.frames.flatMap((f) => f.vars), ...prev.heap];
    for (const v of all) v.cells.forEach((c, i) => m.set(`${v.blockId}:${i}`, c.text));
    return m;
  }, [prev]);

  // 矢印は、描いた後のセルの位置から引く
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const origin = el.getBoundingClientRect();
      const out: Arrow[] = [];
      el.querySelectorAll<HTMLElement>('[data-ptr-to]').forEach((src) => {
        const target = el.querySelector<HTMLElement>(`[data-cell="${src.dataset.ptrTo}"]`);
        if (!target) return;
        const a = src.getBoundingClientRect(), b = target.getBoundingClientRect();
        const x1 = a.right - origin.left, y1 = a.top + a.height / 2 - origin.top;
        const x2 = b.left + b.width / 2 - origin.left, y2 = b.top - origin.top;
        const toBelow = b.top > a.bottom;
        const ty = toBelow ? y2 : b.bottom - origin.top;
        const bend = Math.max(30, Math.abs(x2 - x1) / 3);
        out.push({ d: `M${x1},${y1} C${x1 + bend},${y1} ${x2},${toBelow ? ty - bend : ty + bend} ${x2},${ty}`, bad: src.dataset.ptrBad === '1' });
      });
      setArrows(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [snap, hideChanges]);

  const ptrLabel = (c: CellView): string => {
    const p = c.ptr!;
    if (p.blockId === 0) return 'NULL';
    if (p.blockId < 0) return '(どこでもない)';
    const t = names.get(p.blockId);
    if (!t) return c.text;
    if (t.isArray || p.index) return `→ ${t.name}[${p.index ?? 0}]`;
    return `→ ${t.name}`;
  };

  const renderVar = (v: VarView, kind: 'var' | 'heap') => (
    <div className="mem-var" key={v.blockId}>
      <div className="mem-name">
        {v.name}
        <small>{v.type}</small>
      </div>
      <div className="mem-cells" role="list" aria-label={`${v.name} の中身`}>
        {v.cells.map((c, i) => {
          const key = `${v.blockId}:${i}`;
          const changed = prev !== undefined && prevCells.get(key) !== undefined && prevCells.get(key) !== c.text;
          const fresh = prev !== undefined && prevCells.get(key) === undefined && kind === 'var';
          const masked = hideChanges && (changed || fresh);
          const isBad = bad?.blockId === v.blockId && bad.offset !== undefined && v.cells.length > 0 &&
            Math.floor(bad.offset / Math.max(1, cellSize(v))) === i;
          const target = c.ptr && c.ptr.blockId > 0 && !c.ptr.outside && !c.ptr.dead ? `${c.ptr.blockId}:${c.ptr.index ?? 0}` : undefined;
          return (
            <span
              key={i}
              role="listitem"
              className="mem-cell"
              data-cell={key}
              data-uninit={!c.init ? '' : undefined}
              data-changed={changed && !masked ? '' : undefined}
              data-bad={isBad ? '' : undefined}
              data-ptr={c.ptr ? '' : undefined}
              data-ptr-to={masked ? undefined : target}
              data-ptr-bad={c.ptr && (c.ptr.dead || c.ptr.outside) ? '1' : undefined}
              aria-label={`${v.isArray ? `${v.name}[${i}]` : v.name}: ${masked ? '隠しています' : c.init ? (c.ptr ? ptrLabel(c) : c.text) : '未初期化'}`}
            >
              {v.isArray && <small>[{i}]</small>}
              {masked ? '?' : c.ptr ? ptrLabel(c) : c.text}
              {!masked && c.ch !== undefined && <small>'{c.ch}'</small>}
              {!masked && c.ptr && (c.ptr.dead || c.ptr.outside) && <small>{c.ptr.dead ? '消えた先' : '範囲外'}</small>}
            </span>
          );
        })}
        {v.more > 0 && <span className="muted small">ほか {v.more} 個</span>}
      </div>
    </div>
  );

  const frames = [...snap.frames].reverse();
  return (
    <div className="mem" ref={box}>
      <div className="mem-area">
        <h3>スタック(関数の変数)</h3>
        {frames.length === 0 && <p className="muted small">関数は動いていません。</p>}
        {frames.map((f, i) => (
          <div className="mem-frame" key={i} data-top={i === 0 ? '' : undefined}>
            <div className="mem-frame-name">{f.fn}(){i === 0 ? ' ← いま動いている' : ''}</div>
            {f.vars.length === 0 ? <p className="muted small">変数はまだありません。</p> : f.vars.map((v) => renderVar(v, 'var'))}
          </div>
        ))}
        {snap.globals.length > 0 && (
          <>
            <h3>大域変数</h3>
            <div className="mem-frame">{snap.globals.map((v) => renderVar(v, 'var'))}</div>
          </>
        )}
      </div>
      <div className="mem-area">
        <h3>ヒープ(malloc で確保した領域)</h3>
        {snap.heap.length === 0 && <p className="muted small">まだ確保していません。</p>}
        {snap.heap.map((h) => (
          <div className="mem-frame mem-heap" key={h.blockId} data-freed={h.freed ? '' : undefined}>
            <div className="mem-frame-name">{h.line} 行目で確保{h.freed ? `・${h.freedLine} 行目で解放済み` : ''}</div>
            {renderVar({ ...h, name: h.freed ? '解放済み' : `${h.cells.length} 個` }, 'heap')}
          </div>
        ))}
      </div>
      <svg className="mem-arrows" aria-hidden="true">
        <defs>
          <marker id="mem-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" />
          </marker>
        </defs>
        {arrows.map((a, i) => <path key={i} d={a.d} data-bad={a.bad ? '' : undefined} markerEnd="url(#mem-head)" />)}
      </svg>
    </div>
  );
}

function cellSize(v: VarView): number {
  const t = v.type.replace(/\[.*$/, '').trim();
  if (t.endsWith('*') || t === 'double' || t === 'long' || t === 'unsigned long') return 8;
  if (t === 'char' || t === 'unsigned char' || t === 'bool') return 1;
  if (t === 'short') return 2;
  return 4;
}
