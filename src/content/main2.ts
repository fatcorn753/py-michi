// 本編 4〜6: リストと文字列・関数・名前とオブジェクト
import type { Unit } from './types';
import { L, r, src } from './util';

export const LIST: Unit = {
  id: 'list',
  title: 'リストと文字列',
  summary: '値を並べて持つリストと、文字の並びである文字列を扱います。添字は 0 から、終わりは含まない、を身に付けます。',
  kcs: ['list', 'slice', 'string'],
  lessons: [
    {
      id: 'l1', title: 'リストの添字と追加',
      steps: [
        {
          kind: 'read', title: 'リストは番号の付いた並び',
          body: L(
            '- `a = [10, 20, 30]` は 3 つの値を並べたリストです。図では、名前 a からリストの箱へ矢印が伸びます。',
            '- `a[0]` が最初、`a[2]` が最後です。長さ n のリストで使える番号は 0 から n-1 です。',
            '- `a[-1]` は最後、`a[-2]` は最後から 2 番目です。',
            '- `a.append(40)` は最後に追加します。`len(a)` は長さです。',
            '- `for x in a:` で、要素を前から順に取り出せます。',
          ),
          example: src(r`
            a = [10, 20, 30]
            # 1. 番号で読み書きする
            a[1] = 25
            # 2. 最後に追加する
            a.append(40)
            # 3. 前から順に取り出す
            total = 0
            for x in a:
                total += x
            print(len(a), a[-1], total)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'list-p1', type: 'predict', kcs: ['list', 'slice'],
            prompt: '出力を予測してください。',
            params: { a: [1, 9], b: [1, 9] },
            code: src(r`
              nums = [$a, $b, 7]
              nums.append(nums[0] + nums[-1])
              nums[1] = nums[1] * 2
              print(nums)
              print(len(nums), nums[-2])
            `),
          },
        },
        {
          kind: 'problem', problem: {
            id: 'list-c1', type: 'choice', kcs: ['slice'],
            prompt: '`a = [5, 6, 7]` のとき、`print(a[3])` はどうなりますか。',
            choices: [
              { text: '7 が表示される', why: '7 は a[2] です。番号は 0 から始まります。' },
              { text: 'IndexError になる', why: 'そのとおりです。長さ 3 のリストで使える番号は 0, 1, 2 です。' },
              { text: 'None が表示される', why: 'Python は、範囲外の番号を黙って許しません。エラーで止めて知らせます。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'list-w1', type: 'write', kcs: ['list', 'for'],
            prompt: 'リスト scores の中で、60 以上の点数だけを集めたリストを作り、表示してください。',
            params: { a: [40, 99], b: [40, 99], c: [40, 99] },
            starter: src(r`
              scores = [$a, $b, $c, 55, 80]
              passed = []
              # ここに書く
              print(passed)
            `),
            solution: src(r`
              scores = [$a, $b, $c, 55, 80]
              passed = []
              for s in scores:
                  if s >= 60:
                      passed.append(s)
              print(passed)
            `),
            tests: [{}, { set: { scores: '[61, 59, 100, 0, 60]' } }],
            hints: ['`for s in scores:` で 1 つずつ取り出し、条件に合うものだけ `passed.append(s)` します。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: 'スライスと文字列',
      steps: [
        {
          kind: 'read', title: 'スライスは「始まりから、終わりの手前まで」',
          body: L(
            '- `a[1:3]` は番号 1 と 2 の要素を取り出した**新しいリスト**です。range と同じく、終わりの番号は含みません。',
            '- `a[:2]` は最初の 2 つ、`a[2:]` は番号 2 から最後まで、`a[::-1]` は逆順です。',
            '- 文字列も同じように `s[0]`、`s[1:3]` で読めます。',
            '- 文字列は**変えられません**。`s[0] = "X"` はエラーです。`s.upper()` や `s.replace("a", "b")` は、元の文字列を変えずに新しい文字列を返します。',
          ),
          example: src(r`
            s = "python"
            # 1. スライスは新しい文字列を作る
            head = s[:2]
            tail = s[2:]
            # 2. メソッドも新しい文字列を返す(s は変わらない)
            big = s.upper()
            print(head, tail, big, s)
            # 3. 逆順
            print(s[::-1])
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'list-p2', type: 'predict', kcs: ['slice', 'string'],
            prompt: '出力を予測してください。',
            params: { w: ['banana', 'orange', 'melon', 'cherry'] },
            code: src(r`
              w = "$w"
              print(w[1:4])
              print(w[-2:], len(w))
              print(w.replace("a", "A"), w)
            `),
            explain: 'replace は新しい文字列を返すだけで、w そのものは変わりません。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'list-f1', type: 'fill', kcs: ['string', 'for'],
            prompt: '入力した文字列の中の母音(a, e, i, o, u)の数を表示します。空欄を埋めてください。',
            code: src(r`
              s = input()
              count = 0
              for ch in ___:
                  if ch ___ "aeiou":
                      count += 1
              print(count)
            `),
            answers: ['s', 'in'],
            tests: [{ stdin: 'banana' }, { stdin: 'sky' }, { stdin: 'education' }],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'list-k1', type: 'predict', kcs: ['list', 'slice'],
      prompt: '出力を予測してください。',
      params: { a: [1, 5] },
      code: src(r`
        a = [$a, 2, 3, 4, 5]
        b = a[1:4]
        b.append(a[-1])
        print(b, len(a))
      `),
    },
    {
      id: 'list-k2', type: 'choice', kcs: ['string'],
      prompt: '`s = "cat"` のあと `s.upper()` だけを実行し、`print(s)` すると何が表示されますか。',
      choices: [
        { text: 'CAT', why: 'upper() は新しい文字列を返すだけです。受け取らなければ、その結果は捨てられます。' },
        { text: 'cat', why: 'そのとおりです。文字列は変えられないので、s は "cat" のままです。`s = s.upper()` と書くと CAT になります。' },
        { text: 'エラーになる', why: 'upper() を呼ぶこと自体は正しい使い方です。' },
      ],
      answer: 1,
    },
    {
      id: 'list-k3', type: 'trace', kcs: ['list', 'for'],
      prompt: '4 行目に来るたびに、その行を実行する前の x と best の値を書いてください。',
      params: { a: [1, 9], b: [1, 9], c: [1, 9] },
      code: src(r`
        nums = [$a, $b, $c]
        best = nums[0]
        for x in nums:
            if x > best:
                best = x
        print(best)
      `),
      line: 4, vars: ['x', 'best'],
    },
    {
      id: 'list-k4', type: 'write', kcs: ['string', 'list'],
      prompt: '入力した単語を逆から読んでも同じ(回文)なら `回文`、違えば `回文ではない` と表示してください。',
      starter: src(r`
        w = input()
      `),
      solution: src(r`
        w = input()
        if w == w[::-1]:
            print("回文")
        else:
            print("回文ではない")
      `),
      tests: [{ stdin: 'level' }, { stdin: 'python' }, { stdin: 'a' }, { stdin: 'abca', hidden: true }],
      hints: ['`w[::-1]` で逆順の文字列が作れます。'],
    },
  ],
};

export const FUNC: Unit = {
  id: 'func',
  title: '関数',
  summary: '処理に名前を付けてまとめます。return と print の違い、関数の中の名前がその関数だけのものになることを確かめます。',
  kcs: ['func', 'return', 'scope'],
  lessons: [
    {
      id: 'l1', title: '関数を作って呼ぶ',
      steps: [
        {
          kind: 'read', title: 'return は呼び出し元へ値を返す',
          body: L(
            '- `def 名前(引数):` で関数を作ります。作っただけでは中身は動きません。呼んだときに動きます。',
            '- `return 値` は、その値を呼び出し元へ返して、関数をすぐ終えます。',
            '- `print` は画面に出すだけで、値は返しません。return のない関数は `None` を返します。',
            '- 図では、関数を呼ぶとその関数用の枠(フレーム)が積まれ、戻ると消えます。',
            '- 中身をまだ書いていない関数には `pass`(何もしない)と書いておきます。中身を書いたら消してかまいません。',
          ),
          example: src(r`
            # 1. 関数を作る(ここではまだ動かない)
            def area(w, h):
                return w * h

            # 2. 呼ぶと、w と h を持つ枠が積まれる
            a = area(3, 4)
            # 3. 戻り値をさらに計算に使える
            b = area(a, 2) + 1
            print(a, b)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'func-p1', type: 'predict', kcs: ['func', 'return'],
            prompt: '出力を予測してください。',
            params: { a: [2, 6] },
            code: src(r`
              def twice(x):
                  print("呼ばれた", x)
                  return x * 2

              y = twice($a)
              z = twice(y) + 1
              print(y, z)
            `),
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-c1', type: 'choice', kcs: ['return'],
            prompt: '次の関数で `r = add(2, 3)` としたとき、r の値はどれですか。\n\n`def add(a, b):` / `    print(a + b)`',
            choices: [
              { text: '5', why: 'print は画面に 5 を出すだけで、値を返しません。' },
              { text: 'None', why: 'そのとおりです。return がない関数は None を返します。' },
              { text: 'エラーになる', why: 'return がなくても関数は正しく動きます。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-w1', type: 'write', kcs: ['func', 'return'],
            prompt: 'リストを受け取り、その平均を返す関数 `average(nums)` を作ってください。表示は下の行が行います。',
            starter: src(r`
              def average(nums):
                  pass  # ここに書く

              print(average([2, 4, 9]))
              print(average([5]))
            `),
            solution: src(r`
              def average(nums):
                  return sum(nums) / len(nums)

              print(average([2, 4, 9]))
              print(average([5]))
            `),
            tests: [{}, { append: 'print(average([1, 2]))' }],
            hints: ['`sum(nums)` で合計、`len(nums)` で個数が求まります。', '関数の中では print せず、`return` で返します。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: '関数の中の名前',
      steps: [
        {
          kind: 'read', title: '関数の中で代入した名前は、その関数だけのもの',
          body: L(
            '- 関数の中で `x = 1` と代入すると、その x は関数の枠の中だけの名前(ローカル)になります。外の x とは別物です。',
            '- 関数が終わると、その枠ごと名前は消えます。',
            '- 外の名前を読むだけならできますが、外の値を変えたいときは、return で返して呼び出し元で代入するのが基本です。',
          ),
          example: src(r`
            x = 10

            def f():
                # 1. この x は f の枠の中だけの名前
                x = 99
                return x + 1

            # 2. 図で、外の x と f の中の x が別の枠にあるのを見る
            y = f()
            # 3. 外の x は 10 のまま
            print(x, y)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'func-p2', type: 'predict', kcs: ['scope'],
            prompt: '出力を予測してください。',
            params: { n: [1, 9] },
            code: src(r`
              n = $n

              def bump(n):
                  n = n + 100
                  return n

              m = bump(n)
              print(n, m)
            `),
            explain: '引数の n は、関数の枠の中の名前です。中で n に代入し直しても、外の n は変わりません。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-t1', type: 'trace', kcs: ['func', 'return'],
            prompt: '2 行目に来るたびに、その行を実行する前の n の値を書いてください(再帰で同じ関数が何度も呼ばれます)。',
            params: { n: [3, 5] },
            code: src(r`
              def fact(n):
                  if n <= 1:
                      return 1
                  return n * fact(n - 1)

              print(fact($n))
            `),
            line: 2, vars: ['n'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'func-k1', type: 'predict', kcs: ['func', 'return'],
      prompt: '出力を予測してください。',
      params: { a: [2, 9] },
      code: src(r`
        def sq(x):
            return x * x

        def show(x):
            print(x * x)

        a = sq($a)
        b = show(3)
        print(a, b)
      `),
    },
    {
      id: 'func-k2', type: 'choice', kcs: ['scope'],
      prompt: '関数の中で `total = 0` と書き、関数を呼んだあと、外で `print(total)` しました。外で total を一度も作っていないとき、どうなりますか。',
      choices: [
        { text: '0 が表示される', why: '関数の中の total は、関数が終わると消えます。外からは見えません。' },
        { text: 'NameError になる', why: 'そのとおりです。外には total という名前がないので、まだ作っていない名前を使ったことになります。' },
        { text: 'None が表示される', why: 'ない名前を読むと、None ではなくエラーになります。' },
      ],
      answer: 1,
    },
    {
      id: 'func-k3', type: 'fill', kcs: ['func', 'return'],
      prompt: '2 つの数のうち大きい方を返す関数を完成させてください。',
      code: src(r`
        def bigger(a, b):
            if a > b:
                ___ a
            ___ b

        print(bigger(3, 8), bigger(9, 2), bigger(4, 4))
      `),
      answers: ['return', 'return'],
      tests: [{}],
    },
    {
      id: 'func-k4', type: 'write', kcs: ['func', 'return', 'string'],
      prompt: '文字列 s と文字 ch を受け取り、s の中に ch が何回出てくるかを返す関数 `count_char(s, ch)` を作ってください。',
      starter: src(r`
        def count_char(s, ch):
            pass  # ここに書く

        print(count_char("banana", "a"))
        print(count_char("python", "z"))
      `),
      solution: src(r`
        def count_char(s, ch):
            n = 0
            for c in s:
                if c == ch:
                    n += 1
            return n

        print(count_char("banana", "a"))
        print(count_char("python", "z"))
      `),
      tests: [{}, { append: 'print(count_char("mississippi", "s"))' }],
      hints: ['数える名前を 0 から始め、1 文字ずつ比べます。最後に return します。'],
    },
  ],
};

export const ALIAS: Unit = {
  id: 'alias',
  title: '名前とオブジェクト',
  summary: 'Python の名前は、オブジェクトを指す矢印です。b = a でコピーされないこと、関数がリストを変えると呼び出し元も変わることを、図で確かめます。',
  kcs: ['alias', 'mutable', 'argshare', 'defaultarg', 'copy'],
  lessons: [
    {
      id: 'l1', title: 'b = a はコピーしない',
      steps: [
        {
          kind: 'read', title: '代入は矢印を付け替えるだけ',
          body: L(
            '- `b = a` は、b に「a が指しているのと同じオブジェクト」を指させます。中身はコピーされません。',
            '- だから `b.append(4)` でリストを変えると、a から見ても変わっています。同じ 1 つのリストだからです。',
            '- 一方、`b = b + [4]` や `b = [9]` のような代入は、b の矢印を**新しいオブジェクトへ付け替える**だけで、a は元のままです。',
            '- `a is b` は「同じオブジェクトを指しているか」、`a == b` は「中身が等しいか」を調べます。',
            '- 別のリストがほしいときは `a.copy()` や `a[:]` でコピーします。',
          ),
          example: src(r`
            a = [1, 2, 3]
            # 1. b は a と同じリストを指す(矢印が 2 本)
            b = a
            # 2. リストを変えると、a から見ても変わる
            b.append(4)
            # 3. コピーすると、別のリストになる
            c = a.copy()
            c.append(5)
            # 4. 代入し直すと、b の矢印だけが付け替わる
            b = [9]
            print(a, b, c)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'alias-p1', type: 'predict', kcs: ['alias'],
            prompt: '出力を予測してください。',
            params: { a: [1, 9] },
            code: src(r`
              x = [$a, 0]
              y = x
              y[1] = 5
              z = x[:]
              z[0] = 100
              print(x, y, z)
              print(x is y, x is z, x == y)
            `),
            explain: 'y = x で y と x は同じリストを指すので、y[1] = 5 は x からも見えます。x[:] はコピーなので、z を変えても x は変わりません。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'alias-c1', type: 'choice', kcs: ['mutable', 'alias'],
            prompt: '`a = 5`、`b = a`、`b = b + 1` のあと、a の値はどれですか。',
            choices: [
              { text: '6', why: '数は変えられないオブジェクトです。`b = b + 1` は新しい数 6 を作って、b の矢印を付け替えるだけです。' },
              { text: '5', why: 'そのとおりです。a は元の 5 を指したままです。' },
              { text: 'エラーになる', why: 'どの行も正しい書き方です。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'alias-p2', type: 'predict', kcs: ['mutable', 'alias'],
            prompt: '出力を予測してください。`+=` と `+` の違いに注意します。',
            code: src(r`
              a = [1]
              b = a
              b += [2]
              c = a
              c = c + [3]
              print(a, b, c)
            `),
            explain: 'リストの `+=` は、そのリスト自身に要素を足します(append と同じく中身を変える)。`c = c + [3]` は新しいリストを作って c を付け替えます。',
          },
        },
      ],
    },
    {
      id: 'l2', title: '関数と共有',
      steps: [
        {
          kind: 'read', title: '引数も矢印を渡す',
          body: L(
            '- 関数を呼ぶと、引数の名前は「呼び出し元と同じオブジェクト」を指します。',
            '- だから関数の中で `nums.append(...)` や `nums[0] = ...` とリストを変えると、呼び出し元のリストも変わります。',
            '- 関数の中で `nums = [...]` と代入し直すと、関数の中の矢印が付け替わるだけで、呼び出し元は変わりません。',
            '- 既定引数 `def add(x, box=[]):` の `[]` は、関数を作るときに 1 回だけ作られ、呼ぶたびに使い回されます。空のリストがほしいなら `box=None` にして、中で `if box is None: box = []` とします。',
          ),
          example: src(r`
            def add_bonus(scores):
                # 1. scores は呼び出し元と同じリストを指す
                for i in range(len(scores)):
                    scores[i] += 10
                # 2. 代入し直すと、関数の中の矢印だけが変わる
                scores = []

            mine = [60, 75]
            add_bonus(mine)
            print(mine)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'alias-p3', type: 'predict', kcs: ['argshare'],
            prompt: '出力を予測してください。',
            params: { a: [1, 9] },
            code: src(r`
              def change(lst, n):
                  lst.append(n)
                  n = n * 10
                  lst = [0]

              data = [$a]
              k = 3
              change(data, k)
              print(data, k)
            `),
            explain: 'lst.append(n) は共有しているリストを変えるので、data に残ります。n = n * 10 と lst = [0] は、関数の中の矢印を付け替えるだけです。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'alias-p4', type: 'predict', kcs: ['defaultarg'],
            prompt: '出力を予測してください。',
            code: src(r`
              def log(msg, history=[]):
                  history.append(msg)
                  return history

              a = log("起動")
              b = log("保存")
              print(a)
              print(a is b)
            `),
            explain: '既定引数の [] は関数を作ったときに 1 つだけ作られます。2 回目の呼び出しも同じリストに追加するので、a と b は同じリストです。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'alias-w1', type: 'write', kcs: ['defaultarg', 'argshare'],
            prompt: '下の `log` は、呼ぶたびに前の記録が残ってしまいます。既定引数を `None` にして、呼ぶたびに新しいリストから始まるように直してください。',
            starter: src(r`
              def log(msg, history=[]):
                  history.append(msg)
                  return history

              print(log("起動"))
              print(log("保存"))
            `),
            solution: src(r`
              def log(msg, history=None):
                  if history is None:
                      history = []
                  history.append(msg)
                  return history

              print(log("起動"))
              print(log("保存"))
            `),
            tests: [{}, { append: 'print(log("終了"))\nprint(log("a", ["x"]))' }],
            hints: ['`def log(msg, history=None):` にします。', '関数の最初で `if history is None:` なら `history = []` とします。'],
          },
        },
      ],
    },
    {
      id: 'l3', title: '入れ子のリスト',
      steps: [
        {
          kind: 'read', title: '[[0] * 3] * 2 は同じ行を 2 回指す',
          body: L(
            '- `[0] * 3` は `[0, 0, 0]` です。',
            '- `[[0] * 3] * 2` は、**同じ 1 つの行**を指す矢印を 2 本並べたリストになります。1 つの行を変えると、両方の行が変わって見えます。',
            '- 行ごとに別のリストを作るには `[[0] * 3 for _ in range(2)]` と書きます。',
            '- `copy()` は外側だけをコピーします(浅いコピー)。中の行は共有したままです。',
          ),
          example: src(r`
            # 1. 同じ行を 2 回指している
            bad = [[0] * 3] * 2
            bad[0][0] = 1
            # 2. 行ごとに別のリストを作る
            good = [[0] * 3 for _ in range(2)]
            good[0][0] = 1
            print(bad)
            print(good)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'alias-c2', type: 'choice', kcs: ['copy'],
            prompt: '`a = [[1, 2], [3]]`、`b = a.copy()`、`b[0].append(9)` のあと、a はどうなっていますか。',
            choices: [
              { text: '[[1, 2], [3]]', why: 'copy() は外側のリストだけをコピーします。b[0] と a[0] は同じ内側のリストです。' },
              { text: '[[1, 2, 9], [3]]', why: 'そのとおりです。内側のリストは共有されているので、a からも 9 が見えます。' },
              { text: '[[1, 2], [3], 9]', why: 'append したのは b[0](内側のリスト)で、外側ではありません。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'alias-f1', type: 'fill', kcs: ['copy'],
            prompt: '3 行 3 列の表を作り、対角線(左上から右下)に 1 を入れて表示します。各行が別のリストになるように、空欄を埋めてください。',
            code: src(r`
              n = 3
              grid = [[0] * n for _ in ___(n)]
              for i in range(n):
                  grid[i][___] = 1
              for row in grid:
                  print(row)
            `),
            answers: ['range', 'i'],
            tests: [{}],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'alias-k1', type: 'predict', kcs: ['alias', 'mutable'],
      prompt: '出力を予測してください。',
      params: { a: [1, 9] },
      code: src(r`
        p = [$a]
        q = p
        q.append(2)
        q = q + [3]
        q.append(4)
        print(p, q)
      `),
    },
    {
      id: 'alias-k2', type: 'predict', kcs: ['argshare'],
      prompt: '出力を予測してください。',
      code: src(r`
        def reset(lst):
            lst = []

        def clear(lst):
            lst.clear()

        a = [1, 2]
        b = [3, 4]
        reset(a)
        clear(b)
        print(a, b)
      `),
    },
    {
      id: 'alias-k3', type: 'choice', kcs: ['copy', 'alias'],
      prompt: '`rows = [[]] * 3`、`rows[0].append("x")` のあと、`print(rows)` の出力はどれですか。',
      choices: [
        { text: "[['x'], [], []]", why: '`[[]] * 3` は、同じ 1 つの空リストを 3 回指しています。' },
        { text: "[['x'], ['x'], ['x']]", why: 'そのとおりです。3 つの要素は同じリストなので、どれから見ても x が入っています。' },
        { text: "[[], [], [], 'x']", why: 'append したのは rows[0] で、rows そのものではありません。' },
      ],
      answer: 1,
    },
    {
      id: 'alias-k4', type: 'write', kcs: ['argshare', 'copy'],
      prompt: 'リストを受け取り、**元のリストを変えずに**、各要素を 2 倍にした新しいリストを返す関数 `doubled(nums)` を作ってください。',
      starter: src(r`
        def doubled(nums):
            pass  # ここに書く

        a = [1, 2, 3]
        b = doubled(a)
        print(a, b)
      `),
      solution: src(r`
        def doubled(nums):
            out = []
            for x in nums:
                out.append(x * 2)
            return out

        a = [1, 2, 3]
        b = doubled(a)
        print(a, b)
      `),
      tests: [{}, { append: 'c = [5, 0]\nprint(doubled(c), c)' }],
      hints: ['新しい空のリストを作り、そこへ 2 倍した値を append して返します。nums 自身には書き込みません。'],
    },
  ],
};
