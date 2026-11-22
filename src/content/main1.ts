// 本編 1〜3: 変数・条件・繰り返し
import type { Unit } from './types';
import { C, r } from './util';

const L = (...s: string[]) => s.join('\n');
const FRAME_BEFORE = '#include <stdio.h>\n\nint main(void) {';
const FRAME_AFTER = '    return 0;\n}';

export const VARS: Unit = {
  id: 'vars',
  title: '変数と計算',
  summary: '値を箱に入れ、計算して表示します。整数の割り算のくせもここで押さえます。',
  kcs: ['var', 'printf', 'intdiv'],
  lessons: [
    {
      id: 'l1', title: '箱に値を入れて表示する',
      steps: [
        {
          kind: 'read', title: '変数は名前の付いた箱',
          body: L(
            '- `int x = 5;` は、整数を入れる箱 x を作って 5 を入れます。',
            '- `x = x + 1;` は「x の今の値に 1 を足して、x に入れ直す」という命令です。数学の等式ではありません。',
            '- `printf("%d\\n", x);` は、`%d` の位置に x の値を 10 進数で書き、`\\n` で改行します。',
            '',
            '下の例を「次へ」で 1 行ずつ進めてください。右のメモリ図で、箱の値が変わる瞬間が色で示されます。',
          ),
          example: C(r`
            // 1. 箱を作って値を入れる
            int x = 5;
            int y = x * 2;
            // 2. 箱の値を書き換える(y は変わらない)
            x = x + 1;
            // 3. 表示する
            printf("x = %d, y = %d\n", x, y);
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'vars-p1', type: 'predict', kcs: ['var'],
            prompt: '実行する前に、出力を予測して書いてください。',
            params: { a: [2, 9], b: [2, 9] },
            code: C(r`
              int a = $a;
              int b = $b;
              a = a + b;
              b = a - b;
              printf("%d %d\n", a, b);
            `),
            explain: '4 行目の時点で、a はもう足し算の結果に変わっています。b の計算に使う a は元の値ではありません。代入は上から順に、その時点の値で計算されます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-t1', type: 'trace', kcs: ['var'],
            prompt: '`printf` の行に来たとき、各変数に入っている値を書いてください。',
            params: { a: [1, 5] },
            code: C(r`
              int s = $a;
              int k = 2;
              s = s * k;
              k = s - k;
              s = s + k;
              printf("%d %d\n", s, k);
            `),
            line: 9, vars: ['s', 'k'],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-w1', type: 'write', kcs: ['printf', 'var'],
            prompt: '変数 w と h を使って、`3 x 4 = 12` の形で長方形の面積を表示してください。数字を直接書かず、変数から計算してください。',
            params: { w: [2, 9], h: [2, 9] },
            starter: C(r`
              int w = $w;
              int h = $h;
              // ここに書く
            `),
            solution: C(r`
              int w = $w;
              int h = $h;
              printf("%d x %d = %d\n", w, h, w * h);
            `),
            tests: [{}],
            hints: ['`printf` には `%d` をいくつ並べてもかまいません。後ろに、同じ数だけ値を並べます。', '`printf("%d x %d = %d\\n", w, h, w * h);` の形です。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: '割り算と入力',
      steps: [
        {
          kind: 'read', title: '整数どうしの割り算は小数を切り捨てる',
          body: L(
            '- `17 / 5` は 3 です。整数どうしの割り算は、小数点以下を切り捨てます。',
            '- `17 % 5` は 2 です。`%` は割った余りです。',
            '- 小数で割りたいときは、片方を `(double)` で小数に変えてから割ります。表示は `%f`、`%.2f` で小数第 2 位までです。',
            '- `scanf("%d", &a);` は入力から整数を 1 つ読んで a に入れます。`&` を忘れると動きません(理由はポインタの単元で分かります)。',
          ),
          example: C(r`
            int a, b;
            // 1. 入力から 2 つの整数を読む
            scanf("%d %d", &a, &b);
            // 2. 商と余り
            printf("%d / %d = %d あまり %d\n", a, b, a / b, a % b);
            // 3. 小数で割る
            printf("小数で %.2f\n", (double)a / b);
          `),
          stdin: '17 5',
        },
        {
          kind: 'problem', problem: {
            id: 'vars-c1', type: 'choice', kcs: ['intdiv'],
            prompt: 'このあと d に入っている値はどれですか。',
            code: C(r`
              int a = 7;
              double d = a / 2;
              printf("%f\n", d);
            `),
            choices: [
              { text: '3.5', why: '`a / 2` は整数どうしの割り算なので、まず 3 になります。それから double の 3.0 に変わります。d に入れる先が double でも、右側の計算は変わりません。' },
              { text: '3.0', why: 'そのとおりです。`a / 2` が先に整数で計算されて 3 になり、それが 3.0 として入ります。3.5 にしたいときは `a / 2.0` か `(double)a / 2` と書きます。' },
              { text: '4.0', why: 'C の整数の割り算は四捨五入ではなく、0 の方向へ切り捨てます。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-p2', type: 'predict', kcs: ['intdiv'],
            prompt: '出力を予測してください。',
            params: { a: [10, 40], b: [3, 7] },
            code: C(r`
              int a = $a;
              int b = $b;
              printf("%d %d\n", a / b, a % b);
              printf("%d\n", a / b * b + a % b);
            `),
            explain: '`a / b * b + a % b` はいつも a に戻ります。商と余りの関係(割られる数 = 商 × 割る数 + 余り)を式にしたものです。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-f1', type: 'fill', kcs: ['intdiv', 'printf'],
            prompt: '3 つの整数を読んで、平均を小数第 1 位まで表示します。空欄を埋めてください。',
            code: C(r`
              int a, b, c;
              scanf("%d %d %d", ___, &b, &c);
              double avg = ___ / 3;
              printf("%.1f\n", avg);
            `),
            answers: ['&a', '(double)(a + b + c)'],
            tests: [{ stdin: '1 2 4' }, { stdin: '10 20 31' }, { stdin: '0 0 1', hidden: true }],
            explain: '`(a + b + c) / 3` のままだと整数の割り算になり、2.3 ではなく 2.0 になります。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'vars-w2', type: 'write', kcs: ['intdiv', 'printf'],
            prompt: '秒数を 1 つ読み、`時:分:秒` の形で表示してください。分と秒は 2 桁にそろえます(3725 なら `1:02:05`)。',
            starter: C(r`
              int t;
              scanf("%d", &t);
              // ここに書く
            `),
            solution: C(r`
              int t;
              scanf("%d", &t);
              printf("%d:%02d:%02d\n", t / 3600, t / 60 % 60, t % 60);
            `),
            tests: [{ stdin: '3725' }, { stdin: '59' }, { stdin: '0' }, { stdin: '86399', hidden: true }],
            hints: ['時は `t / 3600`、秒は `t % 60` です。分は、まず全部を分にして(`t / 60`)、その余りを 60 で取ります。', '`%02d` と書くと、1 桁のときに前を 0 で埋めて 2 桁にします。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'vars-k1', type: 'predict', kcs: ['var', 'intdiv'],
      prompt: '出力を予測してください。',
      params: { a: [20, 60] },
      code: C(r`
        int x = $a;
        int y = x / 7;
        x = x % 7;
        y = y + x;
        printf("%d %d\n", x, y);
      `),
    },
    {
      id: 'vars-k2', type: 'choice', kcs: ['printf'],
      prompt: '`printf("%d\\n", 2.5);` について正しいものはどれですか。',
      choices: [
        { text: '2 と表示される', why: '`%d` は int を受け取る書式です。double を渡しても変換はされず、何が出るかは決まっていません。' },
        { text: '書式と値の型が合っていない。double には `%f` を使う', why: 'そのとおりです。printf は書式を見て値を読み出すので、型が合わないとでたらめな値が出ます。このサイトでは警告を出します。' },
        { text: '3 と表示される', why: '四捨五入はされません。そもそも `%d` は double を受け取れません。' },
      ],
      answer: 1,
    },
    {
      id: 'vars-k3', type: 'fill', kcs: ['intdiv'],
      prompt: '金額を読み、500 円玉と 100 円玉の枚数(500 円玉をできるだけ多く使う)と、残りの金額を表示します。',
      code: C(r`
        int yen;
        scanf("%d", &yen);
        int c500 = yen / 500;
        int c100 = ___ / 100;
        int rest = ___;
        printf("%d %d %d\n", c500, c100, rest);
      `),
      answers: ['yen % 500', 'yen % 100'],
      tests: [{ stdin: '1380' }, { stdin: '499' }, { stdin: '2000', hidden: true }],
    },
    {
      id: 'vars-k4', type: 'write', kcs: ['intdiv', 'printf'],
      prompt: '分を 1 つ読み、`X 時間 Y 分` の形で表示してください(135 なら `2 時間 15 分`)。',
      starter: C(r`
        int m;
        scanf("%d", &m);
      `),
      solution: C(r`
        int m;
        scanf("%d", &m);
        printf("%d 時間 %d 分\n", m / 60, m % 60);
      `),
      tests: [{ stdin: '135' }, { stdin: '59' }, { stdin: '600', hidden: true }],
      hints: ['時間は `m / 60`、残りの分は `m % 60` です。'],
    },
  ],
};

export const COND: Unit = {
  id: 'cond',
  title: '条件分岐',
  summary: '条件によって実行する行を選びます。= と == の取り違えなど、よくある誤りも扱います。',
  kcs: ['if', 'eqassign', 'logic'],
  lessons: [
    {
      id: 'l1', title: 'if と else',
      steps: [
        {
          kind: 'read', title: '上から調べて、最初に当てはまった所だけ',
          body: L(
            '- `if (条件) { ... }` は、条件が真のときだけ中を実行します。',
            '- `else if` は「前の条件が全部偽だったときに、次の条件を調べる」です。当てはまった所より下は調べません。',
            '- `else` はどれにも当てはまらなかったときです。',
            '- 比べるときは `==`(等しい)、`!=`(等しくない)を使います。`=` は代入です。',
          ),
          example: C(r`
            int score;
            scanf("%d", &score);
            // 1. 上から順に調べ、最初に当てはまった所だけを実行する
            if (score >= 80) {
                printf("A\n");
            } else if (score >= 60) {
                // 2. 80 未満だと分かった上で、60 以上かを調べている
                printf("B\n");
            } else {
                printf("C\n");
            }
          `),
          stdin: '72',
        },
        {
          kind: 'problem', problem: {
            id: 'cond-p1', type: 'predict', kcs: ['if'],
            prompt: '出力を予測してください。',
            params: { x: [0, 20] },
            code: C(r`
              int x = $x;
              if (x > 10) {
                  printf("big\n");
              } else if (x > 5) {
                  printf("middle\n");
              }
              if (x % 2 == 0) {
                  printf("even\n");
              }
              printf("end\n");
            `),
            explain: '2 つ目の if は、1 つ目の if と else if のまとまりとは別の文です。前で何が表示されたかに関係なく、必ず調べます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'cond-c1', type: 'choice', kcs: ['eqassign'],
            prompt: 'このプログラムは何を表示しますか。',
            code: C(r`
              int x = 5;
              if (x = 0) {
                  printf("zero\n");
              } else {
                  printf("not zero\n");
              }
            `),
            choices: [
              { text: '`zero`', why: '`x = 0` は比べる式ではなく、x に 0 を入れる代入です。比べるなら `x == 0` と書きます。' },
              { text: '`not zero`', why: 'そのとおりです。代入の式は、入れた値(0)そのものになります。0 は偽なので else に進み、しかも x は 0 に書き換わっています。' },
              { text: 'コンパイルエラーになる', why: '文法としては正しいので、本物の C でも通ってしまいます。だから気づきにくい誤りです。このサイトでは警告を出します。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'cond-s1', type: 'parsons', kcs: ['if'],
            prompt: '整数を読み、正なら `positive`、負なら `negative`、0 なら `zero` と表示します。行を正しい順に並べてください。使わない行が 1 つあります。',
            before: FRAME_BEFORE, after: FRAME_AFTER,
            lines: [
              '    int n;',
              '    scanf("%d", &n);',
              '    if (n > 0) {',
              r`        printf("positive\n");`,
              '    } else if (n < 0) {',
              r`        printf("negative\n");`,
              '    } else {',
              r`        printf("zero\n");`,
              '    }',
            ],
            distractors: ['    } else if (n = 0) {'],
            tests: [{ stdin: '5' }, { stdin: '-3' }, { stdin: '0' }],
          },
        },
      ],
    },
    {
      id: 'l2', title: 'かつ・または',
      steps: [
        {
          kind: 'read', title: '条件を組み合わせる',
          body: L(
            '- `A && B` は「A かつ B」、`A || B` は「A または B」、`!A` は「A ではない」です。',
            '- 範囲は `0 < x && x < 10` と 2 つに分けて書きます。数学のように `0 < x < 10` と書くと、別の意味になります。',
            '- `&&` は左が偽なら右を調べず、`||` は左が真なら右を調べません。',
          ),
          example: C(r`
            int y;
            scanf("%d", &y);
            // 4 で割り切れて 100 で割り切れない、または 400 で割り切れる
            if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) {
                printf("%d はうるう年\n", y);
            } else {
                printf("%d は平年\n", y);
            }
          `),
          stdin: '1900',
        },
        {
          kind: 'problem', problem: {
            id: 'cond-c2', type: 'choice', kcs: ['logic'],
            prompt: 'このプログラムは何を表示しますか。',
            code: C(r`
              int x = 15;
              if (0 < x < 10) {
                  printf("in\n");
              } else {
                  printf("out\n");
              }
            `),
            choices: [
              { text: '`in`', why: 'そのとおりです。`0 < x < 10` は `(0 < x) < 10` と読まれます。`0 < x` は真で 1 になり、`1 < 10` も真です。範囲は `0 < x && x < 10` と書きます。' },
              { text: '`out`', why: '数学の読み方ならそうなりますが、C は左から 1 つずつ比べます。`0 < x` の結果(1)と 10 を比べています。' },
            ],
            answer: 0,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'cond-p2', type: 'predict', kcs: ['logic', 'if'],
            prompt: '出力を予測してください。',
            params: { x: [1, 30] },
            code: C(r`
              int x = $x;
              if (x % 3 == 0 && x % 5 == 0) printf("FizzBuzz\n");
              else if (x % 3 == 0) printf("Fizz\n");
              else if (x % 5 == 0) printf("Buzz\n");
              else printf("%d\n", x);
            `),
          },
        },
        {
          kind: 'problem', problem: {
            id: 'cond-w1', type: 'write', kcs: ['logic', 'if'],
            prompt: '年齢を読み、入館料を表示してください。5 歳以下は 0、6〜12 歳は 300、13〜64 歳は 600、65 歳以上は 300 です。数字だけを表示します。',
            starter: C(r`
              int age;
              scanf("%d", &age);
            `),
            solution: C(r`
              int age;
              scanf("%d", &age);
              if (age <= 5) printf("0\n");
              else if (age <= 12 || age >= 65) printf("300\n");
              else printf("600\n");
            `),
            tests: [{ stdin: '3' }, { stdin: '6' }, { stdin: '12' }, { stdin: '13' }, { stdin: '64' }, { stdin: '65' }, { stdin: '5', hidden: true }, { stdin: '90', hidden: true }],
            hints: ['境目の年齢(5 と 6、12 と 13、64 と 65)で、どちらに入るかを確かめてください。', '小さい順に調べると、else if の条件が短く書けます。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'cond-k1', type: 'choice', kcs: ['if'],
      prompt: 'n が 3 のとき、このプログラムは何を表示しますか。',
      code: C(r`
        int n = 3;
        if (n == 1);
        {
            printf("one\n");
        }
        printf("done\n");
      `),
      choices: [
        { text: '`done` だけ', why: '`if (n == 1);` の `;` で if 文が終わっています。次の `{ ... }` は if とは関係のない、いつも実行されるまとまりです。' },
        { text: '`one` と `done`', why: 'そのとおりです。if の直後の `;` は「条件が真なら何もしない」という文になり、`{ printf("one\\n"); }` は毎回実行されます。' },
      ],
      answer: 1,
    },
    {
      id: 'cond-k2', type: 'predict', kcs: ['if', 'logic'],
      prompt: '出力を予測してください。',
      params: { a: [1, 9], b: [1, 9] },
      code: C(r`
        int a = $a, b = $b;
        if (a > b || a == 5) printf("A\n");
        if (!(a > b) && b % 2 == 1) printf("B\n");
        if (a == b) printf("C\n");
        printf("end\n");
      `),
    },
    {
      id: 'cond-k3', type: 'fill', kcs: ['if'],
      prompt: '3 つの整数を読み、いちばん大きい数を表示します。',
      code: C(r`
        int a, b, c;
        scanf("%d %d %d", &a, &b, &c);
        int max = a;
        if (___) max = b;
        if (___) max = c;
        printf("%d\n", max);
      `),
      answers: ['b > max', 'c > max'],
      tests: [{ stdin: '1 2 3' }, { stdin: '3 2 1' }, { stdin: '2 9 4' }, { stdin: '-5 -2 -9', hidden: true }],
    },
    {
      id: 'cond-k4', type: 'write', kcs: ['logic', 'eqassign'],
      prompt: '整数を読み、1 以上 100 以下なら `ok`、そうでなければ `ng` と表示してください。',
      starter: C(r`
        int n;
        scanf("%d", &n);
      `),
      solution: C(r`
        int n;
        scanf("%d", &n);
        if (1 <= n && n <= 100) printf("ok\n");
        else printf("ng\n");
      `),
      tests: [{ stdin: '1' }, { stdin: '100' }, { stdin: '0' }, { stdin: '101' }, { stdin: '50', hidden: true }, { stdin: '-7', hidden: true }],
      hints: ['範囲は 2 つの比較を `&&` でつなぎます。'],
    },
  ],
};

export const LOOP: Unit = {
  id: 'loop',
  title: '繰り返し',
  summary: 'for と while で同じ処理をくり返します。回数が 1 つずれる誤りを、表を書いて防ぎます。',
  kcs: ['for', 'while', 'offbyone'],
  lessons: [
    {
      id: 'l1', title: 'for で決まった回数',
      steps: [
        {
          kind: 'read', title: 'for の 3 つの部分',
          body: L(
            '`for (初め; 続ける条件; 毎回の後) { 中身 }` は、次の順に動きます。',
            '',
            '- 「初め」を 1 回だけ実行する。',
            '- 「続ける条件」を調べ、偽なら終わる。',
            '- 中身を実行し、「毎回の後」を実行して、条件を調べる所へ戻る。',
            '',
            '`for (int i = 0; i < n; i++)` は i が 0, 1, …, n-1 の n 回です。`i <= n` にすると n+1 回になります。',
          ),
          example: C(r`
            int n = 5;
            int sum = 0;
            // 1. i を 1 から n まで 1 ずつ増やす
            for (int i = 1; i <= n; i++) {
                // 2. 毎回 sum に i を足す
                sum += i;
            }
            printf("%d\n", sum);
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'loop-t1', type: 'trace', kcs: ['for'],
            prompt: '`sum += i * i;` の行に来るたびに、i と sum の値を書いてください(その行を実行する前の値です)。',
            params: { n: [3, 5] },
            code: C(r`
              int sum = 0;
              for (int i = 1; i <= $n; i++) {
                  sum += i * i;
              }
              printf("%d\n", sum);
            `),
            line: 6, vars: ['i', 'sum'],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-c1', type: 'choice', kcs: ['offbyone'],
            prompt: '`*` はいくつ表示されますか。',
            params: { n: [3, 8] },
            code: C(r`
              for (int i = 0; i <= $n; i++) {
                  printf("*");
              }
              printf("\n");
            `),
            choices: [
              { text: '$n 個', why: '`i < $n` ならそうです。`<=` なので i が $n のときも実行されます。0 から数えているので 1 つ多くなります。' },
              { text: '$n 個より 1 つ多い', why: 'そのとおりです。i は 0, 1, …, $n と動くので、$n + 1 回です。' },
              { text: '$n 個より 1 つ少ない', why: '0 から始まっていることと、`<=` で終わりの値も含むことを数えてください。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-p1', type: 'predict', kcs: ['for'],
            prompt: '出力を予測してください(数の後ろの空白は気にしなくてかまいません)。',
            params: { n: [3, 6], s: [2, 3] },
            code: C(r`
              for (int i = 0; i < $n; i++) {
                  printf("%d ", i * $s);
              }
              printf("\n");
            `),
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-s1', type: 'parsons', kcs: ['for', 'offbyone'],
            prompt: 'n を読み、1 行目に `*` を 1 個、2 行目に 2 個、…、n 行目に n 個表示します。行を並べてください。使わない行が 1 つあります。',
            before: FRAME_BEFORE, after: FRAME_AFTER,
            lines: [
              '    int n;',
              '    scanf("%d", &n);',
              '    for (int i = 1; i <= n; i++) {',
              '        for (int j = 0; j < i; j++) {',
              `            putchar('*');`,
              '        }',
              r`        putchar('\n');`,
              '    }',
            ],
            distractors: ['        for (int j = 0; j <= i; j++) {'],
            tests: [{ stdin: '3' }, { stdin: '1' }, { stdin: '5', hidden: true }],
          },
        },
      ],
    },
    {
      id: 'l2', title: 'while と終わり方',
      steps: [
        {
          kind: 'read', title: '回数が分からないときは while',
          body: L(
            '- `while (条件) { ... }` は、条件が真の間くり返します。何回で終わるか前もって分からないときに使います。',
            '- 中身のどこかで条件に関わる値を変えないと、終わりません。このサイトは、終わらないプログラムを途中で止めて知らせます。',
            '- `break` はくり返しをすぐ抜け、`continue` はその回の残りを飛ばして次の回へ進みます。',
          ),
          example: C(r`
            int n = 2026;
            int digits = 0;
            // 1. n が 0 になるまで、1 の位を切り落とす
            while (n > 0) {
                n /= 10;
                digits++;
            }
            printf("%d 桁\n", digits);
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'loop-t2', type: 'trace', kcs: ['while'],
            prompt: '`if` の行に来るたびに、n と steps の値を書いてください。',
            params: { n: ['6', '5', '12', '10'] },
            code: C(r`
              int n = $n;
              int steps = 0;
              while (n != 1) {
                  if (n % 2 == 0) n = n / 2;
                  else n = 3 * n + 1;
                  steps++;
              }
              printf("%d\n", steps);
            `),
            line: 7, vars: ['n', 'steps'],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-p2', type: 'predict', kcs: ['for', 'while'],
            prompt: '出力を予測してください。',
            params: { k: [2, 4], m: [5, 8] },
            code: C(r`
              for (int i = 1; i <= 10; i++) {
                  if (i % $k == 0) continue;
                  if (i > $m) break;
                  printf("%d ", i);
              }
              printf("\n");
            `),
            explain: '`continue` で飛ばされた回は、その下の `break` の判定もしません。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-f1', type: 'fill', kcs: ['while'],
            prompt: '0 が来るまで整数を読み、合計と個数を表示します(0 は数えません)。',
            code: C(r`
              int x, sum = 0, count = 0;
              scanf("%d", &x);
              while (___) {
                  sum += x;
                  count++;
                  ___;
              }
              printf("%d %d\n", sum, count);
            `),
            answers: ['x != 0', 'scanf("%d", &x)'],
            tests: [{ stdin: '3 4 5 0' }, { stdin: '0' }, { stdin: '-2 7 0', hidden: true }],
            explain: '読む → 調べる → 使う → 次を読む、の順です。最初の 1 つはくり返しの前に読んでおきます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'loop-w1', type: 'write', kcs: ['while'],
            prompt: '1 以上の整数を読み、その数字を後ろから 1 文字ずつ表示してください(1200 なら `0021`)。',
            starter: C(r`
              int n;
              scanf("%d", &n);
            `),
            solution: C(r`
              int n;
              scanf("%d", &n);
              while (n > 0) {
                  printf("%d", n % 10);
                  n /= 10;
              }
              printf("\n");
            `),
            tests: [{ stdin: '1234' }, { stdin: '7' }, { stdin: '1200' }, { stdin: '905', hidden: true }],
            hints: ['1 の位は `n % 10`、1 の位を切り落とすのは `n / 10` です。', 'n が 0 になるまでくり返します。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'loop-k1', type: 'choice', kcs: ['while'],
      prompt: 'このプログラムはどうなりますか。',
      code: C(r`
        int i = 0;
        while (i < 10) {
            printf("%d\n", i);
        }
      `),
      choices: [
        { text: '0 から 9 まで表示する', why: 'i を増やす文がないので、i はずっと 0 のままです。' },
        { text: '0 を表示し続けて終わらない', why: 'そのとおりです。条件に関わる i が変わらないので、条件はずっと真です。中で `i++;` が必要です。' },
        { text: '何も表示しない', why: '最初に `0 < 10` は真なので、中身は実行されます。' },
      ],
      answer: 1,
    },
    {
      id: 'loop-k2', type: 'predict', kcs: ['for', 'offbyone'],
      prompt: '出力を予測してください。',
      params: { n: [2, 4] },
      code: C(r`
        for (int i = 1; i <= $n; i++) {
            for (int j = i; j <= $n; j++) {
                printf("%d", j);
            }
            printf("\n");
        }
      `),
    },
    {
      id: 'loop-k3', type: 'trace', kcs: ['while'],
      prompt: '`while` の行に来るたびに、a と b の値を書いてください。',
      params: { a: [3, 9], b: [2, 5] },
      code: C(r`
        int a = $a, b = $b;
        int q = 0;
        while (a >= b) {
            a -= b;
            q++;
        }
        printf("%d %d\n", q, a);
      `),
      line: 6, vars: ['a', 'q'],
    },
    {
      id: 'loop-k4', type: 'write', kcs: ['while', 'for'],
      prompt: '0 以上の整数を読み、各桁の数字の合計を表示してください(1234 なら 10)。',
      starter: C(r`
        int n;
        scanf("%d", &n);
      `),
      solution: C(r`
        int n;
        scanf("%d", &n);
        int s = 0;
        while (n > 0) {
            s += n % 10;
            n /= 10;
        }
        printf("%d\n", s);
      `),
      tests: [{ stdin: '1234' }, { stdin: '0' }, { stdin: '9' }, { stdin: '90909', hidden: true }],
      hints: ['前の問題と同じく、`% 10` と `/ 10` で 1 桁ずつ取り出します。'],
    },
  ],
};
