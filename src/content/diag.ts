// 診断テスト。本編の各単元から 1〜2 問ずつ。実力テストも同じ問題を、数字だけ変えて出す
import type { Problem } from './types';
import { r, src } from './util';

const DONT = { text: '分からない', why: '大丈夫です。この内容はコースの中で扱います。' };

export const DIAG: Problem[] = [
  {
    id: 'diag-1', type: 'predict', kcs: ['var', 'numtype'],
    prompt: '出力を予測してください。分からなければ「分からない」を押してください。',
    params: { a: [11, 39], b: [3, 6] },
    code: src(r`
      a = $a
      b = $b
      a = a // b
      print(a, $a % b, $a / 2)
    `),
  },
  {
    id: 'diag-2', type: 'choice', kcs: ['input'],
    prompt: '入力に `5` を与えて `x = input()`、`print(x * 2)` を実行すると、何が表示されますか。',
    choices: [
      { text: '10', why: 'input() は文字列 "5" を返します。文字列の * 2 は、2 回くり返した文字列です。' },
      { text: '55', why: 'そのとおりです。' },
      { text: 'エラーになる', why: '文字列と整数の * はくり返しとして使えます。エラーになるのは文字列と整数の + です。' },
      DONT,
    ],
    answer: 1,
  },
  {
    id: 'diag-3', type: 'predict', kcs: ['if', 'logic'],
    prompt: '出力を予測してください。',
    params: { x: [1, 20] },
    code: src(r`
      x = $x
      if x > 10 and x % 2 == 0:
          print("A")
      elif x > 5 or x == 1:
          print("B")
      else:
          print("C")
    `),
  },
  {
    id: 'diag-4', type: 'predict', kcs: ['for', 'offbyone'],
    prompt: '出力を予測してください。',
    params: { n: [3, 6] },
    code: src(r`
      s = 0
      for i in range(1, $n):
          s += i
      print(s, i)
    `),
  },
  {
    id: 'diag-5', type: 'choice', kcs: ['while'],
    prompt: '`n = 10` のあと `while n > 0: print(n)` とだけ書きました(中で n を変えていません)。どうなりますか。',
    choices: [
      { text: '10 から 1 まで表示される', why: 'n を減らす行がないので、n はずっと 10 のままです。' },
      { text: '10 が 1 回だけ表示される', why: 'while は条件が成り立つ間くり返します。' },
      { text: '止まらない(無限ループ)', why: 'そのとおりです。条件に関わる値を中で変えないと終わりません。' },
      DONT,
    ],
    answer: 2,
  },
  {
    id: 'diag-6', type: 'predict', kcs: ['list', 'slice'],
    prompt: '出力を予測してください。',
    params: { a: [1, 9] },
    code: src(r`
      a = [$a, 4, 6, 8]
      print(a[1:3], a[-1])
      a.append(a[0])
      print(len(a))
    `),
  },
  {
    id: 'diag-7', type: 'predict', kcs: ['func', 'return'],
    prompt: '出力を予測してください。',
    params: { a: [2, 7] },
    code: src(r`
      def f(x):
          print(x)
          return x + 1

      y = f($a)
      print(f(y))
    `),
  },
  {
    id: 'diag-8', type: 'choice', kcs: ['scope'],
    prompt: '外で `x = 1`、関数 `def g(): x = 2` を作って `g()` を呼んだあと、`print(x)` は何を表示しますか。',
    choices: [
      { text: '2', why: '関数の中で代入した x は、その関数の中だけの名前です。' },
      { text: '1', why: 'そのとおりです。外の x は変わりません。' },
      DONT,
    ],
    answer: 1,
  },
  {
    id: 'diag-9', type: 'predict', kcs: ['alias', 'mutable'],
    prompt: '出力を予測してください。',
    params: { a: [1, 9] },
    code: src(r`
      a = [$a]
      b = a
      b.append(0)
      c = a[:]
      c.append(5)
      print(a, b, c)
    `),
  },
  {
    id: 'diag-10', type: 'choice', kcs: ['argshare', 'defaultarg'],
    prompt: '`def add(x, box=[]): box.append(x); return box` を作り、`add(1)`、`add(2)` の順に呼びました。2 回目の戻り値はどれですか。',
    choices: [
      { text: '[2]', why: '既定引数の [] は関数を作ったときに 1 つだけ作られ、呼ぶたびに使い回されます。' },
      { text: '[1, 2]', why: 'そのとおりです。1 回目に足した 1 が残っています。' },
      { text: 'エラーになる', why: '書き方としては正しく、エラーにはなりません。' },
      DONT,
    ],
    answer: 1,
  },
];
