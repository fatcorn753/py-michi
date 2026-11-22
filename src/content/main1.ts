// 本編 1〜3: 値と計算・条件分岐・繰り返し
import type { Unit } from './types';
import { L, r, src } from './util';

export const VARS: Unit = {
  id: 'vars',
  title: '値と計算',
  summary: '名前に値を結び付け、計算して表示します。割り算の 3 種類と、input() が文字列を返すことを押さえます。',
  kcs: ['var', 'print', 'numtype', 'input'],
  lessons: [
    {
      id: 'l1', title: '名前に値を入れて表示する',
      steps: [
        {
          kind: 'read', title: '代入は「名前を値に結び付ける」こと',
          body: L(
            '- `x = 5` は、名前 x を 5 という値に結び付けます。',
            '- `x = x + 1` は「x の今の値に 1 を足して、その結果に x を結び付け直す」という命令です。数学の等式ではありません。',
            '- `print(a, b)` は値を空白で区切って表示し、最後に改行します。',
            '- `f"x は {x}"` のように、文字列の前に f を付けると `{}` の中に値を埋め込めます(f 文字列)。',
            '',
            '下の例を「次へ」で 1 行ずつ進めてください。図では、名前の値が変わった瞬間に色が付きます。',
          ),
          example: src(r`
            # 1. 名前に値を入れる
            x = 5
            y = x * 2
            # 2. x を結び付け直す(y は変わらない)
            x = x + 1
            # 3. 表示する
            print(x, y)
            print(f"x = {x}, y = {y}")
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'vars-p1', type: 'predict', kcs: ['var'],
            prompt: '実行する前に、出力を予測して書いてください。',
            params: { a: [2, 9], b: [2, 9] },
            code: src(r`
              a = $a
              b = $b
              a = a + b
              b = a - b
              print(a, b)
            `),
            explain: '4 行目の時点で、a はもう足し算の結果に変わっています。b の計算に使う a は元の値ではありません。代入は上から順に、その時点の値で計算されます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-t1', type: 'trace', kcs: ['var'],
            prompt: '`print` の行に来たとき、各名前の値を書いてください。',
            params: { a: [1, 5] },
            code: src(r`
              s = $a
              k = 2
              s = s * k
              k = s - k
              s = s + k
              print(s, k)
            `),
            line: 6, vars: ['s', 'k'],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-w1', type: 'write', kcs: ['print', 'var'],
            prompt: '名前 w と h を使って、`3 x 4 = 12` の形で長方形の面積を表示してください。数字を直接書かず、名前から計算してください。',
            params: { w: [2, 9], h: [2, 9] },
            starter: src(r`
              w = $w
              h = $h
              # ここに書く
            `),
            solution: src(r`
              w = $w
              h = $h
              print(f"{w} x {h} = {w * h}")
            `),
            tests: [{}, { set: { w: '3', h: '8' } }],
            hints: ['f 文字列の `{}` の中には、`w * h` のような式も書けます。', '`print(f"{w} x {h} = {w * h}")` の形です。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: '割り算と入力',
      steps: [
        {
          kind: 'read', title: '割り算は 3 種類、input() は文字列',
          body: L(
            '- `17 / 5` は 3.4 です。`/` の答えはいつも小数(float)になります。`10 / 2` も 5.0 です。',
            '- `17 // 5` は 3 です。`//` は小数点以下を切り捨てた商です。',
            '- `17 % 5` は 2 です。`%` は割った余りです。',
            '- `input()` は入力を 1 行読み、**文字列**として返します。数として計算するには `int(input())` のように int に直します。',
            '- 文字列どうしの `+` はつなげるだけです。`"3" + "4"` は `"34"` になります。',
          ),
          example: src(r`
            # 1. 入力を 2 行読んで、整数に直す
            a = int(input())
            b = int(input())
            # 2. 3 種類の割り算
            print(a / b, a // b, a % b)
            # 3. 直さずにつなげると、文字列のまま
            s = input()
            print(s + s)
          `),
          stdin: '17\n5\n12',
        },
        {
          kind: 'problem', problem: {
            id: 'vars-p2', type: 'predict', kcs: ['numtype'],
            prompt: '出力を予測してください。',
            params: { a: [11, 29], b: [3, 4] },
            code: src(r`
              a = $a
              b = $b
              print(a // b, a % b)
              print(a // b * b + a % b)
            `),
            explain: '`a // b * b + a % b` は、商に割る数を掛けて余りを足したものなので、いつも元の a に戻ります。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-c1', type: 'choice', kcs: ['input', 'numtype'],
            prompt: '入力に `3` と `4` を 1 行ずつ与えました。`a = input()`、`b = input()`、`print(a + b)` の出力はどれですか。',
            choices: [
              { text: '7', why: 'input() は文字列を返します。int に直していないので、足し算ではなく文字列の連結になります。' },
              { text: '34', why: 'そのとおりです。"3" と "4" をつなげた "34" が表示されます。' },
              { text: 'エラーになる', why: '文字列どうしの + はエラーになりません。文字列と数の + はエラー(TypeError)になります。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-w2', type: 'write', kcs: ['input', 'numtype', 'print'],
            prompt: '入力から秒数を 1 行読み、`分 秒` の形で表示してください。例: 入力 `135` なら `2 15`。',
            starter: src(r`
              t = input()
              # ここに書く
            `),
            solution: src(r`
              t = int(input())
              print(t // 60, t % 60)
            `),
            tests: [{ stdin: '135' }, { stdin: '59' }, { stdin: '3600', hidden: true }],
            hints: ['input() の結果は文字列です。まず int() で整数に直します。', '分は `t // 60`、残りの秒は `t % 60` です。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'vars-k1', type: 'predict', kcs: ['var', 'numtype'],
      prompt: '出力を予測してください。',
      params: { a: [10, 30], b: [3, 7] },
      code: src(r`
        a = $a
        b = $b
        a = a // b
        b = a + b
        print(a, b)
      `),
    },
    {
      id: 'vars-k2', type: 'choice', kcs: ['numtype'],
      prompt: '`print(9 / 3)` の出力はどれですか。',
      choices: [
        { text: '3', why: '`/` の答えは割り切れても小数(float)です。整数がほしいときは `//` を使います。' },
        { text: '3.0', why: 'そのとおりです。' },
        { text: '3.3333333333333335', why: '9 は 3 で割り切れます。' },
      ],
      answer: 1,
    },
    {
      id: 'vars-k3', type: 'fill', kcs: ['input', 'print'],
      prompt: '入力から整数を 2 行読み、その和を表示するように空欄を埋めてください。',
      code: src(r`
        a = ___(input())
        b = ___(input())
        print(a + b)
      `),
      answers: ['int', 'int'],
      tests: [{ stdin: '3\n4' }, { stdin: '10\n-2' }],
    },
    {
      id: 'vars-k4', type: 'write', kcs: ['numtype', 'print', 'input'],
      prompt: '入力から整数 n を読み、`n を 7 で割ると 商 あまり 余り` の形で表示してください。例: 入力 `23` なら `23 を 7 で割ると 3 あまり 2`。',
      starter: src(r`
        n = int(input())
        # ここに書く
      `),
      solution: src(r`
        n = int(input())
        print(f"{n} を 7 で割ると {n // 7} あまり {n % 7}")
      `),
      tests: [{ stdin: '23' }, { stdin: '7' }, { stdin: '100', hidden: true }],
      hints: ['f 文字列の `{}` に `n // 7` と `n % 7` を入れます。'],
    },
  ],
};

export const COND: Unit = {
  id: 'cond',
  title: '条件分岐',
  summary: 'if・elif・else で流れを分けます。どの枝に入るかを、上から順に確かめる読み方を身に付けます。',
  kcs: ['if', 'logic'],
  lessons: [
    {
      id: 'l1', title: 'if と elif',
      steps: [
        {
          kind: 'read', title: '上から順に調べ、最初に当てはまった枝だけを実行する',
          body: L(
            '- `if 条件:` の次の行から、字下げした行が「その条件のときに実行するかたまり」です。',
            '- `elif` は「ここまでのどれにも当てはまらず、この条件に当てはまるとき」です。',
            '- 当てはまる枝が見つかったら、残りの elif と else は調べません。',
            '- 比べるときは `==`(等しい)と `!=`(等しくない)を使います。`=` は代入です。',
          ),
          example: src(r`
            score = int(input())
            # 1. 上から順に調べる
            if score >= 80:
                print("A")
            elif score >= 60:
                print("B")
            else:
                print("C")
            # 2. elif は、上の枝に入らなかったときだけ調べる
            print("おわり")
          `),
          stdin: '72',
        },
        {
          kind: 'problem', problem: {
            id: 'cond-p1', type: 'predict', kcs: ['if'],
            prompt: '出力を予測してください。',
            params: { x: [1, 30] },
            code: src(r`
              x = $x
              if x > 20:
                  print("大")
              elif x > 10:
                  print("中")
              if x % 2 == 0:
                  print("偶数")
              else:
                  print("奇数")
            `),
            explain: '6 行目の if は、上の if・elif とは別の新しい分かれ道です。上でどの枝に入っても、必ず調べられます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'cond-s1', type: 'parsons', kcs: ['if'],
            prompt: '入力した整数が正なら `正`、0 なら `ゼロ`、負なら `負` と表示するように、行を並べてください。字下げも見て選びます。',
            lines: [
              'n = int(input())',
              'if n > 0:',
              '    print("正")',
              'elif n == 0:',
              '    print("ゼロ")',
              'else:',
              '    print("負")',
            ],
            distractors: ['elif n = 0:', 'if n == 0:'],
            tests: [{ stdin: '5' }, { stdin: '0' }, { stdin: '-3' }],
          },
        },
      ],
    },
    {
      id: 'l2', title: 'and・or と範囲',
      steps: [
        {
          kind: 'read', title: '条件を組み合わせる',
          body: L(
            '- `a and b` は両方が成り立つとき、`a or b` はどちらかが成り立つときに真です。`not a` は反対です。',
            '- 範囲は `10 <= x < 20` のように続けて書けます。`10 <= x and x < 20` と同じ意味です。',
            '- `x == 1 or 2` は「x が 1 か 2」ではありません。`x == 1 or x == 2` と書くか、`x in (1, 2)` と書きます。',
          ),
          example: src(r`
            age = 15
            # 1. 範囲を続けて書く
            if 13 <= age < 20:
                print("10 代")
            # 2. and は両方、or はどちらか
            member = False
            if age < 18 and not member:
                print("割引なし")
            if age < 12 or member:
                print("割引あり")
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'cond-c1', type: 'choice', kcs: ['logic'],
            prompt: '`x = 5` のとき、`if x == 1 or 2:` の中は実行されますか。',
            choices: [
              { text: '実行されない(x は 1 でも 2 でもない)', why: '`x == 1 or 2` は `(x == 1) or 2` と読まれます。2 は 0 でない数なので真として扱われ、条件全体が真になります。' },
              { text: '実行される', why: 'そのとおりです。`or 2` の部分がいつも真なので、x がいくつでも実行されます。正しくは `x == 1 or x == 2` です。' },
              { text: 'エラーになる', why: '文法としては正しいので、エラーにはなりません。だから気付きにくい誤りです。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'cond-f1', type: 'fill', kcs: ['logic'],
            prompt: '入力した年がうるう年なら `うるう年`、そうでなければ `平年` と表示します。うるう年は「4 で割り切れ、100 で割り切れない年。ただし 400 で割り切れる年はうるう年」です。',
            code: src(r`
              y = int(input())
              if (y % 4 == 0 ___ y % 100 != 0) ___ y % 400 == 0:
                  print("うるう年")
              else:
                  print("平年")
            `),
            answers: ['and', 'or'],
            tests: [{ stdin: '2024' }, { stdin: '1900' }, { stdin: '2000' }, { stdin: '2023' }],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'cond-w1', type: 'write', kcs: ['if', 'logic'],
            prompt: '入力から気温(整数)を読み、25 以上なら `暑い`、10 以上 25 未満なら `ちょうどよい`、10 未満なら `寒い` と表示してください。',
            starter: src(r`
              t = int(input())
              # ここに書く
            `),
            solution: src(r`
              t = int(input())
              if t >= 25:
                  print("暑い")
              elif t >= 10:
                  print("ちょうどよい")
              else:
                  print("寒い")
            `),
            tests: [{ stdin: '30' }, { stdin: '25' }, { stdin: '10' }, { stdin: '9', hidden: true }],
            hints: ['大きい方から順に調べると、elif の条件を短く書けます。', '`if t >= 25:` → `elif t >= 10:` → `else:` の順です。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'cond-k1', type: 'predict', kcs: ['if'],
      prompt: '出力を予測してください。',
      params: { x: [1, 15] },
      code: src(r`
        x = $x
        if x % 3 == 0:
            print("Fizz")
        elif x % 5 == 0:
            print("Buzz")
        else:
            print(x)
      `),
    },
    {
      id: 'cond-k2', type: 'predict', kcs: ['logic'],
      prompt: '出力を予測してください。',
      params: { a: [1, 9], b: [1, 9] },
      code: src(r`
        a = $a
        b = $b
        if a > 5 and b > 5:
            print("両方")
        elif a > 5 or b > 5:
            print("片方")
        else:
            print("なし")
      `),
    },
    {
      id: 'cond-k3', type: 'choice', kcs: ['if'],
      prompt: '`if x > 0:` の次の行を字下げせずに `print("正")` と書くと、どうなりますか。',
      choices: [
        { text: 'x が正のときだけ表示される', why: 'Python では、字下げでかたまりを表します。字下げがないと、if の中身がないことになります。' },
        { text: 'IndentationError になる', why: 'そのとおりです。if の次には、字下げしたかたまりが少なくとも 1 行要ります。' },
        { text: 'いつも表示される', why: 'そう動く前に、文法の誤りとして実行が始まりません。' },
      ],
      answer: 1,
    },
    {
      id: 'cond-k4', type: 'write', kcs: ['if', 'logic'],
      prompt: '入力から整数を 1 行読み、1 以上 100 以下なら `OK`、そうでなければ `範囲外` と表示してください。',
      starter: src(r`
        n = int(input())
      `),
      solution: src(r`
        n = int(input())
        if 1 <= n <= 100:
            print("OK")
        else:
            print("範囲外")
      `),
      tests: [{ stdin: '1' }, { stdin: '100' }, { stdin: '0' }, { stdin: '101', hidden: true }],
      hints: ['`1 <= n <= 100` のように続けて書けます。'],
    },
  ],
};

export const LOOP: Unit = {
  id: 'loop',
  title: '繰り返し',
  summary: 'for と range、while で同じ処理をくり返します。range の終わりの数は含まれないことを、1 行ずつ確かめます。',
  kcs: ['for', 'while', 'offbyone'],
  lessons: [
    {
      id: 'l1', title: 'for と range',
      steps: [
        {
          kind: 'read', title: 'range(a, b) は a から b-1 まで',
          body: L(
            '- `for i in range(5):` は、i を 0, 1, 2, 3, 4 に順に結び付けて、中のかたまりを 5 回実行します。',
            '- `range(1, 6)` は 1 から 5 までです。**終わりの数は含みません。**',
            '- `range(0, 10, 2)` は 0, 2, 4, 6, 8 です。3 つ目は増やす幅です。',
            '- 合計を求めるときは、くり返しの前に `total = 0` を置き、中で `total = total + i`(`total += i`)とします。',
          ),
          example: src(r`
            # 1. くり返しの前に、合計を 0 にしておく
            total = 0
            # 2. i は 1, 2, 3, 4 の順に変わる(5 は含まない)
            for i in range(1, 5):
                total += i
            # 3. くり返しが終わってから表示する
            print(total)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'loop-t1', type: 'trace', kcs: ['for'],
            prompt: '3 行目(`s += i`)に来るたびに、その行を実行する前の i と s の値を書いてください。',
            params: { n: [3, 5] },
            code: src(r`
              s = 0
              for i in range(1, $n):
                  s += i
              print(s)
            `),
            line: 3, vars: ['i', 's'],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-c1', type: 'choice', kcs: ['offbyone'],
            prompt: '1 から 10 までの整数を表示したいとき、正しい range はどれですか。',
            choices: [
              { text: 'range(1, 10)', why: '終わりの数は含まれないので、1 から 9 までになります。' },
              { text: 'range(10)', why: '0 から 9 までになります。' },
              { text: 'range(1, 11)', why: 'そのとおりです。終わりの数は「最後の数 + 1」にします。' },
            ],
            answer: 2,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-w1', type: 'write', kcs: ['for', 'offbyone'],
            prompt: '入力から整数 n を読み、1 から n までの 2 乗を 1 行に 1 つずつ表示してください。例: n = 3 なら `1`、`4`、`9`。',
            starter: src(r`
              n = int(input())
            `),
            solution: src(r`
              n = int(input())
              for i in range(1, n + 1):
                  print(i * i)
            `),
            tests: [{ stdin: '3' }, { stdin: '1' }, { stdin: '6', hidden: true }],
            hints: ['n も含めたいので、range の終わりは `n + 1` です。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: 'while',
      steps: [
        {
          kind: 'read', title: 'while は条件が成り立つ間くり返す',
          body: L(
            '- `while 条件:` は、条件を調べて真ならかたまりを実行し、また条件を調べる、をくり返します。',
            '- かたまりの中で、条件に関わる値を必ず変えます。変えないと終わりません(無限ループ)。',
            '- このサイトでは、10 万行を実行しても終わらないと止めて知らせます。',
            '- 回数が決まっているなら for、「〜になるまで」なら while が向いています。',
          ),
          example: src(r`
            n = 37
            steps = 0
            # 1. n が 1 になるまでくり返す
            while n != 1:
                # 2. 条件に関わる n を必ず変える
                if n % 2 == 0:
                    n = n // 2
                else:
                    n = n * 3 + 1
                steps += 1
            print(steps)
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'loop-p1', type: 'predict', kcs: ['while'],
            prompt: '出力を予測してください。',
            params: { n: [20, 60] },
            code: src(r`
              n = $n
              count = 0
              while n > 0:
                  n = n // 3
                  count += 1
              print(count, n)
            `),
            explain: 'while の条件は、かたまりの最後まで実行してから調べ直します。n が 0 になった回でも count は 1 増えてから終わります。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-s1', type: 'parsons', kcs: ['while'],
            prompt: '入力した正の整数の、各桁の和を表示します(例: 1234 なら 10)。行を並べてください。',
            lines: [
              'n = int(input())',
              'total = 0',
              'while n > 0:',
              '    total += n % 10',
              '    n = n // 10',
              'print(total)',
            ],
            distractors: ['    n = n / 10', 'while n > 10:'],
            tests: [{ stdin: '1234' }, { stdin: '7' }, { stdin: '90010' }],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'loop-k1', type: 'predict', kcs: ['for', 'offbyone'],
      prompt: '出力を予測してください。',
      params: { a: [2, 4], b: [6, 9] },
      code: src(r`
        count = 0
        for i in range($a, $b):
            count += 1
        print(count, i)
      `),
    },
    {
      id: 'loop-k2', type: 'trace', kcs: ['while'],
      prompt: '3 行目に来るたびに、その行を実行する前の x と y の値を書いてください。',
      params: { x: [5, 9] },
      code: src(r`
        x = $x
        y = 1
        while x > 2:
            y = y * 2
            x = x - 2
        print(x, y)
      `),
      line: 3, vars: ['x', 'y'],
    },
    {
      id: 'loop-k3', type: 'fill', kcs: ['for', 'offbyone'],
      prompt: '入力した n について、n から 1 まで 1 つずつ減らしながら表示します。空欄を埋めてください。',
      code: src(r`
        n = int(input())
        for i in range(n, ___, ___):
            print(i)
      `),
      answers: ['0', '-1'],
      tests: [{ stdin: '3' }, { stdin: '1' }],
    },
    {
      id: 'loop-k4', type: 'write', kcs: ['for', 'if'],
      prompt: '入力から整数 n を読み、1 から n までのうち 3 の倍数の個数を表示してください。',
      starter: src(r`
        n = int(input())
      `),
      solution: src(r`
        n = int(input())
        count = 0
        for i in range(1, n + 1):
            if i % 3 == 0:
                count += 1
        print(count)
      `),
      tests: [{ stdin: '10' }, { stdin: '2' }, { stdin: '30', hidden: true }],
      hints: ['数える名前を 0 から始め、3 で割り切れるときだけ 1 増やします。'],
    },
  ],
};
