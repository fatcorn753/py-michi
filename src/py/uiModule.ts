// 学習者が画面のあるアプリを作るための小さな道具 `ui`。Streamlit と同じ考え方で、
// 部品に触るたびにプログラムを上から実行し直し、そのときの部品の並びを画面にする。
// 名前と使い方は Streamlit に寄せている(卒業後にそのまま本物へ移れるように)。
export const UI_PY = String.raw`
import sys, types, json, os, shutil

class UIError(Exception):
    pass

class _Rerun(BaseException):
    # 学習者の except Exception で止まらないよう BaseException から作る
    pass

# アプリが読み書きするファイルの置き場。「最初から」では消さず、採点のときだけ空にする
APP_DIR = "/app"

_ui = types.ModuleType("ui")
_ui.__doc__ = "画面を組み立てる道具。部品に触るたびに、プログラムを上から実行し直す"

class _Ctx:
    def __init__(self):
        self.reset({})

    def reset(self, app):
        self.inputs = dict(app.get("inputs") or {})
        self.clicked = app.get("clicked")
        self.elements = []
        self.ids = set()
        st = app.get("state")
        _ui.state = st if isinstance(st, dict) else {}

    def add(self, el):
        self.elements.append(el)
        return el

    def widget(self, kind, label, key):
        wid = key if key is not None else label
        if not isinstance(wid, str):
            raise UIError("部品の名前(ラベル)は文字列にしてください")
        if wid in self.ids:
            raise UIError(f"「{wid}」という部品が 2 つあります。key= を付けて区別してください")
        self.ids.add(wid)
        return wid

_ctx = _Ctx()

def _text(args):
    return " ".join(str(a) for a in args)

def title(*args):
    """大きな見出しを出す"""
    _ctx.add({"kind": "title", "text": _text(args)})

def header(*args):
    """小さめの見出しを出す"""
    _ctx.add({"kind": "header", "text": _text(args)})

def write(*args):
    """文字を出す。print と同じく、複数渡すと空白でつなぐ"""
    _ctx.add({"kind": "write", "text": _text(args)})

def divider():
    """区切り線を出す"""
    _ctx.add({"kind": "divider"})

def text_input(label, value="", key=None):
    """1 行の入力欄。いま入っている文字列を返す"""
    wid = _ctx.widget("text_input", label, key)
    v = _ctx.inputs.get(wid, value)
    v = "" if v is None else str(v)
    _ctx.add({"kind": "text_input", "id": wid, "label": label, "value": v})
    return v

def number_input(label, value=0, key=None):
    """数の入力欄。いま入っている数を返す(初期値が整数なら整数で返す)"""
    wid = _ctx.widget("number_input", label, key)
    v = _ctx.inputs.get(wid, value)
    try:
        v = float(v)
    except (TypeError, ValueError):
        v = float(value)
    if isinstance(value, int) and not isinstance(value, bool) and v == int(v):
        v = int(v)
    _ctx.add({"kind": "number_input", "id": wid, "label": label, "value": v})
    return v

def selectbox(label, options, key=None):
    """選択肢から 1 つ選ぶ欄。選ばれている値を返す"""
    wid = _ctx.widget("selectbox", label, key)
    opts = list(options)
    if not opts:
        raise UIError("selectbox の選択肢が空です")
    v = _ctx.inputs.get(wid)
    shown = [str(o) for o in opts]
    i = shown.index(str(v)) if v is not None and str(v) in shown else 0
    _ctx.add({"kind": "selectbox", "id": wid, "label": label, "value": shown[i], "options": shown})
    return opts[i]

def button(label, key=None):
    """ボタン。押された直後の 1 回の実行でだけ True を返す"""
    wid = _ctx.widget("button", label, key)
    _ctx.add({"kind": "button", "id": wid, "label": label})
    return _ctx.clicked == wid

def table(rows):
    """表を出す。辞書のリストなら見出し付き、リストのリストならそのまま並べる"""
    rows = list(rows)
    if rows and isinstance(rows[0], dict):
        cols = []
        for r in rows:
            for k in r:
                if k not in cols:
                    cols.append(k)
        body = [[str(r.get(c, "")) for c in cols] for r in rows]
        _ctx.add({"kind": "table", "columns": [str(c) for c in cols], "rows": body})
    else:
        body = [[str(x) for x in (r if isinstance(r, (list, tuple)) else [r])] for r in rows]
        _ctx.add({"kind": "table", "columns": None, "rows": body})

def bar_chart(data):
    """棒グラフを出す。{名前: 数} の辞書を渡す"""
    if not isinstance(data, dict):
        raise UIError("bar_chart には {名前: 数} の辞書を渡してください")
    pairs = []
    for k, v in data.items():
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            raise UIError(f"bar_chart の値は数にしてください(「{k}」が {type(v).__name__} です)")
        pairs.append([str(k), v])
    _ctx.add({"kind": "bar_chart", "data": pairs})

def rerun():
    """いまの実行をやめて、すぐ上から実行し直す(state は持ち越す)。消した直後に画面を作り直すのに使う"""
    raise _Rerun()

def metric(label, value):
    """目立つ数字を 1 つ出す(合計など)"""
    _ctx.add({"kind": "metric", "label": str(label), "text": str(value)})

for _f in (title, header, write, divider, text_input, number_input, selectbox, button, table, bar_chart, metric, rerun):
    setattr(_ui, _f.__name__, _f)
_ui.UIError = UIError
_ui.state = {}
sys.modules["ui"] = _ui

def ui_begin(app, is_app=False, first=False):
    """実行の前に部品を空にする。アプリなら作業フォルダへ移り、頼まれたら中のファイルを消す"""
    _ctx.reset(app)
    if is_app:
        if first and app.get("wipeFiles"):
            shutil.rmtree(APP_DIR, ignore_errors=True)
        os.makedirs(APP_DIR, exist_ok=True)
        os.chdir(APP_DIR)

def ui_end():
    """画面と state を返す。state は次の実行へ持ち越すので、JSON にできる値だけを許す"""
    try:
        st = json.loads(json.dumps(_ui.state, ensure_ascii=False))
    except (TypeError, ValueError):
        raise UIError("ui.state には、数・文字列・True/False・None と、それを入れたリストと辞書だけを入れてください")
    return {"elements": _ctx.elements, "state": st}
`;
