// 診断テスト。本編の各単元から 2 問ずつ。実力テストも同じ問題を、数字だけ変えて出す
import type { Problem } from './types';
import { C, r, src } from './util';

const DONT = { text: '分からない', why: '大丈夫です。この内容はコースの中で扱います。' };

export const DIAG: Problem[] = [
  {
    id: 'diag-1', type: 'predict', kcs: ['var', 'intdiv'],
    prompt: '出力を予測してください。分からなければ「分からない」を押してください。',
    params: { a: [11, 39], b: [3, 6] },
    code: C(r`
      int a = $a, b = $b;
      a = a / b;
      printf("%d %d\n", a, $a % b);
    `),
  },
  {
    id: 'diag-2', type: 'choice', kcs: ['printf', 'intdiv'],
    prompt: '`printf("%.1f\\n", 7 / 2);` について正しいものはどれですか。',
    choices: [
      { text: '3.5 と表示される', why: '`7 / 2` は整数どうしの割り算で 3 になり、しかも int を `%f` で表示しようとしています。' },
      { text: '`7 / 2` は int なので、`%f` と型が合わない', why: 'そのとおりです。' },
      { text: '4.0 と表示される', why: '整数の割り算は切り捨てで、四捨五入はしません。' },
      DONT,
    ],
    answer: 1,
  },
  {
    id: 'diag-3', type: 'predict', kcs: ['if', 'logic'],
    prompt: '出力を予測してください。',
    params: { x: [1, 20] },
    code: C(r`
      int x = $x;
      if (x > 10 && x % 2 == 0) printf("A\n");
      else if (x > 5 || x == 1) printf("B\n");
      else printf("C\n");
    `),
  },
  {
    id: 'diag-4', type: 'choice', kcs: ['eqassign'],
    prompt: '`int x = 3; if (x = 0) { ... }` の if の中身は実行されますか。',
    choices: [
      { text: '実行される', why: '`x = 0` は代入で、式の値は 0(偽)です。' },
      { text: '実行されない。しかも x は 0 になる', why: 'そのとおりです。' },
      { text: 'コンパイルエラーになる', why: '文法は正しいので通ってしまいます。' },
      DONT,
    ],
    answer: 1,
  },
  {
    id: 'diag-5', type: 'predict', kcs: ['for', 'while'],
    prompt: '出力を予測してください。',
    params: { n: [3, 6] },
    code: C(r`
      int s = 0;
      for (int i = 0; i < $n; i++) {
          if (i == 2) continue;
          s += i;
      }
      printf("%d\n", s);
    `),
  },
  {
    id: 'diag-6', type: 'choice', kcs: ['offbyone'],
    prompt: '`for (int i = 1; i <= n; i++)` の中身は何回実行されますか(n は 1 以上)。',
    choices: [
      { text: 'n - 1 回', why: 'i は 1, 2, …, n と動きます。' },
      { text: 'n 回', why: 'そのとおりです。' },
      { text: 'n + 1 回', why: '0 からではなく 1 から始まっています。' },
      DONT,
    ],
    answer: 1,
  },
  {
    id: 'diag-7', type: 'predict', kcs: ['array'],
    prompt: '出力を予測してください。',
    params: { a: [1, 9], b: [1, 9], c: [1, 9] },
    code: C(r`
      int a[3] = {$a, $b, $c};
      a[2] = a[0] + a[1];
      a[0] = a[2] - a[0];
      printf("%d %d %d\n", a[0], a[1], a[2]);
    `),
  },
  {
    id: 'diag-8', type: 'choice', kcs: ['bounds', 'string'],
    prompt: '`char s[4]; strcpy(s, "moss");` について正しいものはどれですか。',
    choices: [
      { text: 'ちょうど入るので問題ない', why: '終わりの `\\0` の分が足りません。' },
      { text: '終わりの `\\0` の分が足りず、配列の外へ書き込む', why: 'そのとおりです。' },
      { text: 'strcpy が自動で配列を大きくする', why: 'C の配列の大きさは変わりません。' },
      DONT,
    ],
    answer: 1,
  },
  {
    id: 'diag-9', type: 'predict', kcs: ['byvalue', 'func'],
    prompt: '出力を予測してください。',
    params: { x: [2, 9] },
    code: src(r`
      #include <stdio.h>

      int f(int x) {
          x = x + 10;
          return x * 2;
      }

      int main(void) {
          int x = $x;
          int y = f(x);
          printf("%d %d\n", x, y);
          return 0;
      }
    `),
  },
  {
    id: 'diag-10', type: 'predict', kcs: ['return'],
    prompt: '出力を予測してください。',
    params: { n: [3, 5] },
    code: src(r`
      #include <stdio.h>

      int g(int n) {
          if (n <= 1) return 1;
          return g(n - 1) + n;
      }

      int main(void) {
          printf("%d\n", g($n));
          return 0;
      }
    `),
  },
  {
    id: 'diag-11', type: 'predict', kcs: ['addr', 'deref', 'ptrparam'],
    prompt: '出力を予測してください。',
    params: { a: [1, 9], b: [1, 9] },
    code: src(r`
      #include <stdio.h>

      void h(int *p, int q) {
          *p = *p + q;
          q = 0;
      }

      int main(void) {
          int a = $a, b = $b;
          h(&a, b);
          printf("%d %d\n", a, b);
          return 0;
      }
    `),
  },
  {
    id: 'diag-12', type: 'choice', kcs: ['ptrarith', 'malloc'],
    prompt: '`int a[4]; int *p = a;` のとき、`p + 1` が指すのはどれですか。',
    choices: [
      { text: 'a[0] の 1 バイト先', why: 'ポインタの足し算は、要素 1 つ分ずつ進みます。' },
      { text: 'a[1]', why: 'そのとおりです。' },
      { text: 'a[0] の値に 1 を足したもの', why: 'それは `*p + 1` です。' },
      DONT,
    ],
    answer: 1,
  },
];
