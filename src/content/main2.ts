// 本編 4〜6: 配列と文字列・関数・ポインタ
import type { Unit } from './types';
import { C, r, src } from './util';

const L = (...s: string[]) => s.join('\n');

export const ARRAY: Unit = {
  id: 'array',
  title: '配列と文字列',
  summary: '同じ型の値を並べて扱います。範囲外の読み書きと、文字列の終わりの \\0 を目で確かめます。',
  kcs: ['array', 'bounds', 'string'],
  lessons: [
    {
      id: 'l1', title: '配列',
      steps: [
        {
          kind: 'read', title: '添字は 0 から始まる',
          body: L(
            '- `int a[5];` は int の箱を 5 つ並べたものです。箱は `a[0]` から `a[4]` までで、`a[5]` はありません。',
            '- 全部を順に見るときは `for (int i = 0; i < 5; i++)` と書きます。`<=` にすると 1 つはみ出します。',
            '- 本物の C は、はみ出した読み書きを止めません。隣の変数を壊したり、たまたま動いたりします。このサイトでは止めて、どこではみ出したかを示します。',
          ),
          example: C(r`
            int a[5] = {3, 1, 4, 1, 5};
            int max = a[0];
            // 1. 残りの要素と 1 つずつ比べる
            for (int i = 1; i < 5; i++) {
                if (a[i] > max) max = a[i];
            }
            printf("%d\n", max);
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'array-p1', type: 'predict', kcs: ['array'],
            prompt: '出力を予測してください。',
            params: { a: [1, 9], b: [1, 9], c: [1, 9], d: [1, 9] },
            code: C(r`
              int a[4] = {$a, $b, $c, $d};
              a[1] = a[0] + a[3];
              a[a[0] % 4] = 0;
              for (int i = 0; i < 4; i++) printf("%d ", a[i]);
              printf("\n");
            `),
            explain: '`a[a[0] % 4]` は、まず `a[0] % 4` を計算して、その番号の箱を指します。添字には式も書けます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'array-c1', type: 'choice', kcs: ['bounds', 'offbyone'],
            prompt: 'このプログラムの問題はどれですか。',
            code: C(r`
              int a[5] = {1, 2, 3, 4, 5};
              int sum = 0;
              for (int i = 0; i <= 5; i++) sum += a[i];
              printf("%d\n", sum);
            `),
            choices: [
              { text: '問題はなく、15 と表示される', why: 'i が 5 のとき `a[5]` を読みます。a の箱は `a[4]` までです。' },
              { text: '範囲外の `a[5]` を読んでいる。本物の C では何が起きるか決まっていない', why: 'そのとおりです。本物の C ではたまたま動くこともあり、見つけにくい誤りです。`i < 5` に直します。' },
              { text: 'コンパイルエラーになる', why: '文法は正しいので、コンパイルは通ります。誤りは実行したときに起きます。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'array-t1', type: 'trace', kcs: ['array'],
            prompt: '`int t = a[i];` の行に来るたびに、i と j の値を書いてください。終わったとき a はどうなっているかも考えてください。',
            code: C(r`
              int a[6] = {1, 2, 3, 4, 5, 6};
              int i = 0, j = 5;
              while (i < j) {
                  int t = a[i];
                  a[i] = a[j];
                  a[j] = t;
                  i++;
                  j--;
              }
              printf("%d %d\n", a[0], a[5]);
            `),
            line: 7, vars: ['i', 'j'],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'array-w1', type: 'write', kcs: ['array', 'for'],
            prompt: '個数 n(1〜100)と n 個の整数を読み、平均より大きい数がいくつあるかを表示してください。',
            starter: C(r`
              int n;
              int a[100];
              scanf("%d", &n);
            `),
            solution: C(r`
              int n;
              int a[100];
              scanf("%d", &n);
              int sum = 0;
              for (int i = 0; i < n; i++) {
                  scanf("%d", &a[i]);
                  sum += a[i];
              }
              int count = 0;
              for (int i = 0; i < n; i++) {
                  if (a[i] * n > sum) count++;
              }
              printf("%d\n", count);
            `),
            tests: [{ stdin: '5\n1 2 3 4 5' }, { stdin: '1\n7' }, { stdin: '4\n1 1 1 10' }, { stdin: '3\n2 3 3', hidden: true }],
            hints: ['平均は最後まで読まないと分かりません。いったん全部を配列に入れてから、もう 1 回見ます。', '平均を小数にしたくなければ、`a[i] > sum / n` の代わりに `a[i] * n > sum` と比べます。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: '文字列',
      steps: [
        {
          kind: 'read', title: '文字列は \\0 で終わる char の配列',
          body: L(
            '- `char s[] = "cat";` は 4 つの箱 `c` `a` `t` `\\0` になります。最後の `\\0`(値 0 の文字)が「ここで終わり」の印です。',
            '- `printf("%s", s)` や `strlen(s)` は、`\\0` が出るまで読み進めます。`\\0` がないと、配列の外まで読んでしまいます。',
            '- 文字は小さな整数です。`\'a\'` は 97 で、`s[i] - \'a\'` で「a から何文字目か」が分かります。',
          ),
          example: C(r`
            char s[] = "hello";
            int n = 0;
            // 1. '\0' が来るまで数える
            while (s[n] != '\0') {
                n++;
            }
            printf("%d\n", n);
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'array-c2', type: 'choice', kcs: ['string', 'bounds'],
            prompt: 'このプログラムの問題はどれですか。',
            code: C(r`
              char s[5];
              strcpy(s, "hello");
              printf("%s\n", s);
            `, ['stdio.h', 'string.h']),
            choices: [
              { text: '問題はない', why: '"hello" は 5 文字ですが、終わりの `\\0` を入れると 6 バイト要ります。' },
              { text: '終わりの `\\0` を入れる場所がなく、配列の外へ書き込む', why: 'そのとおりです。文字列の長さ + 1 の大きさが要ります。`char s[6];` にします。' },
              { text: '`strcpy` には配列を渡せない', why: '配列は渡せます。問題は大きさです。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'array-p2', type: 'predict', kcs: ['string'],
            prompt: '出力を予測してください。',
            params: { w: ['cat', 'moss', 'tree', 'code'] },
            code: C(r`
              char s[] = "$w";
              for (int i = 0; s[i] != '\0'; i++) {
                  s[i] = s[i] - 'a' + 'A';
              }
              printf("%s %c\n", s, s[1] + 1);
            `),
            explain: '小文字と大文字は、文字の番号が一定の差だけ離れています。`s[1] + 1` は、2 文字目(大文字にした後)の次の文字です。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'array-f1', type: 'fill', kcs: ['string'],
            prompt: '英単語を 1 つ読み、その中の `a` の数を表示します。',
            code: C(r`
              char s[100];
              scanf("%99s", s);
              int count = 0;
              for (int i = 0; ___; i++) {
                  if (s[i] == ___) count++;
              }
              printf("%d\n", count);
            `),
            answers: [r`s[i] != '\0'`, `'a'`],
            tests: [{ stdin: 'banana' }, { stdin: 'xyz' }, { stdin: 'a', hidden: true }],
            explain: '`scanf("%s", s)` には `&` を付けません。配列の名前は、それだけで先頭の場所を表すからです(ポインタの単元で詳しく扱います)。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'array-w2', type: 'write', kcs: ['string', 'array'],
            prompt: '英単語を 1 つ読み、逆から表示してください(`moss` なら `ssom`)。',
            starter: C(r`
              char s[100];
              scanf("%99s", s);
            `),
            solution: C(r`
              char s[100];
              scanf("%99s", s);
              int n = strlen(s);
              for (int i = n - 1; i >= 0; i--) putchar(s[i]);
              putchar('\n');
            `, ['stdio.h', 'string.h']),
            tests: [{ stdin: 'moss' }, { stdin: 'a' }, { stdin: 'abcdef', hidden: true }],
            hints: ['まず長さを求めます。`strlen` を使うなら `#include <string.h>` を足します。', '最後の文字は `s[n - 1]` です。`s[n]` は `\\0` です。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'array-k1', type: 'predict', kcs: ['array'],
      prompt: '出力を予測してください。',
      params: { n: [3, 5] },
      code: C(r`
        int a[6];
        a[0] = 1;
        for (int i = 1; i < 6; i++) a[i] = a[i - 1] * 2 + i;
        printf("%d %d\n", a[$n], a[a[1] % 6]);
      `),
    },
    {
      id: 'array-k2', type: 'choice', kcs: ['string'],
      prompt: '`char s[] = "abc";` の大きさ(バイト数)はいくつですか。',
      choices: [
        { text: '3', why: '見える文字は 3 つですが、終わりの `\\0` も配列に入ります。' },
        { text: '4', why: 'そのとおりです。`a` `b` `c` `\\0` の 4 バイトです。' },
        { text: '8', why: 'ポインタの大きさと混ざっています。配列はそのまま並んだ箱の数だけの大きさです。' },
      ],
      answer: 1,
    },
    {
      id: 'array-k3', type: 'fill', kcs: ['array', 'offbyone'],
      prompt: '5 つの整数を読み、隣どうしの差(後ろ − 前)を 4 つ表示します。',
      code: C(r`
        int a[5];
        for (int i = 0; i < 5; i++) scanf("%d", &a[i]);
        for (int i = 0; i < ___; i++) {
            printf("%d ", ___);
        }
        printf("\n");
      `),
      answers: ['4', 'a[i + 1] - a[i]'],
      tests: [{ stdin: '1 3 6 10 15' }, { stdin: '5 4 3 2 1' }, { stdin: '0 0 0 0 9', hidden: true }],
    },
    {
      id: 'array-k4', type: 'write', kcs: ['string'],
      prompt: '英単語を 1 つ読み、前から読んでも後ろから読んでも同じなら `yes`、違えば `no` と表示してください。',
      starter: C(r`
        char s[100];
        scanf("%99s", s);
      `, ['stdio.h', 'string.h']),
      solution: C(r`
        char s[100];
        scanf("%99s", s);
        int n = strlen(s);
        int ok = 1;
        for (int i = 0; i < n / 2; i++) {
            if (s[i] != s[n - 1 - i]) ok = 0;
        }
        printf(ok ? "yes\n" : "no\n");
      `, ['stdio.h', 'string.h']),
      tests: [{ stdin: 'level' }, { stdin: 'moss' }, { stdin: 'a' }, { stdin: 'abba', hidden: true }, { stdin: 'ab', hidden: true }],
      hints: ['前から i 番目と、後ろから i 番目(`s[n - 1 - i]`)を比べます。', '半分まで比べれば十分です。'],
    },
  ],
};

export const FUNC: Unit = {
  id: 'func',
  title: '関数',
  summary: '処理に名前を付けて分けます。引数がコピーされることと、再帰で呼び出しが積み重なる様子を図で見ます。',
  kcs: ['func', 'byvalue', 'return'],
  lessons: [
    {
      id: 'l1', title: '関数を作る',
      steps: [
        {
          kind: 'read', title: '受け取って、返す',
          body: L(
            '- `int square(int n) { return n * n; }` は「int を 1 つ受け取り、int を返す関数」です。',
            '- 呼ぶと、その関数の箱(引数とローカル変数)が新しく作られ、`return` で値を返して消えます。メモリ図で、呼び出しのたびに枠が積まれて消えるのを見てください。',
            '- 値を返さない関数は `void` と書きます。',
          ),
          example: src(r`
            #include <stdio.h>

            // 1. 受け取った n の 2 乗を返す
            int square(int n) {
                return n * n;
            }

            int main(void) {
                // 2. 呼ぶと、戻り値が式の値になる
                int a = square(3) + square(4);
                printf("%d\n", a);
                return 0;
            }
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'func-p1', type: 'predict', kcs: ['func'],
            prompt: '出力を予測してください。',
            params: { a: [1, 5] },
            code: src(r`
              #include <stdio.h>

              int f(int x) {
                  return x * 2 + 1;
              }

              int main(void) {
                  printf("%d %d\n", f($a), f(f($a)));
                  return 0;
              }
            `),
            explain: '`f(f($a))` は内側から計算します。内側の戻り値が、外側の引数になります。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-s1', type: 'parsons', kcs: ['func', 'for'],
            prompt: 'n の階乗(1 × 2 × … × n、0 の階乗は 1)を返す関数 fact を作ります。行を並べてください。使わない行が 2 つあります。',
            before: '#include <stdio.h>\n\nint fact(int n) {',
            after: src(r`
              }

              int main(void) {
                  int n;
                  scanf("%d", &n);
                  printf("%d\n", fact(n));
                  return 0;
              }
            `),
            lines: ['    int r = 1;', '    for (int i = 2; i <= n; i++) {', '        r *= i;', '    }', '    return r;'],
            distractors: ['    int r = 0;', '    return i;'],
            tests: [{ stdin: '5' }, { stdin: '1' }, { stdin: '0' }, { stdin: '10', hidden: true }],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-w1', type: 'write', kcs: ['func'],
            prompt: '3 つの整数のうちいちばん大きい数を返す関数 `max3` を書いてください。main はそのまま使います。',
            starter: src(r`
              #include <stdio.h>

              int max3(int a, int b, int c) {
                  // ここに書く
              }

              int main(void) {
                  int a, b, c;
                  scanf("%d %d %d", &a, &b, &c);
                  printf("%d\n", max3(a, b, c));
                  return 0;
              }
            `),
            solution: src(r`
              #include <stdio.h>

              int max3(int a, int b, int c) {
                  int m = a;
                  if (b > m) m = b;
                  if (c > m) m = c;
                  return m;
              }

              int main(void) {
                  int a, b, c;
                  scanf("%d %d %d", &a, &b, &c);
                  printf("%d\n", max3(a, b, c));
                  return 0;
              }
            `),
            tests: [{ stdin: '1 2 3' }, { stdin: '3 1 2' }, { stdin: '2 3 1' }, { stdin: '-1 -1 -1', hidden: true }],
            hints: ['条件分岐の単元の「いちばん大きい数」と同じ考え方です。最後に `return` で返します。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: '値渡しと再帰',
      steps: [
        {
          kind: 'read', title: '引数はコピーされる',
          body: L(
            '- 関数に渡されるのは値のコピーです。関数の中で引数を書き換えても、呼び出し元の変数は変わりません。',
            '- 下の swap は、入れ替えたつもりで何も入れ替えていません。メモリ図で、main の x, y と swap の a, b が別の箱であることを確かめてください。',
            '- 呼び出し元の変数を変えるには、ポインタを使います(次の単元)。',
          ),
          example: src(r`
            #include <stdio.h>

            // 1. a と b は、x と y のコピー
            void swap(int a, int b) {
                int t = a;
                a = b;
                b = t;
            }

            int main(void) {
                int x = 1, y = 2;
                swap(x, y);
                // 2. x と y はそのまま
                printf("%d %d\n", x, y);
                return 0;
            }
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'func-c1', type: 'choice', kcs: ['byvalue'],
            prompt: 'このプログラムは何を表示しますか。',
            code: src(r`
              #include <stdio.h>

              void add_one(int n) {
                  n = n + 1;
              }

              int main(void) {
                  int x = 5;
                  add_one(x);
                  printf("%d\n", x);
                  return 0;
              }
            `),
            choices: [
              { text: '6', why: 'add_one の n は x のコピーです。n を増やしても x は変わりません。' },
              { text: '5', why: 'そのとおりです。変えたいなら、増やした値を `return` で返して `x = add_one(x);` とするか、ポインタを渡します。' },
              { text: 'コンパイルエラーになる', why: '正しい C です。値を書き換えても、呼び出し元に伝わらないだけです。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-p2', type: 'predict', kcs: ['return', 'func'],
            prompt: '出力を予測してください。「1 行ずつ動きを見る」で、呼び出しの枠が積み重なる様子も確かめてください。',
            params: { n: [3, 7] },
            code: src(r`
              #include <stdio.h>

              int sum(int n) {
                  if (n == 0) return 0;
                  return n + sum(n - 1);
              }

              int main(void) {
                  printf("%d\n", sum($n));
                  return 0;
              }
            `),
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-c2', type: 'choice', kcs: ['return'],
            prompt: '`sign(0)` を呼ぶと、何が返りますか。',
            code: src(r`
              int sign(int x) {
                  if (x > 0) return 1;
                  if (x < 0) return -1;
              }
            `),
            choices: [
              { text: '0', why: 'どの return にも当たらないまま関数の終わりに着きます。0 が返るとは決まっていません。' },
              { text: '何が返るか決まっていない', why: 'そのとおりです。本物の C では、たまたま残っていた値が返ります。全部の道で return するように、最後に `return 0;` を書きます。このサイトでは警告を出します。' },
              { text: '-1', why: '`0 < 0` は偽なので、2 つ目の return も実行されません。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'func-w2', type: 'write', kcs: ['return'],
            prompt: '`b` の `e` 乗を返す関数 `power` を、自分自身を呼ぶ形(再帰)で書いてください。e は 0 以上です。',
            starter: src(r`
              #include <stdio.h>

              int power(int b, int e) {
                  // ここに書く
              }

              int main(void) {
                  int b, e;
                  scanf("%d %d", &b, &e);
                  printf("%d\n", power(b, e));
                  return 0;
              }
            `),
            solution: src(r`
              #include <stdio.h>

              int power(int b, int e) {
                  if (e == 0) return 1;
                  return b * power(b, e - 1);
              }

              int main(void) {
                  int b, e;
                  scanf("%d %d", &b, &e);
                  printf("%d\n", power(b, e));
                  return 0;
              }
            `),
            tests: [{ stdin: '2 10' }, { stdin: '5 0' }, { stdin: '3 4' }, { stdin: '-2 3', hidden: true }],
            hints: ['終わりの場合を先に書きます。e が 0 なら 1 です。', 'b の e 乗は、b × (b の e−1 乗) です。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'func-k1', type: 'trace', kcs: ['return', 'func'],
      prompt: '`if (b == 0)` の行に来るたびに、そのとき実行中の gcd の a と b を書いてください。',
      params: { a: [20, 60], b: [6, 18] },
      code: src(r`
        #include <stdio.h>

        int gcd(int a, int b) {
            if (b == 0) return a;
            return gcd(b, a % b);
        }

        int main(void) {
            printf("%d\n", gcd($a, $b));
            return 0;
        }
      `),
      line: 4, vars: ['a', 'b'],
    },
    {
      id: 'func-k2', type: 'predict', kcs: ['byvalue', 'func'],
      prompt: '出力を予測してください。',
      params: { x: [2, 9] },
      code: src(r`
        #include <stdio.h>

        int twice(int x) {
            x = x * 2;
            return x;
        }

        int main(void) {
            int x = $x;
            int y = twice(x);
            printf("%d %d\n", x, y);
            return 0;
        }
      `),
    },
    {
      id: 'func-k3', type: 'write', kcs: ['func', 'while'],
      prompt: '1 以上の整数が素数なら 1、そうでなければ 0 を返す関数 `is_prime` を書いてください。',
      starter: src(r`
        #include <stdio.h>

        int is_prime(int n) {
            // ここに書く
        }

        int main(void) {
            int n;
            scanf("%d", &n);
            printf("%d\n", is_prime(n));
            return 0;
        }
      `),
      solution: src(r`
        #include <stdio.h>

        int is_prime(int n) {
            if (n < 2) return 0;
            for (int d = 2; d * d <= n; d++) {
                if (n % d == 0) return 0;
            }
            return 1;
        }

        int main(void) {
            int n;
            scanf("%d", &n);
            printf("%d\n", is_prime(n));
            return 0;
        }
      `),
      tests: [{ stdin: '2' }, { stdin: '1' }, { stdin: '9' }, { stdin: '13' }, { stdin: '97', hidden: true }, { stdin: '91', hidden: true }],
      hints: ['2 から順に割ってみて、割り切れたらすぐ 0 を返します。', '1 は素数ではありません。', '`d * d <= n` まで調べれば十分です。'],
    },
  ],
};

export const PTR: Unit = {
  id: 'ptr',
  title: 'ポインタ',
  summary: '「場所」を値として扱います。メモリ図の矢印で、どこを指しているかを毎行確かめます。',
  kcs: ['addr', 'deref', 'ptrarith', 'ptrparam', 'malloc'],
  lessons: [
    {
      id: 'l1', title: 'アドレスとポインタ',
      steps: [
        {
          kind: 'read', title: 'ポインタは「場所」を入れる箱',
          body: L(
            '- 変数にはメモリ上の場所(アドレス)があります。`&x` は x の場所です。',
            '- `int *p = &x;` は「int の場所を入れる箱 p を作り、x の場所を入れる」です。メモリ図では p から x へ矢印が出ます。',
            '- `*p` は「p が指している箱」です。`*p = 20;` は x に 20 を入れるのと同じです。',
            '- `scanf("%d", &a)` に `&` が要ったのは、scanf に a の場所を教えて、そこへ書き込んでもらうためです。',
          ),
          example: C(r`
            int x = 10;
            // 1. p に x の場所を入れる(p は x を指す)
            int *p = &x;
            // 2. p の指す先(つまり x)を書き換える
            *p = 20;
            printf("%d\n", x);
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-p1', type: 'predict', kcs: ['deref', 'addr'],
            prompt: '出力を予測してください。',
            params: { a: [1, 9], b: [1, 9] },
            code: C(r`
              int a = $a, b = $b;
              int *p = &a;
              *p = *p + b;
              p = &b;
              *p = *p * 2;
              printf("%d %d\n", a, b);
            `),
            explain: '`p = &b;` は p の矢印を付け替えるだけで、a も b も変えません。その後の `*p` は b のことです。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-c1', type: 'choice', kcs: ['deref'],
            prompt: 'このプログラムの問題はどれですか。',
            code: C(r`
              int *p;
              *p = 5;
              printf("%d\n", *p);
            `),
            choices: [
              { text: '問題はなく、5 と表示される', why: 'p にはまだどの場所も入っていません。どこかも分からない場所へ 5 を書き込もうとしています。' },
              { text: 'p がどこも指していないのに、その先へ書き込んでいる', why: 'そのとおりです。ポインタは、指す先(`&x` や malloc の結果)を入れてから使います。' },
              { text: '`*p = 5` は p に 5 を入れる', why: '`*p` は p そのものではなく、p の指す先です。p に入れるなら `p = ...` です。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-f1', type: 'fill', kcs: ['ptrparam', 'deref'],
            prompt: '2 つの変数の中身を入れ替える関数 swap を完成させてください。',
            code: src(r`
              #include <stdio.h>

              void swap(int *a, int *b) {
                  int t = ___;
                  *a = *b;
                  ___ = t;
              }

              int main(void) {
                  int x, y;
                  scanf("%d %d", &x, &y);
                  swap(___, ___);
                  printf("%d %d\n", x, y);
                  return 0;
              }
            `),
            answers: ['*a', '*b', '&x', '&y'],
            tests: [{ stdin: '1 2' }, { stdin: '7 -3' }, { stdin: '5 5', hidden: true }],
            explain: '関数の単元の swap は、コピーを入れ替えていました。場所を渡せば、関数の中から呼び出し元の箱を書き換えられます。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-w1', type: 'write', kcs: ['ptrparam'],
            prompt: '配列の最小値と最大値を、ポインタ引数 mn と mx を通して返す関数 `min_max` を書いてください。',
            starter: src(r`
              #include <stdio.h>

              void min_max(int a[], int n, int *mn, int *mx) {
                  // ここに書く
              }

              int main(void) {
                  int n, a[100];
                  scanf("%d", &n);
                  for (int i = 0; i < n; i++) scanf("%d", &a[i]);
                  int lo, hi;
                  min_max(a, n, &lo, &hi);
                  printf("%d %d\n", lo, hi);
                  return 0;
              }
            `),
            solution: src(r`
              #include <stdio.h>

              void min_max(int a[], int n, int *mn, int *mx) {
                  *mn = a[0];
                  *mx = a[0];
                  for (int i = 1; i < n; i++) {
                      if (a[i] < *mn) *mn = a[i];
                      if (a[i] > *mx) *mx = a[i];
                  }
              }

              int main(void) {
                  int n, a[100];
                  scanf("%d", &n);
                  for (int i = 0; i < n; i++) scanf("%d", &a[i]);
                  int lo, hi;
                  min_max(a, n, &lo, &hi);
                  printf("%d %d\n", lo, hi);
                  return 0;
              }
            `),
            tests: [{ stdin: '5\n3 1 4 1 5' }, { stdin: '1\n7' }, { stdin: '3\n-1 -5 -2', hidden: true }],
            hints: ['`*mn = a[0];` のように、指す先に書き込みます。`mn = ...` だとポインタの矢印を変えるだけです。', '最初の要素で初めの値を決めてから、残りと比べます。'],
          },
        },
      ],
    },
    {
      id: 'l2', title: 'ポインタと配列、malloc',
      steps: [
        {
          kind: 'read', title: '配列の名前は先頭の場所',
          body: L(
            '- 配列の名前 a は、多くの場面で先頭 `&a[0]` の場所として扱われます。',
            '- `p + 1` は「1 バイト先」ではなく「1 要素先」です。`*(p + i)` と `p[i]` は同じ意味です。',
            '- `malloc(大きさ)` は、実行中に新しい箱を借ります。使い終わったら `free` で返します。返し忘れると「メモリリーク」、返した後に使うと「解放後の使用」です。どちらもこのサイトは知らせます。',
          ),
          example: C(r`
            int a[4] = {10, 20, 30, 40};
            // 1. p は a[0] を指す
            int *p = a;
            // 2. p + 2 は 2 つ先の要素 a[2] を指す
            printf("%d\n", *(p + 2));
            // 3. p を 1 要素先へ進める
            p++;
            printf("%d\n", *p);
          `),
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-p2', type: 'predict', kcs: ['ptrarith'],
            prompt: '出力を予測してください。',
            params: { a: [1, 9], b: [1, 9], c: [1, 9], d: [1, 9], e: [1, 9] },
            code: C(r`
              int a[5] = {$a, $b, $c, $d, $e};
              int *p = a + 1;
              int *q = &a[4];
              printf("%d %d %d\n", *p, *(q - 1), (int)(q - p));
            `),
            explain: 'ポインタどうしの引き算は、間にある要素の数です。バイト数ではありません。',
          },
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-c2', type: 'choice', kcs: ['malloc'],
            prompt: 'このプログラムの問題はどれですか。',
            code: C(r`
              int *p = malloc(sizeof(int) * 3);
              p[0] = 1;
              free(p);
              printf("%d\n", p[0]);
            `, ['stdio.h', 'stdlib.h']),
            choices: [
              { text: '問題はなく、1 と表示される', why: '本物の C ではたまたま 1 が出ることもありますが、返した後の場所を読んでいます。' },
              { text: '返した(free した)メモリを使っている', why: 'そのとおりです。free の後、その場所はほかの用途に使われるかもしれません。使い終わってから free します。' },
              { text: '`sizeof(int) * 3` は 3 バイトしか借りない', why: '`sizeof(int)` は int 1 つの大きさ(多くの環境で 4)なので、12 バイト借ります。' },
            ],
            answer: 1,
          },
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-s1', type: 'parsons', kcs: ['ptrarith', 'string'],
            prompt: 'ポインタを進めながら文字列の長さを数える関数を作ります。行を並べてください。使わない行が 1 つあります。',
            before: '#include <stdio.h>\n\nint my_strlen(char *s) {',
            after: src(r`
              }

              int main(void) {
                  char w[100];
                  scanf("%99s", w);
                  printf("%d\n", my_strlen(w));
                  return 0;
              }
            `),
            lines: ['    char *p = s;', r`    while (*p != '\0') {`, '        p++;', '    }', '    return p - s;'],
            distractors: ['    return *p - *s;'],
            tests: [{ stdin: 'hello' }, { stdin: 'a' }, { stdin: 'abcdefghij', hidden: true }],
          },
        },
        {
          kind: 'problem', problem: {
            id: 'ptr-w2', type: 'write', kcs: ['malloc', 'ptrarith'],
            prompt: '個数 n と n 個の整数を読み、malloc で借りた配列に入れて、逆の順に表示してください。最後に free で返します。',
            starter: C(r`
              int n;
              scanf("%d", &n);
              // ここに書く
            `, ['stdio.h', 'stdlib.h']),
            solution: C(r`
              int n;
              scanf("%d", &n);
              int *a = malloc(sizeof(int) * n);
              for (int i = 0; i < n; i++) scanf("%d", &a[i]);
              for (int i = n - 1; i >= 0; i--) printf("%d ", a[i]);
              printf("\n");
              free(a);
            `, ['stdio.h', 'stdlib.h']),
            tests: [{ stdin: '3\n1 2 3' }, { stdin: '1\n9' }, { stdin: '5\n5 4 3 2 1', hidden: true }],
            noLeak: true,
            hints: ['`int *a = malloc(sizeof(int) * n);` で n 個分を借ります。借りた後は `a[i]` で普通の配列のように使えます。', '最後に `free(a);` を忘れずに書きます。'],
          },
        },
      ],
    },
  ],
  check: [
    {
      id: 'ptr-k1', type: 'predict', kcs: ['deref', 'ptrarith'],
      prompt: '出力を予測してください。',
      params: { a: [1, 9], b: [1, 9], c: [1, 9] },
      code: C(r`
        int a[3] = {$a, $b, $c};
        int *p = a;
        *p = *(p + 2);
        p++;
        *p += 10;
        printf("%d %d %d\n", a[0], a[1], a[2]);
      `),
    },
    {
      id: 'ptr-k2', type: 'choice', kcs: ['ptrparam', 'byvalue'],
      prompt: '関数の中から、呼び出し元の int 変数 x を 0 にしたいとき、正しい組み合わせはどれですか。',
      choices: [
        { text: '`void zero(int n) { n = 0; }` と `zero(x);`', why: 'n は x のコピーなので、x は変わりません。' },
        { text: '`void zero(int *n) { *n = 0; }` と `zero(&x);`', why: 'そのとおりです。x の場所を渡し、指す先に 0 を書き込みます。' },
        { text: '`void zero(int *n) { n = 0; }` と `zero(&x);`', why: '`n = 0` はポインタ n を NULL にするだけで、x には触れません。' },
      ],
      answer: 1,
    },
    {
      id: 'ptr-k3', type: 'fill', kcs: ['malloc', 'string'],
      prompt: '文字列を複製する関数 my_strdup を完成させてください。',
      code: src(r`
        #include <stdio.h>
        #include <stdlib.h>
        #include <string.h>

        char *my_strdup(char *s) {
            char *d = malloc(___);
            strcpy(d, s);
            return d;
        }

        int main(void) {
            char w[100];
            scanf("%99s", w);
            char *c = my_strdup(w);
            printf("%s\n", c);
            ___;
            return 0;
        }
      `),
      answers: ['strlen(s) + 1', 'free(c)'],
      tests: [{ stdin: 'hello' }, { stdin: 'a' }, { stdin: 'pointer', hidden: true }],
    },
    {
      id: 'ptr-k4', type: 'write', kcs: ['ptrparam', 'ptrarith'],
      prompt: '配列の要素を、ポインタを進めながらすべて 2 倍にする関数 `double_all` を書いてください。添字 `[]` を使わずに書いてみてください。',
      starter: src(r`
        #include <stdio.h>

        void double_all(int *p, int n) {
            // ここに書く
        }

        int main(void) {
            int a[5] = {1, 2, 3, 4, 5};
            double_all(a, 5);
            for (int i = 0; i < 5; i++) printf("%d ", a[i]);
            printf("\n");
            return 0;
        }
      `),
      solution: src(r`
        #include <stdio.h>

        void double_all(int *p, int n) {
            for (int i = 0; i < n; i++) {
                *p = *p * 2;
                p++;
            }
        }

        int main(void) {
            int a[5] = {1, 2, 3, 4, 5};
            double_all(a, 5);
            for (int i = 0; i < 5; i++) printf("%d ", a[i]);
            printf("\n");
            return 0;
        }
      `),
      tests: [{}],
      hints: ['`*p` を 2 倍にしてから `p++` で次の要素へ進めます。これを n 回くり返します。'],
    },
  ],
};
