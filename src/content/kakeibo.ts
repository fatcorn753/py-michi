// 作品コース「家計簿アプリ」。ui で画面を作り、入力とボタンで動くアプリを少しずつ育てる。
// 採点は、操作(入力・ボタン)をなぞった後の画面を参照解と比べる
import type { Course, Unit } from './types';
import { L, r, src } from './util';

const SCREEN: Unit = {
  id: 'screen', title: '画面に出す',
  summary: 'print の代わりに ui を使い、見出し・文字・目立つ数字を画面に並べます。',
  kcs: ['ui-out'],
  lessons: [{
    id: 'l1', title: 'ui.title・ui.write・ui.metric',
    steps: [
      {
        kind: 'read', title: 'print ではなく ui で出す',
        body: L(
          '- このコースでは、入力欄やボタンのある家計簿アプリを作ります。',
          '- `import ui` で、画面を組み立てる道具 `ui` を使えるようにします。',
          '- `ui.title("…")` は大きな見出し、`ui.write(…)` は文字を出します。`ui.write` は print と同じく、複数渡すと空白でつなぎます。',
          '- `ui.metric("合計", 1250)` は、合計のような目立つ数字を 1 つ出します。',
          '- 画面には、プログラムが ui を呼んだ順に、上から部品が並びます。',
          '',
          '下の例題は、そのままアプリとして動きます。',
        ),
        example: src(r`
          import ui
          # 1. 見出しを出す
          ui.title("家計簿")
          # 2. 文字を出す(複数渡すと空白でつなぐ)
          ui.write("今月の記録:", 3, "件")
          # 3. 目立つ数字を出す
          ui.metric("合計", 1250)
        `),
      },
      {
        kind: 'problem', problem: {
          id: 'screen-c1', type: 'choice', kcs: ['ui-out'],
          prompt: 'このアプリの画面で、いちばん上に出るのはどれですか。',
          code: src(r`
            import ui
            ui.write("食費をまとめます")
            ui.title("家計簿")
            ui.metric("合計", 900)
          `),
          choices: [
            { text: '「家計簿」の見出し', why: '見出しでも、先に上へ来るわけではありません。部品は呼んだ順に上から並びます。' },
            { text: '「食費をまとめます」の文字', why: 'そのとおりです。ui は呼んだ順に上から部品を並べます。見出しを上にしたければ、先に ui.title を呼びます。' },
            { text: '「合計」の数字', why: 'metric も、呼んだ順の位置に出ます。最後に呼んでいるので、いちばん下です。' },
          ],
          answer: 1,
        },
      },
      {
        kind: 'problem', problem: {
          id: 'screen-f1', type: 'fill', kcs: ['ui-out'],
          prompt: '「家計簿」を大きな見出しとして出します。空欄を埋めてください。',
          code: src(r`
            import ui
            ui.___("家計簿")
            ui.write("今日の出費を記録します")
          `),
          answers: ['title'],
          tests: [{ actions: [] }],
        },
      },
      {
        kind: 'problem', problem: {
          id: 'screen-w1', type: 'write', kcs: ['ui-out', 'for'],
          prompt: 'リスト `prices` の金額を `1 件目: 120 円` の形で 1 行ずつ画面に出し、最後に `ui.metric` で「合計」を出してください(値は金額の合計の数)。',
          starter: src(r`
            import ui
            prices = [120, 450, 80]
            ui.title("家計簿")
            # ここに書く
          `),
          solution: src(r`
            import ui
            prices = [120, 450, 80]
            ui.title("家計簿")
            n = 0
            total = 0
            for p in prices:
                n += 1
                total += p
                ui.write(n, "件目:", p, "円")
            ui.metric("合計", total)
          `),
          tests: [{ actions: [] }, { actions: [], set: { prices: '[500, 30]' } }],
          hints: [
            '`ui.write(n, "件目:", p, "円")` のように渡すと、空白でつないで `1 件目: 120 円` になります。',
            '件数と合計は、for の前に 0 で用意して、くり返しの中で足していきます。合計は for を抜けた後で 1 回だけ出します。',
          ],
        },
      },
    ],
  }],
  check: [
    {
      id: 'screen-k1', type: 'choice', kcs: ['ui-out'],
      prompt: 'ui を使うアプリの中で `print("こんにちは")` を書くと、どこに出ますか。',
      choices: [
        { text: 'アプリの画面に、ui.write と同じように出る', why: 'アプリの画面に並ぶのは ui で出した部品だけです。' },
        { text: 'アプリの画面ではなく、その下の「print の出力」に出る', why: 'そのとおりです。print は確かめ用の出力に出ます。画面に見せたいものは ui で出します。' },
        { text: 'エラーになる', why: 'print は ui と一緒に使っても動きます。出る場所が違うだけです。' },
      ],
      answer: 1,
    },
    {
      id: 'screen-k2', type: 'fill', kcs: ['ui-out'],
      prompt: '金額の合計を、目立つ数字として「合計」の名前で出します。空欄を埋めてください。',
      code: src(r`
        import ui
        prices = [300, 120]
        total = 0
        for p in prices:
            total += p
        ui.___("合計", total)
      `),
      answers: ['metric'],
      tests: [{ actions: [] }, { actions: [], set: { prices: '[1000, 5, 25]' } }],
    },
  ],
};

const INPUT: Unit = {
  id: 'input', title: '入力とボタン',
  summary: '入力欄から値を受け取り、ボタンで動くアプリにします。触るたびにプログラムが上から実行し直されることを確かめます。',
  kcs: ['ui-input', 'rerun', 'button'],
  lessons: [
    {
      id: 'l1', title: '入力欄と実行し直し',
      steps: [
        {
          kind: 'read', title: 'text_input と number_input',
          body: L(
            '- `ui.text_input("品名")` は 1 行の入力欄を出し、いま入っている文字列を返します。',
            '- `ui.number_input("金額")` は数の入力欄を出し、いま入っている数を返します。',
            '- 入力欄の値を変えて Enter を押す(または欄を離れる)と、**プログラム全体が上から実行し直されます**。そのとき入力欄は、新しい値を返します。',
            '- つまり「入力されたら何かする」と書く必要はありません。「いまの値で画面を作る」と書けば、値が変わるたびに画面が作り直されます。',
            '',
            '下のアプリの入力欄に値を入れて、何回目の実行かが増えるのを確かめてください。',
          ),
          example: src(r`
            import ui
            ui.title("買い物メモ")
            # 1. 入力欄を出し、いま入っている値を受け取る
            name = ui.text_input("品名")
            price = ui.number_input("金額")
            # 2. 受け取った値で画面を作る(値が変わるたびに上から実行し直す)
            ui.write(name, "は", price, "円")
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'input-c1', type: 'choice', kcs: ['rerun'],
            prompt: '上の買い物メモで、「金額」を 180 に変えて Enter を押しました。何が起きますか。',
            choices: [
              { text: '最後の ui.write の行だけが、もう一度実行される', why: '一部の行だけを実行し直すことはしません。いつも上から全部です。' },
              { text: 'プログラムが上から実行し直され、number_input が 180 を返す', why: 'そのとおりです。毎回上から実行し、入力欄はそのときの値を返します。だから画面がいまの値で作り直されます。' },
              { text: '何も起きない。画面を変えるには、もう一度「実行」を押す', why: 'アプリの部品に触ると、自動で実行し直されます。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'input-w1', type: 'write', kcs: ['ui-input', 'rerun'],
            prompt: '「単価」と「個数」の数の入力欄を出し、その下に `合計: 360 円` の形で単価 × 個数を出してください。',
            starter: src(r`
              import ui
              ui.title("合計の計算")
              # ここに書く
            `),
            solution: src(r`
              import ui
              ui.title("合計の計算")
              price = ui.number_input("単価")
              count = ui.number_input("個数")
              ui.write("合計:", price * count, "円")
            `),
            tests: [
              { actions: [{ set: { 単価: 120, 個数: 3 } }] },
              { actions: [{ set: { 単価: 80 } }, { set: { 個数: 5 } }] },
            ],
            hints: [
              '`price = ui.number_input("単価")` で、入力欄を出して値を受け取ります。',
              '計算して出すのは、入力欄を出した後です。`ui.write("合計:", price * count, "円")`',
            ],
          },
        },
      ],
    },
    {
      id: 'l2', title: 'ボタン',
      steps: [
        {
          kind: 'read', title: 'ui.button は押した直後だけ True',
          body: L(
            '- `ui.button("記録")` はボタンを出します。ボタンを押すと、やはりプログラムが上から実行し直されます。',
            '- その実行でだけ、`ui.button("記録")` が `True` を返します。ほかの実行では `False` です。',
            '- なので `if ui.button("記録"):` の中に、押したときにしたいことを書きます。',
            '- 次に入力欄を変えると、また上から実行し直されます。そのときボタンは False なので、押したときに出した文字は消えます。',
          ),
          example: src(r`
            import ui
            ui.title("ボタンの練習")
            name = ui.text_input("名前")
            # 1. ボタンを出す。押した直後の実行でだけ True
            if ui.button("あいさつ"):
                # 2. 押したときだけここを通る
                ui.write("こんにちは", name, "さん")
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'input-f1', type: 'fill', kcs: ['button'],
            prompt: '「記録」ボタンを押したときだけ、記録したことを表示します。空欄を埋めてください。',
            code: src(r`
              import ui
              item = ui.text_input("品名")
              if ui.___("記録"):
                  ui.write(item, "を記録しました")
            `),
            answers: ['button'],
            tests: [{ actions: [{ set: { 品名: 'パン' } }, { click: '記録' }] }, { actions: [{ set: { 品名: 'パン' } }] }],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'input-w2', type: 'write', kcs: ['button', 'ui-input'],
            prompt: '「記録」ボタンを足し、押したときだけ `パン を 180 円で記録しました` の形で表示してください。',
            starter: src(r`
              import ui
              ui.title("家計簿")
              item = ui.text_input("品名")
              price = ui.number_input("金額")
              # ここに書く
            `),
            solution: src(r`
              import ui
              ui.title("家計簿")
              item = ui.text_input("品名")
              price = ui.number_input("金額")
              if ui.button("記録"):
                  ui.write(item, "を", price, "円で記録しました")
            `),
            tests: [
              { actions: [{ set: { 品名: 'パン', 金額: 180 } }] },
              { actions: [{ set: { 品名: 'パン', 金額: 180 } }, { click: '記録' }] },
              { actions: [{ set: { 品名: '牛乳', 金額: 210 } }, { click: '記録' }] },
            ],
            hints: [
              '`if ui.button("記録"):` の中に、押したときに出す文字を書きます。',
              '`ui.write(item, "を", price, "円で記録しました")` のように渡すと、空白でつながります。',
            ],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'input-c2', type: 'choice', kcs: ['button', 'rerun'],
            prompt: '上の家計簿で「記録」を押すと「パン を 180 円で記録しました」と出ました。続けて「金額」を 200 に変えて Enter を押すと、どうなりますか。',
            choices: [
              { text: '「パン を 200 円で記録しました」に変わる', why: '入力欄を変えた実行では、ボタンは押されていないので False です。if の中は通りません。' },
              { text: '「パン を 180 円で記録しました」のまま残る', why: '画面は毎回上から作り直します。前の実行で出したものは残りません。' },
              { text: '記録しましたの文字が消える', why: 'そのとおりです。ボタンが True なのは押した直後の 1 回だけです。記録を残し続けるには、実行をまたいで値を持ち越す仕組みが要ります(続きの単元で扱います)。' },
            ],
            answer: 2,
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'input-k1', type: 'choice', kcs: ['ui-input'],
      prompt: 'このアプリを動かすとどうなりますか。',
      code: src(r`
        import ui
        a = ui.number_input("金額")
        b = ui.number_input("金額")
        ui.write(a + b)
      `),
      choices: [
        { text: '入力欄が 2 つ出て、合計が出る', why: '同じラベルの部品が 2 つあると、どちらに入力したのか区別できません。' },
        { text: '入力欄が 1 つにまとまる', why: '部品はまとめられません。区別できないのでエラーにします。' },
        { text: '同じ名前の部品が 2 つあるというエラーになる', why: 'そのとおりです。ラベルを変えるか、`key="金額2"` のように key を付けて区別します。' },
      ],
      answer: 2,
    },
    {
      id: 'input-k2', type: 'write', kcs: ['button', 'ui-input'],
      prompt: '割り勘アプリです。「金額」と「人数」の数の入力欄と「計算」ボタンを出し、押したときだけ `1 人あたり 400 円` の形で表示してください(1 円未満は切り捨て、`//` を使う)。',
      starter: src(r`
        import ui
        ui.title("割り勘")
        # ここに書く
      `),
      solution: src(r`
        import ui
        ui.title("割り勘")
        total = ui.number_input("金額")
        people = ui.number_input("人数", 1)
        if ui.button("計算"):
            ui.write("1 人あたり", total // people, "円")
      `),
      tests: [
        { actions: [{ set: { 金額: 1200, 人数: 3 } }] },
        { actions: [{ set: { 金額: 1200, 人数: 3 } }, { click: '計算' }] },
        { actions: [{ set: { 金額: 1000, 人数: 3 } }, { click: '計算' }] },
      ],
      hints: [
        '`people = ui.number_input("人数", 1)` のように 2 つ目に初期値を渡せます。0 のままだと割り算でエラーになります。',
        '割り算は `if ui.button("計算"):` の中で行います。',
      ],
    },
  ],
};

export const KAKEIBO: Course = {
  id: 'kakeibo',
  title: '作品: 家計簿アプリ',
  summary: '入力欄とボタンのある家計簿アプリを、画面を見ながら少しずつ作ります。本編の「条件分岐」と「くり返し」まで終えると取り組めます。',
  units: [SCREEN, INPUT],
};
