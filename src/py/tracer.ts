// 学習者のコードを 1 行ずつ記録する Python 側の仕組み。
// sys.settrace で line/call/return を受け、各時点の「名前 → オブジェクト」を写し取る。
// 文字列として持ち、Pyodide に一度だけ読み込ませる。
export const TRACER_PY = String.raw`
import sys, types

USER_FILE = "<main.py>"

class StepLimit(BaseException):
    # BaseException にするのは、学習者の except Exception で握りつぶされないようにするため
    pass

_SCALAR = (int, float, bool, complex, str, bytes, type(None))
_MAX_ITEMS = 50     # 1 つの入れ物から写す要素の上限
_MAX_OBJECTS = 300  # 1 ステップで写すオブジェクトの上限

def _ref(v, heap, order):
    """値を参照(オブジェクト id)に置き換え、中身を heap に写す"""
    oid = id(v)
    if oid in heap or len(heap) >= _MAX_OBJECTS:
        return oid
    t = type(v)
    if isinstance(v, _SCALAR):
        r = repr(v)
        if len(r) > 80:
            r = r[:77] + "..."
        heap[oid] = {"type": t.__name__, "repr": r}
        order.append(oid)
        return oid
    entry = {"type": t.__name__}
    heap[oid] = entry  # 先に入れて、循環参照で無限に潜らないようにする
    order.append(oid)
    if t in (list, tuple, set, frozenset):
        items = list(v)
        entry["items"] = [_ref(x, heap, order) for x in items[:_MAX_ITEMS]]
        if len(items) > _MAX_ITEMS:
            entry["truncated"] = len(items)
    elif t is dict:
        pairs = list(v.items())
        entry["pairs"] = [[_ref(k, heap, order), _ref(x, heap, order)] for k, x in pairs[:_MAX_ITEMS]]
        if len(pairs) > _MAX_ITEMS:
            entry["truncated"] = len(pairs)
    elif isinstance(v, (types.FunctionType, types.BuiltinFunctionType, type, types.ModuleType)):
        entry["repr"] = getattr(v, "__qualname__", getattr(v, "__name__", t.__name__))
    elif hasattr(v, "__dict__"):
        entry["attrs"] = [[k, _ref(x, heap, order)] for k, x in list(vars(v).items())[:_MAX_ITEMS]]
    else:
        r = repr(v)
        entry["repr"] = r[:77] + "..." if len(r) > 80 else r
    return oid

def _visible(name, value):
    # 組み込みや import したモジュール、内部の名前は図に出さない
    if name.startswith("__"):
        return False
    if isinstance(value, types.ModuleType):
        return False
    return True

def _snapshot(frame, event, arg, out_len):
    # 出力は溜められているので、ここで流して「この時点までの出力」を正しく測る
    sys.stdout.flush()
    heap, order = {}, []
    frames = []
    f = frame
    while f is not None and f.f_code.co_filename == USER_FILE:
        names = [[k, _ref(v, heap, order)] for k, v in list(f.f_locals.items()) if _visible(k, v)]
        fname = f.f_code.co_name
        frames.append({"name": "<module>" if fname == "<module>" else fname, "line": f.f_lineno, "locals": names})
        f = f.f_back
    frames.reverse()
    ret = str(_ref(arg, heap, order)) if event == "return" and frame.f_code.co_name != "<module>" else None
    # JSON にしやすいよう、id は文字列にする(JS の数値では大きな id が丸まるため)
    return {
        "event": event,
        "line": frame.f_lineno,
        "frames": [{**fr, "locals": [[k, str(i)] for k, i in fr["locals"]]} for fr in frames],
        "heap": {str(i): _conv(heap[i]) for i in order},
        # JS のオブジェクトは数字のキーを小さい順に並べ替えるので、出てきた順を別に持つ
        "order": [str(i) for i in order],
        "ret": ret,
        "stdoutLen": out_len(),
    }

def _conv(e):
    e = dict(e)
    if "items" in e:
        e["items"] = [str(i) for i in e["items"]]
    if "pairs" in e:
        e["pairs"] = [[str(k), str(v)] for k, v in e["pairs"]]
    if "attrs" in e:
        e["attrs"] = [[k, str(v)] for k, v in e["attrs"]]
    return e

def run_traced(code, max_steps, max_trace, out_len):
    """code を実行し、各行の記録を _state に貯める。例外はそのまま投げる(呼び出し側で整える)"""
    _state["steps"] = 0
    _state["trace"] = []
    _state["traceTruncated"] = False
    trace = _state["trace"]

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != USER_FILE:
            return None  # 標準ライブラリの中は追わない
        if event in ("line", "return"):
            _state["steps"] += 1
            if _state["steps"] > max_steps:
                raise StepLimit()
            if len(trace) < max_trace:
                trace.append(_snapshot(frame, event, arg, out_len))
            else:
                _state["traceTruncated"] = True
        return tracer

    g = {"__name__": "__main__", "__builtins__": __builtins__}
    compiled = compile(code, USER_FILE, "exec")
    sys.settrace(tracer)
    try:
        exec(compiled, g)
    finally:
        sys.settrace(None)

def _user_line(tb):
    line = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == USER_FILE:
            line = tb.tb_lineno
        tb = tb.tb_next
    return line

def run_entry(code, max_steps, max_trace, out_len, app_json=None):
    """実行して、状態・エラー・記録を JSON 文字列で返す。app_json があれば ui の画面も返す"""
    status, err = "ok", None
    app = app_json is not None
    cur = json.loads(app_json) if app else {}
    # アプリでなくても毎回空にする(前の実行の部品や state を持ち越さないため)
    ui_begin(cur, app, first=True)
    try:
        reruns = 0
        while True:
            try:
                run_traced(code, max_steps, max_trace, out_len)
                break
            except _Rerun:
                # ui.rerun(): state を持ち越し、ボタンは押していない扱いで上から実行し直す
                reruns += 1
                if reruns > 3:
                    raise UIError("ui.rerun() で続けて 3 回より多く実行し直しました。ボタンを押したときの if の中だけで呼んでください")
                cur = {"inputs": cur.get("inputs"), "clicked": None, "state": ui_end()["state"]}
                ui_begin(cur, app)
        if app:
            _state["app"] = ui_end()
    except StepLimit:
        status = "step-limit"
    except KeyboardInterrupt:
        status = "interrupted"
    except SyntaxError as e:
        status = "error"
        err = {"type": type(e).__name__, "message": e.msg, "line": e.lineno}
    except BaseException as e:
        status = "error"
        err = {"type": type(e).__name__, "message": str(e), "line": _user_line(e.__traceback__)}
    if app and status != "ok":
        # 途中で止まっても、そこまでに出した部品は見せる。state は持ち越さない(壊れた値を残さないため)
        _state["app"] = {"elements": _ctx.elements, "state": json.loads(app_json).get("state")}
    elif not app:
        _state["app"] = None
    try:
        sys.stdout.flush()
        sys.stderr.flush()
    except BaseException:
        pass
    _state["status"] = status
    _state["error"] = err
    return state_json()

def state_json():
    import json
    return json.dumps(_state, ensure_ascii=False)

_state = {"steps": 0, "trace": [], "traceTruncated": False}
`;
