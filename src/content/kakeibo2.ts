// 家計簿アプリの後半。記録をためる・一覧と削除・集計とグラフ・保存・機能を足す
import type { Unit } from './types';
import { L, r, src } from './util';

/** 削除と集計の問題で使う、最初から入っている記録 */
const ROWS = '[{"品名": "パン", "金額": 180}, {"品名": "牛乳", "金額": 220}, {"品名": "卵", "金額": 250}]';

export const STATE: Unit = {
  id: 'state', title: 'データをためる',
  summary: 'ふつうの変数は実行し直すたびに作り直されます。ui.state に入れて、記録をためられるようにします。',
  kcs: ['state'],
  lessons: [{
    id: 'l1', title: 'ui.state',
    steps: [
      {
        kind: 'read', title: '実行をまたいで残る ui.state',
        body: L(
          '- アプリは触るたびに上から実行し直すので、`items = []` と書くと、毎回空のリストに戻ります。',
          '- 実行をまたいで残したい値は `ui.state` に入れます。`ui.state` は辞書で、`ui.state["items"]` のように名前(キー)を付けて値を入れます。',
          '- 最初の 1 回だけ用意するには、`if "items" not in ui.state:` で「まだ入っていないか」を調べてから入れます。',
          '- 入れられるのは数・文字列・True/False・None と、それを入れたリストと辞書です。',
          '',
          '下のアプリで「追加」を何回か押して、記録がたまるのを確かめてください。「最初から」を押すと ui.state も空に戻ります。',
        ),
        example: src(r`
          import ui
          # 1. 最初の実行のときだけ、空のリストを用意する
          if "items" not in ui.state:
              ui.state["items"] = []
          items = ui.state["items"]
          ui.title("家計簿")
          name = ui.text_input("品名")
          # 2. 押したら ui.state のリストに足す(次の実行にも残る)
          if ui.button("追加"):
              items.append(name)
          # 3. たまった記録を出す
          for x in items:
              ui.write("・", x)
          ui.write(len(items), "件")
        `),
      },
      {
        kind: 'problem', problem: {
          id: 'state-c1', type: 'choice', kcs: ['state', 'rerun'],
          prompt: 'このアプリで「追加」を 3 回押しました。最後に何が表示されますか。',
          code: src(r`
            import ui
            items = []
            if ui.button("追加"):
                items.append("パン")
            ui.write(len(items), "件")
          `),
          choices: [
            { text: '3 件', why: '押すたびに上から実行し直すので、`items = []` で毎回空に戻ります。' },
            { text: '1 件', why: 'そのとおりです。毎回空のリストから始まり、押した直後の実行で 1 つ足すだけです。ためるには ui.state に入れます。' },
            { text: '0 件', why: 'ボタンを押した直後の実行では if の中を通るので、1 つは足されます。' },
          ],
          answer: 1,
        },
      },
      {
        kind: 'problem', problem: {
          id: 'state-f1', type: 'fill', kcs: ['state'],
          prompt: '押した回数を数えるアプリです。最初の 1 回だけ回数を用意します。空欄を埋めてください。',
          code: src(r`
            import ui
            if "count" not in ui.state:
                ui.state["count"] = ___
            if ui.button("+1"):
                ui.state["count"] += 1
            ui.metric("押した回数", ui.state["count"])
          `),
          answers: ['0'],
          tests: [{ actions: [] }, { actions: [{ click: '+1' }, { click: '+1' }] }],
        },
      },
      {
        kind: 'problem', problem: {
          id: 'state-w1', type: 'write', kcs: ['state', 'button'],
          prompt: '「追加」ボタンを押すたびに金額を ui.state のリストにためて、その下に `2 件` の形で件数を、`ui.metric` で「合計」を出してください。',
          starter: src(r`
            import ui
            ui.title("家計簿")
            price = ui.number_input("金額")
            # ここに書く
          `),
          solution: src(r`
            import ui
            ui.title("家計簿")
            price = ui.number_input("金額")
            if "prices" not in ui.state:
                ui.state["prices"] = []
            prices = ui.state["prices"]
            if ui.button("追加"):
                prices.append(price)
            ui.write(len(prices), "件")
            ui.metric("合計", sum(prices))
          `),
          tests: [
            { actions: [] },
            { actions: [{ set: { 金額: 180 } }, { click: '追加' }, { set: { 金額: 220 } }, { click: '追加' }] },
            { actions: [{ set: { 金額: 500 } }, { click: '追加' }, { click: '追加' }] },
          ],
          hints: [
            '最初に `if "prices" not in ui.state:` で空のリストを用意します。',
            '`if ui.button("追加"):` の中で append します。件数は `len(prices)`、合計は `sum(prices)` です。',
          ],
        },
      },
    ],
  }],
  check: [
    {
      id: 'state-k1', type: 'choice', kcs: ['state'],
      prompt: '`if "items" not in ui.state:` を付けずに、先頭に `ui.state["items"] = []` とだけ書きました。「追加」を何回押しても記録が 1 件より増えません。なぜですか。',
      choices: [
        { text: 'ui.state は、ボタンを押したときには残らないから', why: 'ui.state は、どの操作の後にも残ります。' },
        { text: '毎回の実行で、ui.state["items"] に空のリストを入れ直しているから', why: 'そのとおりです。ui.state が残っていても、先頭で毎回空にしてしまいます。最初の 1 回だけ入れるように if で調べます。' },
        { text: 'append は ui.state の中のリストには使えないから', why: 'ui.state の中のリストにも append は使えます。' },
      ],
      answer: 1,
    },
    {
      id: 'state-k2', type: 'write', kcs: ['state', 'button'],
      prompt: '「+1」と「リセット」の 2 つのボタンを出し、`ui.metric` で「回数」を出してください。+1 で 1 増え、リセットで 0 に戻ります。',
      starter: src(r`
        import ui
        ui.title("カウンター")
        # ここに書く
      `),
      solution: src(r`
        import ui
        ui.title("カウンター")
        if "n" not in ui.state:
            ui.state["n"] = 0
        if ui.button("+1"):
            ui.state["n"] += 1
        if ui.button("リセット"):
            ui.state["n"] = 0
        ui.metric("回数", ui.state["n"])
      `),
      tests: [
        { actions: [{ click: '+1' }, { click: '+1' }, { click: '+1' }] },
        { actions: [{ click: '+1' }, { click: '+1' }, { click: 'リセット' }, { click: '+1' }] },
      ],
      hints: ['回数は `ui.state["n"]` のように ui.state に入れます。最初の 1 回だけ 0 を入れます。', 'ボタンは 2 つとも、metric より前に出します。'],
    },
  ],
};

export const LIST: Unit = {
  id: 'rows', title: '一覧と削除',
  summary: '1 件の記録を辞書にまとめて表にします。行ごとの削除ボタンを付け、消したらすぐ作り直します。',
  kcs: ['dict', 'delete'],
  lessons: [
    {
      id: 'l1', title: '辞書で 1 件をまとめる',
      steps: [
        {
          kind: 'read', title: '辞書と ui.table',
          body: L(
            '- 品名と金額のように、1 件の記録には値がいくつかあります。辞書 `{"品名": "パン", "金額": 180}` にまとめると扱いやすくなります。',
            '- 辞書は `x["品名"]` のようにキーで値を読みます。',
            '- 辞書のリストを `ui.table(items)` に渡すと、キーが見出しの表になります。',
            '- 品名が空のまま「追加」を押したときは足さないように、`and name != ""` を付けます。',
          ),
          example: src(r`
            import ui
            if "items" not in ui.state:
                ui.state["items"] = []
            items = ui.state["items"]
            ui.title("家計簿")
            name = ui.text_input("品名")
            price = ui.number_input("金額")
            # 1. 1 件を辞書にまとめて足す(品名が空なら足さない)
            if ui.button("追加") and name != "":
                items.append({"品名": name, "金額": price})
            # 2. 辞書のリストは、キーが見出しの表になる
            ui.table(items)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'rows-p1', type: 'predict', kcs: ['dict'],
            prompt: '出力を予測してください。',
            params: { n: [100, 300] },
            code: src(r`
              x = {"品名": "パン", "金額": $n}
              print(x["品名"], x["金額"] * 2)
              x["金額"] = 50
              print(x)
            `),
            explain: '`x["金額"]` で読み、`x["金額"] = 50` で書き換えます。辞書を print すると、キーと値の組がそのまま出ます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'rows-w1', type: 'write', kcs: ['dict', 'state'],
            prompt: '「追加」を押したら `{"品名": …, "金額": …}` の辞書を ui.state["items"] に足し、`ui.table` で表に出してください。品名が空のときは足しません。',
            starter: src(r`
              import ui
              if "items" not in ui.state:
                  ui.state["items"] = []
              items = ui.state["items"]
              ui.title("家計簿")
              name = ui.text_input("品名")
              price = ui.number_input("金額")
              # ここに書く
            `),
            solution: src(r`
              import ui
              if "items" not in ui.state:
                  ui.state["items"] = []
              items = ui.state["items"]
              ui.title("家計簿")
              name = ui.text_input("品名")
              price = ui.number_input("金額")
              if ui.button("追加") and name != "":
                  items.append({"品名": name, "金額": price})
              ui.table(items)
            `),
            tests: [
              { actions: [{ set: { 品名: 'パン', 金額: 180 } }, { click: '追加' }, { set: { 品名: '牛乳', 金額: 220 } }, { click: '追加' }] },
              { actions: [{ set: { 金額: 300 } }, { click: '追加' }, { set: { 品名: '卵' } }, { click: '追加' }] },
            ],
            hints: ['`if ui.button("追加") and name != "":` の中で append します。', '`ui.table(items)` は、ボタンの処理の後に書きます。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: '削除と ui.rerun',
      steps: [
        {
          kind: 'read', title: '行ごとの削除ボタン',
          body: L(
            '- 行ごとに「削除」ボタンを出すと、同じラベルのボタンが並びます。`key="del" + str(i)` のように、行ごとに違う key を付けて区別します(`str(i)` は数を文字列にします)。',
            '- `items.pop(i)` で、i 番目の記録をリストから取り除きます。',
            '- 消した時点で、上の行はもう画面に出ています。`ui.rerun()` を呼ぶと、いまの実行をやめて、すぐ上から作り直します。',
          ),
          example: src(r`
            import ui
            if "items" not in ui.state:
                ui.state["items"] = [{"品名": "パン", "金額": 180}, {"品名": "牛乳", "金額": 220}, {"品名": "卵", "金額": 250}]
            items = ui.state["items"]
            ui.title("記録の一覧")
            for i in range(len(items)):
                ui.write(items[i]["品名"], items[i]["金額"], "円")
                # 1. 行ごとに違う key を付ける
                if ui.button("削除", key="del" + str(i)):
                    # 2. 消して、すぐ上から作り直す
                    items.pop(i)
                    ui.rerun()
            ui.write("全部で", len(items), "件")
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'rows-c1', type: 'choice', kcs: ['delete'],
            prompt: '上の例題から `ui.rerun()` の行を消し、3 件のうち 1 件目(パン)の「削除」を押しました。何が起きますか。',
            choices: [
              { text: '何も困らない。パンが消えた一覧が出る', why: 'for の回数は、消す前の len(items) = 3 で決まっています。2 件に減った後も i = 2 まで回ります。' },
              { text: 'IndexError になる', why: 'そのとおりです。range(3) のまま回るので、2 件しかないリストの items[2] を読もうとします。消したらすぐ ui.rerun() で作り直します。' },
              { text: 'パンが消えずに残る', why: 'pop(0) でリストからは消えています。困るのは、その後も同じ実行が続くことです。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'rows-w2', type: 'write', kcs: ['delete', 'button'],
            prompt: '各行に「削除」ボタン(key は `"del" + str(i)`)を付け、押した行を消してすぐ作り直してください。',
            starter: src(r`
              import ui
              if "items" not in ui.state:
                  ui.state["items"] = ${ROWS}
              items = ui.state["items"]
              ui.title("記録の一覧")
              for i in range(len(items)):
                  ui.write(items[i]["品名"], items[i]["金額"], "円")
                  # ここに書く
              ui.metric("合計", sum(x["金額"] for x in items))
            `),
            solution: src(r`
              import ui
              if "items" not in ui.state:
                  ui.state["items"] = ${ROWS}
              items = ui.state["items"]
              ui.title("記録の一覧")
              for i in range(len(items)):
                  ui.write(items[i]["品名"], items[i]["金額"], "円")
                  if ui.button("削除", key="del" + str(i)):
                      items.pop(i)
                      ui.rerun()
              ui.metric("合計", sum(x["金額"] for x in items))
            `),
            tests: [
              { actions: [{ click: 'del0' }] },
              { actions: [{ click: 'del2' }, { click: 'del0' }] },
              { actions: [{ click: 'del1' }, { click: 'del1' }, { click: 'del0' }] },
            ],
            hints: [
              '`if ui.button("削除", key="del" + str(i)):` を for の中に書きます。',
              '中では `items.pop(i)` で消し、`ui.rerun()` で作り直します。',
            ],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'rows-k1', type: 'choice', kcs: ['delete', 'ui-input'],
      prompt: '行ごとに `ui.button("削除")` と、key を付けずに書きました。記録が 2 件あると、どうなりますか。',
      choices: [
        { text: '2 つのボタンが出て、どちらも正しく動く', why: '同じラベルのボタンは区別できません。' },
        { text: '「削除」という部品が 2 つあるというエラーになる', why: 'そのとおりです。行ごとに違う key を付けて区別します。' },
        { text: 'ボタンは 1 つだけ出る', why: '部品はまとめられません。区別できないのでエラーにします。' },
      ],
      answer: 1,
    },
    {
      id: 'rows-k2', type: 'write', kcs: ['state', 'delete'],
      prompt: '表の上に「全部消す」ボタンを足し、押したら記録をすべて消してください。表より前で消すので、ui.rerun() は要りません(リストを空にするのは `items.clear()`)。',
      starter: src(r`
        import ui
        if "items" not in ui.state:
            ui.state["items"] = []
        items = ui.state["items"]
        name = ui.text_input("品名")
        price = ui.number_input("金額")
        if ui.button("追加") and name != "":
            items.append({"品名": name, "金額": price})
        # ここに書く
        ui.table(items)
        ui.write(len(items), "件")
      `),
      solution: src(r`
        import ui
        if "items" not in ui.state:
            ui.state["items"] = []
        items = ui.state["items"]
        name = ui.text_input("品名")
        price = ui.number_input("金額")
        if ui.button("追加") and name != "":
            items.append({"品名": name, "金額": price})
        if ui.button("全部消す"):
            items.clear()
        ui.table(items)
        ui.write(len(items), "件")
      `),
      tests: [
        { actions: [{ set: { 品名: 'パン', 金額: 180 } }, { click: '追加' }, { click: '追加' }, { click: '全部消す' }] },
        { actions: [{ set: { 品名: 'パン', 金額: 180 } }, { click: '追加' }, { click: '全部消す' }, { set: { 品名: '卵', 金額: 250 } }, { click: '追加' }] },
      ],
      hints: ['`if ui.button("全部消す"):` の中で `items.clear()` を呼びます。', '`items = []` と書くと、名前 items が新しいリストを指すだけで、ui.state の中のリストは変わりません。'],
    },
  ],
};

export const SUM: Unit = {
  id: 'sum', title: '集計とグラフ',
  summary: '記録に分類を付け、分類ごとの合計を辞書で数えて、棒グラフにします。',
  kcs: ['chart'],
  lessons: [{
    id: 'l1', title: '分類ごとの合計',
    steps: [
      {
        kind: 'read', title: 'totals[k] = totals.get(k, 0) + 金額',
        body: L(
          '- `ui.selectbox("分類", ["食費", "日用品"])` は、選択肢から 1 つ選ぶ欄です。選ばれている文字列を返します。',
          '- 分類ごとの合計は、空の辞書 `totals = {}` から始めて、記録を 1 件ずつ足していきます。',
          '- `totals.get(k, 0)` は、キー k があればその値、なければ 0 を返します。だから `totals[k] = totals.get(k, 0) + 金額` で、初めての分類も足せます。',
          '- `ui.bar_chart(totals)` で、{分類: 合計} の辞書を棒グラフにします。',
        ),
        example: src(r`
          import ui
          if "items" not in ui.state:
              ui.state["items"] = [{"分類": "食費", "金額": 180}, {"分類": "日用品", "金額": 400}, {"分類": "食費", "金額": 220}]
          items = ui.state["items"]
          ui.title("分類ごとの合計")
          kind = ui.selectbox("分類", ["食費", "日用品", "その他"])
          price = ui.number_input("金額")
          if ui.button("追加"):
              items.append({"分類": kind, "金額": price})
          # 1. 空の辞書から始めて、分類ごとに足す
          totals = {}
          for x in items:
              totals[x["分類"]] = totals.get(x["分類"], 0) + x["金額"]
          # 2. 辞書をそのまま棒グラフにする
          ui.bar_chart(totals)
        `),
      },
      {
        kind: 'problem', problem: {
          id: 'sum-p1', type: 'predict', kcs: ['chart', 'dict'],
          prompt: '出力を予測してください。',
          params: { a: [100, 400] },
          code: src(r`
            items = [("食費", $a), ("日用品", 300), ("食費", 50)]
            totals = {}
            for k, v in items:
                totals[k] = totals.get(k, 0) + v
            print(totals)
            print(totals.get("その他", 0))
          `),
          explain: '辞書は、キーを初めて入れた順を覚えています。食費は 2 回足され、その他は一度も出てこないので get の 0 が返ります。',
        },
      },
      {
        kind: 'problem', problem: {
          id: 'sum-w1', type: 'write', kcs: ['chart', 'state'],
          prompt: '分類ごとの金額の合計を辞書 totals に数え、`ui.bar_chart` で棒グラフにしてください。その下に `ui.metric` で全体の「合計」も出します。',
          starter: src(r`
            import ui
            if "items" not in ui.state:
                ui.state["items"] = [{"分類": "食費", "金額": 180}, {"分類": "日用品", "金額": 400}]
            items = ui.state["items"]
            kind = ui.selectbox("分類", ["食費", "日用品", "その他"])
            price = ui.number_input("金額")
            if ui.button("追加"):
                items.append({"分類": kind, "金額": price})
            # ここに書く
          `),
          solution: src(r`
            import ui
            if "items" not in ui.state:
                ui.state["items"] = [{"分類": "食費", "金額": 180}, {"分類": "日用品", "金額": 400}]
            items = ui.state["items"]
            kind = ui.selectbox("分類", ["食費", "日用品", "その他"])
            price = ui.number_input("金額")
            if ui.button("追加"):
                items.append({"分類": kind, "金額": price})
            totals = {}
            for x in items:
                totals[x["分類"]] = totals.get(x["分類"], 0) + x["金額"]
            ui.bar_chart(totals)
            ui.metric("合計", sum(totals.values()))
          `),
          tests: [
            { actions: [] },
            { actions: [{ set: { 金額: 300 } }, { click: '追加' }] },
            { actions: [{ set: { 分類: 'その他', 金額: 800 } }, { click: '追加' }, { set: { 分類: '日用品', 金額: 100 } }, { click: '追加' }] },
          ],
          hints: [
            '`totals = {}` のあと、`for x in items:` の中で `totals[x["分類"]] = totals.get(x["分類"], 0) + x["金額"]` とします。',
            '全体の合計は `sum(totals.values())` か、`sum(x["金額"] for x in items)` で求まります。',
          ],
        },
      },
    ],
  }],
  check: [
    {
      id: 'sum-k1', type: 'choice', kcs: ['chart'],
      prompt: '`totals[k] = totals.get(k, 0) + v` の代わりに `totals[k] += v` と書きました。最初の記録で何が起きますか。',
      choices: [
        { text: 'totals[k] が v になる', why: '`+=` はまず今の値を読みます。まだ k がないので読めません。' },
        { text: 'KeyError になる', why: 'そのとおりです。初めての分類では、get(k, 0) で「ないときは 0」として足します。' },
        { text: 'totals[k] が 0 になる', why: 'ないキーを [] で読むと、0 ではなくエラーになります。' },
      ],
      answer: 1,
    },
    {
      id: 'sum-k2', type: 'fill', kcs: ['chart'],
      prompt: '分類ごとの回数を数えて棒グラフにします。空欄を埋めてください。',
      code: src(r`
        import ui
        kinds = ["食費", "日用品", "食費"]
        counts = {}
        for k in kinds:
            counts[k] = counts.get(k, ___) + 1
        ui.___(counts)
      `),
      answers: ['0', 'bar_chart'],
      tests: [{ actions: [] }],
    },
  ],
};

/** 保存の単元で使う、保存しない家計簿(学習者が保存と読み込みを足す) */
const SAVE_BODY = r`
ui.title("家計簿")
name = ui.text_input("品名")
price = ui.number_input("金額")
if ui.button("追加") and name != "":
    items.append({"品名": name, "金額": price})`;

export const SAVE: Unit = {
  id: 'save', title: '保存',
  summary: 'ui.state はアプリを開き直すと消えます。記録をファイルに書き、開き直したときに読み戻します。',
  kcs: ['file'],
  lessons: [{
    id: 'l1', title: 'json でファイルに書く',
    steps: [
      {
        kind: 'read', title: 'json.dump と json.load',
        body: L(
          '- 「最初から」を押すと、アプリを開き直したのと同じで、ui.state は空に戻ります。記録を残すにはファイルに書きます。',
          '- `import json` の `json.dump(items, f, ensure_ascii=False)` は、リストや辞書を文字にしてファイル f に書きます。`json.load(f)` で元のリストや辞書に戻します。',
          '- `with open("kakeibo.json", "w") as f:` は書くためにファイルを開きます(中身は書き直されます)。`"w"` を付けなければ読むために開きます。',
          '- `os.path.exists("kakeibo.json")` で、ファイルがもうあるかを調べます(`import os` が要ります)。',
          '- 読み込むのは、ui.state に記録がまだないとき(開いた直後)だけです。書くのは、記録を変えたときです。',
          '',
          '下のアプリで記録を足してから「最初から」を押すと、記録が戻ってきます。「保存も消す」でファイルも消せます。このサイトでは、ページを開き直すとファイルも消えます。',
        ),
        example: src(r`
          import ui, json, os
          FILE = "kakeibo.json"
          # 1. 開いた直後だけ、ファイルがあれば読み込む
          if "items" not in ui.state:
              if os.path.exists(FILE):
                  with open(FILE) as f:
                      ui.state["items"] = json.load(f)
              else:
                  ui.state["items"] = []
          items = ui.state["items"]
          ui.title("家計簿")
          name = ui.text_input("品名")
          price = ui.number_input("金額")
          if ui.button("追加") and name != "":
              items.append({"品名": name, "金額": price})
              # 2. 記録を変えたら、ファイルに書く
              with open(FILE, "w") as f:
                  json.dump(items, f, ensure_ascii=False)
          ui.table(items)
        `),
      },
      {
        kind: 'problem', problem: {
          id: 'save-p1', type: 'predict', kcs: ['file'],
          prompt: '出力を予測してください。',
          params: { n: [2, 7] },
          code: src(r`
            import json
            s = json.dumps({"a": [1, $n]})
            print(type(s).__name__, s)
            d = json.loads(s)
            print(d["a"][1] + 1)
          `),
          explain: 'json.dumps は文字列にし、json.loads は文字列から元の辞書に戻します(ファイル版が dump と load です)。文字列にしたものは、ただの文字の並びです。',
        },
      },
      {
        kind: 'problem', problem: {
          id: 'save-c1', type: 'choice', kcs: ['file'],
          prompt: '「追加」のたびに `with open(FILE, "w") as f:` で開いて、新しい 1 件だけを json.dump しました。開き直すと何が残っていますか。',
          choices: [
            { text: 'これまでに足した全部の記録', why: '"w" で開くと、ファイルの中身は最初から書き直されます。' },
            { text: '最後に足した 1 件だけ', why: 'そのとおりです。"w" は前の中身を消して書きます。だから毎回、items 全体を書きます。' },
            { text: '何も残らない', why: '最後に書いた中身は残ります。' },
          ],
          answer: 1,
        },
      },
      {
        kind: 'problem', problem: {
          id: 'save-w1', type: 'write', kcs: ['file', 'state'],
          prompt: '記録を "kakeibo.json" に保存し、開き直したときに読み戻すようにしてください。開いた直後にファイルがあれば読み込み、なければ空のリストから始めます。「追加」したらファイルに書きます。',
          starter: src(r`
            import ui, json, os
            FILE = "kakeibo.json"
            if "items" not in ui.state:
                ui.state["items"] = []
            items = ui.state["items"]
          `) + src(SAVE_BODY) + '    # ここで保存する\nui.table(items)\n',
          solution: src(r`
            import ui, json, os
            FILE = "kakeibo.json"
            if "items" not in ui.state:
                if os.path.exists(FILE):
                    with open(FILE) as f:
                        ui.state["items"] = json.load(f)
                else:
                    ui.state["items"] = []
            items = ui.state["items"]
          `) + src(SAVE_BODY) + L(
            '    with open(FILE, "w") as f:',
            '        json.dump(items, f, ensure_ascii=False)',
            'ui.table(items)',
            '',
          ),
          tests: [
            { actions: [{ set: { 品名: 'パン', 金額: 180 } }, { click: '追加' }, { restart: true }] },
            { actions: [{ set: { 品名: '牛乳', 金額: 220 } }, { click: '追加' }, { set: { 品名: '卵', 金額: 250 } }, { click: '追加' }, { restart: true }, { set: { 品名: '米', 金額: 900 } }, { click: '追加' }, { restart: true }] },
          ],
          hints: [
            '読み込みは `if "items" not in ui.state:` の中で、`os.path.exists(FILE)` で調べてから `json.load(f)` します。',
            '保存は「追加」の if の中で `with open(FILE, "w") as f:` と開き、`json.dump(items, f, ensure_ascii=False)` します。',
          ],
        },
      },
    ],
  }],
  check: [
    {
      id: 'save-k1', type: 'choice', kcs: ['file', 'state'],
      prompt: '記録をファイルに書くようにしましたが、「最初から」を押すと記録が空になります。いちばんありそうな原因はどれですか。',
      choices: [
        { text: 'ファイルに書いていない', why: '書けていても、読み戻さなければ表には出ません。もう 1 つの可能性を考えてみましょう。' },
        { text: '開いた直後にファイルを読み込まず、空のリストから始めている', why: 'そのとおりです。保存は「書く」と「開いたときに読む」の 2 つがそろって初めて役に立ちます。' },
        { text: 'ui.state に入れていない', why: 'ui.state は「最初から」で空に戻ります。開き直しても残るのはファイルだけです。' },
      ],
      answer: 1,
    },
    {
      id: 'save-k2', type: 'fill', kcs: ['file'],
      prompt: '記録をファイルに書く行と、読み戻す行です。空欄を埋めてください。',
      code: src(r`
        import ui, json, os
        if "items" not in ui.state:
            if os.path.exists("k.json"):
                with open("k.json") as f:
                    ui.state["items"] = json.___(f)
            else:
                ui.state["items"] = []
        items = ui.state["items"]
        name = ui.text_input("品名")
        if ui.button("追加"):
            items.append(name)
            with open("k.json", "w") as f:
                json.___(items, f, ensure_ascii=False)
        ui.write(len(items), "件:", ", ".join(items))
      `),
      answers: ['load', 'dump'],
      tests: [{ actions: [{ set: { 品名: 'パン' } }, { click: '追加' }, { restart: true }, { set: { 品名: '卵' } }, { click: '追加' }, { restart: true }] }],
    },
  ],
};

/** 機能を足す単元の土台(保存はしない、記録が 2 件入った家計簿) */
const BASE = r`
import ui
if "items" not in ui.state:
    ui.state["items"] = [{"品名": "パン", "金額": 180}, {"品名": "牛乳", "金額": 220}]
items = ui.state["items"]
ui.title("家計簿")
name = ui.text_input("品名")
price = ui.number_input("金額")
if ui.button("追加") and name != "":
    items.append({"品名": name, "金額": price})`;

export const EXTEND: Unit = {
  id: 'extend', title: '機能を足す',
  summary: '自分で考えた機能を、できあがった家計簿に足します。何を出すか・どこに置くか・何を覚えるかの順に決めます。',
  kcs: ['ui-input', 'state'],
  lessons: [{
    id: 'l1', title: '予算の機能を足す',
    steps: [
      {
        kind: 'read', title: '機能を足す手順',
        body: L(
          '- 新しい機能を足すときは、次の 3 つを順に決めると迷いません。',
          '  1. 画面に何を出すか(入力欄、ボタン、数字、文)',
          '  2. それを上から何番目に置くか(使う値は、使う前に用意されている必要があります)',
          '  3. 実行をまたいで覚える値があるか(あれば ui.state、開き直しても残すならファイル)',
          '- 例: 予算の機能なら、1. 「予算」の入力欄と「残り」の数字、2. 記録の合計を出した後、3. 入力欄の値は ui が覚えているので、ui.state は要りません。',
          '',
          'この単元を終えたら、「自由に書く」で「家計簿アプリ(画面あり)」の例を読み込み、自分の機能(月ごとの集計、品名で探す、平均を出す など)を足してみましょう。',
        ),
      },
      {
        kind: 'problem', problem: {
          id: 'extend-w1', type: 'write', kcs: ['ui-input', 'if'],
          prompt: '「予算」の数の入力欄(初期値 1000)を足し、`ui.metric` で「残り」(予算 − 合計)を出してください。残りが 0 より小さいときは、その下に `予算を 200 円こえています` の形で出します。',
          starter: src(BASE) + src(r`
            total = sum(x["金額"] for x in items)
            ui.table(items)
            # ここに書く
          `),
          solution: src(BASE) + src(r`
            total = sum(x["金額"] for x in items)
            ui.table(items)
            budget = ui.number_input("予算", 1000)
            left = budget - total
            ui.metric("残り", left)
            if left < 0:
                ui.write("予算を", -left, "円こえています")
          `),
          tests: [
            { actions: [] },
            { actions: [{ set: { 予算: 500 } }] },
            { actions: [{ set: { 品名: '米', 金額: 900 } }, { click: '追加' }] },
          ],
          hints: [
            '`budget = ui.number_input("予算", 1000)` で、初期値 1000 の入力欄になります。',
            'こえた金額は `-left`(または `total - budget`)です。`if left < 0:` の中で出します。',
          ],
        },
      },
    ],
  }],
  check: [
    {
      id: 'extend-k1', type: 'choice', kcs: ['state', 'ui-input'],
      prompt: '「品名で探す」機能を足します。入力欄に入れた文字を含む記録だけを表に出します。実行をまたいで覚える値として ui.state に入れる必要があるのはどれですか。',
      choices: [
        { text: '探す文字', why: '入力欄の値は ui が覚えていて、毎回の実行で返してくれます。' },
        { text: '絞り込んだ後の記録のリスト', why: '絞り込みは、毎回の実行で全部の記録から作り直せます。覚えておくと、記録を足したときにずれます。' },
        { text: 'どちらも要らない(記録そのものは、もう ui.state にある)', why: 'そのとおりです。毎回作り直せるものは覚えなくてよく、覚えるのは「記録」のような元のデータだけです。' },
      ],
      answer: 2,
    },
    {
      id: 'extend-k2', type: 'write', kcs: ['ui-input', 'for'],
      prompt: '「探す」の入力欄を足し、品名に入れた文字を含む記録だけを `ui.table` で出してください(空なら全部)。文字を含むかは `q in x["品名"]` で調べます。',
      starter: src(BASE) + src(r`
        # ここに書く(下の ui.table(items) は書き換えてよい)
        ui.table(items)
      `),
      solution: src(BASE) + src(r`
        q = ui.text_input("探す")
        found = []
        for x in items:
            if q in x["品名"]:
                found.append(x)
        ui.table(found)
      `),
      tests: [
        { actions: [{ set: { 探す: '牛' } }] },
        { actions: [{ set: { 品名: 'パン粉', 金額: 150 } }, { click: '追加' }, { set: { 探す: 'パン' } }] },
        { actions: [{ set: { 探す: 'ない' } }] },
      ],
      hints: ['`q = ui.text_input("探す")` で入力欄を出します。空の文字列 "" は、どんな文字列にも含まれます。', '`found = []` に、`if q in x["品名"]:` のときだけ append して、`ui.table(found)` します。'],
    },
  ],
};
