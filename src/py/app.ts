// ui を使うアプリを、人の操作をなぞって動かす。採点と試験で、画面の変わり方を確かめるのに使う
import type { AppInput, PyRunOptions, PyRunResult, UiElement } from './types';

/** 操作 1 つ。set は入力欄に値を入れる(1 回の set で 1 回実行し直す)、click はボタンを押す */
export type UiAction = { set: Record<string, string | number> } | { click: string };

type Run = (code: string, opts?: PyRunOptions) => Promise<PyRunResult>;

export interface AppReplay {
  result: PyRunResult;
  /** 操作の対象が見つからなかったなど、操作をやり通せなかった理由 */
  failure: string | null;
}

const WIDGETS = new Set(['text_input', 'number_input', 'selectbox']);

/** ラベル(または key)から部品を探す */
function find(elements: UiElement[], name: string, kinds: Set<string>) {
  return elements.find((e) => kinds.has(e.kind) && 'id' in e && (e.id === name || e.label === name)) as
    | (UiElement & { id: string; label: string })
    | undefined;
}

export async function replayApp(run: Run, code: string, actions: UiAction[], opts: PyRunOptions = {}): Promise<AppReplay> {
  const app: AppInput = { inputs: {}, clicked: null, state: null };
  let result = await run(code, { ...opts, app });
  for (const a of actions) {
    if (result.status !== 'ok' || !result.app) return { result, failure: null };
    const els = result.app.elements;
    if ('set' in a) {
      for (const [name, value] of Object.entries(a.set)) {
        const el = find(els, name, WIDGETS);
        if (!el) return { result, failure: `「${name}」という入力欄が見つかりません。` };
        app.inputs[el.id] = value;
      }
      app.clicked = null;
    } else {
      const el = find(els, a.click, new Set(['button']));
      if (!el) return { result, failure: `「${a.click}」というボタンが見つかりません。` };
      app.clicked = el.id;
    }
    app.state = result.app.state;
    result = await run(code, { ...opts, app: { ...app, inputs: { ...app.inputs } } });
  }
  return { result, failure: null };
}

/** 画面を文字にする。採点で比べるのと、期待する画面を見せるのに使う */
export function screenText(elements: UiElement[]): string {
  const out: string[] = [];
  for (const e of elements) {
    switch (e.kind) {
      case 'title': out.push(`# ${e.text}`); break;
      case 'header': out.push(`## ${e.text}`); break;
      case 'write': out.push(e.text); break;
      case 'divider': out.push('---'); break;
      case 'text_input': case 'number_input': out.push(`[${e.label}: ${e.value}]`); break;
      case 'selectbox': out.push(`[${e.label}: ${e.value} ▼]`); break;
      case 'button': out.push(`(${e.label})`); break;
      case 'metric': out.push(`${e.label}: ${e.text}`); break;
      case 'table':
        if (e.columns) out.push(e.columns.join(' | '));
        for (const r of e.rows) out.push(r.join(' | '));
        break;
      case 'bar_chart':
        for (const [k, v] of e.data) out.push(`${k}: ${v}`);
        break;
    }
  }
  return out.join('\n');
}

/** 操作を人が読める文にする */
export function describeActions(actions: UiAction[]): string {
  return actions
    .map((a) => ('set' in a
      ? Object.entries(a.set).map(([k, v]) => `「${k}」に ${v} を入れる`).join('、')
      : `「${a.click}」を押す`))
    .join(' → ');
}

/** コードが ui を使っているか(自由に書く画面で、アプリとして動かすかを決める) */
export const usesUi = (code: string) => /^\s*(import\s+ui\b|from\s+ui\s+import\b)/m.test(code);
