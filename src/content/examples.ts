// 「自由に書く」で読み込める例
import { C, r, src } from './util';

export const EXAMPLES: { title: string; code: string; stdin?: string }[] = [
  {
    title: 'はじめの一歩',
    code: C(r`
      int n = 5;
      for (int i = 1; i <= n; i++) {
          printf("%d の 2 乗は %d\n", i, i * i);
      }
    `),
  },
  {
    title: '入力を読む',
    code: C(r`
      int a, b;
      scanf("%d %d", &a, &b);
      printf("合計 %d\n", a + b);
    `),
    stdin: '3 4',
  },
  {
    title: 'ポインタの矢印',
    code: C(r`
      int a[3] = {10, 20, 30};
      int *p = a;
      p++;
      *p = 99;
      printf("%d %d %d\n", a[0], a[1], a[2]);
    `),
  },
  {
    title: '配列の範囲外(わざと誤り)',
    code: C(r`
      int a[3] = {1, 2, 3};
      for (int i = 0; i <= 3; i++) {
          printf("%d\n", a[i]);
      }
    `),
  },
  {
    title: 'malloc の返し忘れ(わざと誤り)',
    code: C(r`
      int *p = malloc(sizeof(int) * 4);
      for (int i = 0; i < 4; i++) p[i] = i * i;
      printf("%d\n", p[3]);
    `, ['stdio.h', 'stdlib.h']),
  },
  {
    title: '再帰の呼び出し',
    code: src(r`
      #include <stdio.h>

      int fib(int n) {
          if (n < 2) return n;
          return fib(n - 1) + fib(n - 2);
      }

      int main(void) {
          printf("%d\n", fib(5));
          return 0;
      }
    `),
  },
];
