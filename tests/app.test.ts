// ui モジュールと、操作をなぞって動かす仕組みの試験
import { beforeAll, describe, expect, it } from 'vitest';
import { replayApp, screenText, usesUi } from '../src/py/app';
import { nodePy, nodeRun } from './pyNode';

beforeAll(async () => { await nodePy(); }, 60_000);

const KAKEIBO = `import ui
if "items" not in ui.state:
    ui.state["items"] = []
ui.title("家計簿")
name = ui.text_input("品名")
price = ui.number_input("金額")
if ui.button("追加") and name:
    ui.state["items"].append({"品名": name, "金額": price})
ui.table(ui.state["items"])
ui.metric("合計", sum(x["金額"] for x in ui.state["items"]))
`;

describe('ui', () => {
  it('部品を上から並べて返す', async () => {
    const r = await nodeRun('import ui\nui.title("家計簿")\nui.write("今月", 3, "件")\nui.divider()', { app: { inputs: {}, clicked: null, state: null } });
    expect(r.status).toBe('ok');
    expect(screenText(r.app!.elements)).toBe('# 家計簿\n今月 3 件\n---');
  });

  it('app を渡さなければ app は null', async () => {
    const r = await nodeRun('print(1)');
    expect(r.app).toBeNull();
  });

  it('操作をなぞると state が持ち越される', async () => {
    const { result, failure } = await replayApp(nodeRun, KAKEIBO, [
      { set: { 品名: 'パン', 金額: 180 } }, { click: '追加' },
      { set: { 品名: '牛乳', 金額: 220 } }, { click: '追加' },
    ]);
    expect(failure).toBeNull();
    expect(result.status, JSON.stringify(result.error)).toBe('ok');
    expect(screenText(result.app!.elements)).toBe(
      '# 家計簿\n[品名: 牛乳]\n[金額: 220]\n(追加)\n品名 | 金額\nパン | 180\n牛乳 | 220\n合計: 400',
    );
  });

  it('ボタンは押した直後の 1 回だけ True', async () => {
    const { result } = await replayApp(nodeRun, KAKEIBO, [{ set: { 品名: 'パン', 金額: 180 } }, { click: '追加' }, { set: { 金額: 200 } }]);
    expect(screenText(result.app!.elements)).toContain('合計: 180');
  });

  it('number_input は初期値が整数なら整数を返す', async () => {
    const r = await nodeRun('import ui\nx = ui.number_input("x")\nui.write(type(x).__name__, x)', { app: { inputs: { x: 5 }, clicked: null, state: null } });
    expect(screenText(r.app!.elements)).toContain('int 5');
  });

  it('ない部品を操作しようとすると理由を返す', async () => {
    const { failure } = await replayApp(nodeRun, 'import ui\nui.title("a")', [{ click: '追加' }]);
    expect(failure).toContain('追加');
  });

  it('同じラベルの部品が 2 つあるとエラー', async () => {
    const r = await nodeRun('import ui\nui.button("a")\nui.button("a")', { app: { inputs: {}, clicked: null, state: null } });
    expect(r.error?.type).toBe('UIError');
  });

  it('JSON にできない値を state に入れるとエラーで、前の state を保つ', async () => {
    const r = await nodeRun('import ui\nui.state["s"] = {1, 2}', { app: { inputs: {}, clicked: null, state: { a: 1 } } });
    expect(r.error?.type).toBe('UIError');
    expect(r.app?.state).toEqual({ a: 1 });
  });

  it('エラーで止まっても、そこまでの部品は返す', async () => {
    const r = await nodeRun('import ui\nui.title("t")\n1/0', { app: { inputs: {}, clicked: null, state: null } });
    expect(r.error?.type).toBe('ZeroDivisionError');
    expect(screenText(r.app!.elements)).toBe('# t');
  });

  it('usesUi は import ui を見分ける', () => {
    expect(usesUi('import ui\n')).toBe(true);
    expect(usesUi('x = 1\nfrom ui import button')).toBe(true);
    expect(usesUi('import uix')).toBe(false);
    expect(usesUi('# import ui')).toBe(false);
  });
  it('ui.rerun はすぐ上から実行し直し、消した後の画面を返す', async () => {
    const code = `import ui
if "items" not in ui.state:
    ui.state["items"] = ["a", "b", "c"]
items = ui.state["items"]
for i in range(len(items)):
    ui.write(items[i])
    if ui.button("削除", key="del" + str(i)):
        items.pop(i)
        ui.rerun()
`;
    const { result } = await replayApp(nodeRun, code, [{ click: 'del1' }]);
    expect(result.status, JSON.stringify(result.error)).toBe('ok');
    expect(screenText(result.app!.elements)).toBe('a\n(削除)\nc\n(削除)');
    expect(result.app!.state).toEqual({ items: ['a', 'c'] });
  });

  it('ui.rerun を毎回呼ぶと止める', async () => {
    const r = await nodeRun('import ui\nui.rerun()', { app: { inputs: {}, clicked: null, state: null } });
    expect(r.error?.type).toBe('UIError');
  });

  it('except Exception では ui.rerun を止められない', async () => {
    const code = 'import ui\nui.state["n"] = ui.state.get("n", 0) + 1\nif ui.state["n"] == 1:\n    try:\n        ui.rerun()\n    except Exception:\n        ui.write("caught")\nui.write(ui.state["n"])';
    const r = await nodeRun(code, { app: { inputs: {}, clicked: null, state: null } });
    expect(screenText(r.app!.elements)).toBe('2');
  });

  const SAVE = `import ui, json, os
if "items" not in ui.state:
    if os.path.exists("k.json"):
        with open("k.json") as f:
            ui.state["items"] = json.load(f)
    else:
        ui.state["items"] = []
name = ui.text_input("品名")
if ui.button("追加"):
    ui.state["items"].append(name)
    with open("k.json", "w") as f:
        json.dump(ui.state["items"], f, ensure_ascii=False)
ui.write(len(ui.state["items"]), "件")
`;

  it('restart は state を捨てるが、ファイルは残る', async () => {
    const { result } = await replayApp(nodeRun, SAVE, [{ set: { 品名: 'パン' } }, { click: '追加' }, { restart: true }]);
    expect(screenText(result.app!.elements)).toBe('[品名: ]\n(追加)\n1 件');
  });

  it('採点の操作は、前に書いたファイルを消してから始める', async () => {
    await replayApp(nodeRun, SAVE, [{ set: { 品名: 'パン' } }, { click: '追加' }]);
    const { result } = await replayApp(nodeRun, SAVE, []);
    expect(screenText(result.app!.elements)).toContain('0 件');
  });
});
