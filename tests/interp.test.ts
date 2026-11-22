import { describe, expect, it } from 'vitest';
import { run } from '../src/interp/interp';

const main = (body: string, pre = '') => `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n${pre}\nint main(void) {\n${body}\nreturn 0;\n}\n`;
const out = (src: string, stdin = '') => {
  const r = run(src, { stdin });
  if (r.error) throw new Error(`${r.error.kind}:${r.error.line}: ${r.error.message}`);
  return r.stdout;
};
const err = (src: string, stdin = '') => {
  const r = run(src, { stdin });
  if (!r.error) throw new Error('エラーになるはずが成功: ' + r.stdout);
  return r.error;
};

describe('基本', () => {
  it('hello', () => expect(out(main('printf("Hello, World!\\n");'))).toBe('Hello, World!\n'));
  it('四則演算と整数の割り算', () => expect(out(main('int a = 7, b = 2; printf("%d %d %d %d\\n", a+b, a-b, a/b, a%b);'))).toBe('9 5 3 1\n'));
  it('負の割り算は 0 方向に切り捨て', () => expect(out(main('printf("%d %d\\n", -7/2, -7%2);'))).toBe('-3 -1\n'));
  it('double', () => expect(out(main('double x = 1.0 / 3; printf("%.3f %f\\n", x, 2.5);'))).toBe('0.333 2.500000\n'));
  it('char と %c', () => expect(out(main("char c = 'A'; c = c + 2; printf(\"%c %d\\n\", c, c);"))).toBe('C 67\n'));
  it('幅とフラグ', () => expect(out(main('printf("[%5d][%-5d][%05d][%x][%5.1f]\\n", 42, 42, 42, 255, 3.14159);'))).toBe('[   42][42   ][00042][ff][  3.1]\n'));
  it('%g', () => expect(out(main('printf("%g %g\\n", 0.5, 100000.0);'))).toBe('0.5 100000\n'));
  it('if/else と比較', () => expect(out(main('int x = 5; if (x > 3 && x != 4) printf("big\\n"); else printf("small\\n");'))).toBe('big\n'));
  it('for と累計', () => expect(out(main('int s = 0; for (int i = 1; i <= 10; i++) s += i; printf("%d\\n", s);'))).toBe('55\n'));
  it('while / do-while / break / continue', () => expect(out(main('int i = 0; while (1) { i++; if (i % 2) continue; if (i > 6) break; printf("%d ", i); } do { i--; } while (i > 5); printf("%d\\n", i);'))).toBe('2 4 6 5\n'));
  it('switch とフォールスルー', () => expect(out(main('for (int i = 0; i < 4; i++) { switch (i) { case 0: printf("a"); case 1: printf("b"); break; default: printf("c"); } } printf("\\n");'))).toBe('abbcc\n'));
  it('三項演算子とインクリメント', () => expect(out(main('int i = 3; int j = i++ + ++i; printf("%d %d %d\\n", i, j, i > 4 ? 1 : 0);'))).toBe('5 8 1\n'));
  it('ビット演算', () => expect(out(main('printf("%d %d %d %d\\n", 6 & 3, 6 | 3, 6 ^ 3, 1 << 4);'))).toBe('2 7 5 16\n'));
  it('#define', () => expect(out(main('printf("%d\\n", N * 2);', '#define N 21'))).toBe('42\n'));
  it('unsigned の折り返し', () => expect(out(main('unsigned int u = 0; u--; printf("%u\\n", u);'))).toBe('4294967295\n'));
});

describe('関数と再帰', () => {
  it('再帰', () => expect(out(main('printf("%d\\n", fact(10));', 'int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }'))).toBe('3628800\n'));
  it('プロトタイプと後ろの定義', () => expect(out('#include <stdio.h>\nint sq(int);\nint main(void) { printf("%d\\n", sq(9)); return 0; }\nint sq(int x) { return x * x; }\n')).toBe('81\n'));
  it('値渡しでは元が変わらない', () => expect(out(main('int a = 1; f(a); printf("%d\\n", a);', 'void f(int x) { x = 99; }'))).toBe('1\n'));
  it('ポインタ渡しで swap', () => expect(out(main('int a = 1, b = 2; swap(&a, &b); printf("%d %d\\n", a, b);', 'void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }'))).toBe('2 1\n'));
  it('大域変数は 0 で始まる', () => expect(out(main('cnt++; printf("%d\\n", cnt);', 'int cnt;'))).toBe('1\n'));
});

describe('配列・ポインタ・文字列', () => {
  it('配列の初期化と省略された要素', () => expect(out(main('int a[5] = {1, 2}; for (int i = 0; i < 5; i++) printf("%d", a[i]); printf("\\n");'))).toBe('12000\n'));
  it('長さ省略の配列と sizeof', () => expect(out(main('int a[] = {3, 1, 4}; printf("%zu %zu\\n", sizeof a / sizeof a[0], sizeof(int));'))).toBe('3 4\n'));
  it('2 次元配列', () => expect(out(main('int m[2][3] = {{1,2,3},{4,5,6}}; printf("%d %d\\n", m[1][2], m[0][1]);'))).toBe('6 2\n'));
  it('ポインタ演算', () => expect(out(main('int a[] = {10, 20, 30}; int *p = a; p++; printf("%d %d %ld\\n", *p, *(p + 1), (p + 2) - a);'))).toBe("20 30 3\n"));
  it('配列を関数に渡す', () => expect(out(main('int a[] = {1, 2, 3, 4}; printf("%d\\n", sum(a, 4));', 'int sum(int a[], int n) { int s = 0; for (int i = 0; i < n; i++) s += a[i]; return s; }'))).toBe('10\n'));
  it('文字列関数', () => expect(out(main('char s[20] = "abc"; strcat(s, "def"); char t[20]; strcpy(t, s); printf("%s %zu %d %d\\n", t, strlen(t), strcmp("a", "b") < 0, strcmp(s, t));'))).toBe('abcdef 6 1 0\n'));
  it('文字列を 1 文字ずつ', () => expect(out(main('char s[] = "Hi!"; for (char *p = s; *p != \'\\0\'; p++) putchar(*p + 1); putchar(\'\\n\');'))).toBe('Ij"\n'));
  it('malloc と free', () => {
    const r = run(main('int *p = malloc(3 * sizeof(int)); for (int i = 0; i < 3; i++) p[i] = i * i; printf("%d\\n", p[2]); free(p);'));
    expect(r.stdout).toBe('4\n'); expect(r.leaks).toEqual([]);
  });
  it('メモリリークを数える', () => {
    const r = run(main('int *p = malloc(8); p[0] = 1;'));
    expect(r.ok).toBe(true); expect(r.leaks).toEqual([{ line: 6, size: 8 }]);
  });
  it('NULL との比較', () => expect(out(main('int *p = NULL; if (p == NULL) printf("null\\n");'))).toBe('null\n'));
  it('ctype', () => expect(out('#include <stdio.h>\n#include <ctype.h>\nint main(void){ printf("%c%d%d\\n", toupper(\'a\'), isdigit(\'5\') != 0, isalpha(\'5\') != 0); return 0; }')).toBe('A10\n'));
});

describe('入力', () => {
  it('scanf %d', () => expect(out(main('int a, b; scanf("%d %d", &a, &b); printf("%d\\n", a + b);'), '3 4\n')).toBe('7\n'));
  it('scanf の戻り値で EOF まで', () => expect(out(main('int x, s = 0; while (scanf("%d", &x) == 1) s += x; printf("%d\\n", s);'), '1 2 3\n4\n')).toBe('10\n'));
  it('scanf %s と %lf', () => expect(out(main('char name[10]; double h; scanf("%s %lf", name, &h); printf("%s %.1f\\n", name, h);'), 'taro 1.75')).toBe('taro 1.8\n'));
  it('getchar で文字数を数える', () => expect(out(main('int c, n = 0, lines = 0; while ((c = getchar()) != EOF) { n++; if (c == \'\\n\') lines++; } printf("%d %d\\n", n, lines);'), 'ab\ncd\n')).toBe('6 2\n'));
  it('fgets', () => expect(out(main('char buf[100]; while (fgets(buf, sizeof buf, stdin) != NULL) printf("[%zu]", strlen(buf)); printf("\\n");'), 'abc\nde\n')).toBe('[4][3]\n'));
});

describe('メモリの誤りを見つける', () => {
  it('配列の範囲外(書き込み)', () => {
    const e = err(main('int a[5]; for (int i = 0; i <= 5; i++) a[i] = i;'));
    expect(e.code).toBe('out-of-bounds'); expect(e.message).toContain('[5]'); expect(e.message).toContain('[0] 〜 [4]'); expect(e.line).toBe(6);
  });
  it('未初期化の読み出し', () => { const e = err(main('int x; printf("%d\\n", x + 1);')); expect(e.code).toBe('uninit'); });
  it('未初期化の合計変数', () => { const e = err(main('int s; for (int i = 0; i < 3; i++) s += i;')); expect(e.code).toBe('uninit'); });
  it('free 後の使用', () => { const e = err(main('int *p = malloc(4); *p = 1; free(p); printf("%d\\n", *p);')); expect(e.code).toBe('use-after-free'); expect(e.message).toContain('解放'); });
  it('二重 free', () => expect(err(main('int *p = malloc(4); free(p); free(p);')).code).toBe('double-free'));
  it('NULL の参照', () => expect(err(main('int *p = NULL; *p = 3;')).code).toBe('null-deref'));
  it('消えた局所変数のアドレス', () => expect(err(main('int *p = bad(); printf("%d\\n", *p);', 'int *bad(void) { int x = 5; return &x; }')).code).toBe('use-after-free'));
  it('0 除算', () => expect(err(main('int z = 0; printf("%d\\n", 5 / z);')).code).toBe('div-zero'));
  it('int のオーバーフロー', () => expect(err(main('int x = 2147483647; x = x + 1;')).code).toBe('overflow'));
  it('strcpy のバッファオーバーフロー', () => { const e = err(main('char s[4]; strcpy(s, "hello");')); expect(e.code).toBe('out-of-bounds'); expect(e.message).toContain('入りきりません'); });
  it("'\\0' のない文字列", () => expect(err(main("char s[3] = {'a','b','c'}; printf(\"%s\\n\", s);")).code).toBe('out-of-bounds'));
  it('文字列リテラルの書き換え', () => expect(err(main('char *s = "abc"; s[0] = \'X\';')).code).toBe('bad-pointer'));
  it('無限ループは歩数で止まる', () => { const r = run(main('while (1) {}'), { maxSteps: 1000 }); expect(r.error?.code).toBe('step-limit'); });
  it('深すぎる再帰', () => expect(err(main('f(1);', 'int f(int n) { return f(n + 1); }')).code).toBe('stack-overflow'));
  it('scanf に & を忘れる', () => { const r = run(main('int x; scanf("%d", x);'), { stdin: '5' }); expect(r.warnings.some((w) => w.msg.includes('&'))).toBe(true); expect(r.error).toBeTruthy(); });
});

describe('コンパイル時のエラーと警告', () => {
  it('セミコロン忘れは前の行で知らせる', () => { const e = err('#include <stdio.h>\nint main(void) {\n  printf("hi")\n  return 0;\n}\n'); expect(e.kind).toBe('compile'); expect(e.line).toBe(3); expect(e.message).toContain(';'); });
  it('宣言していない変数と候補', () => { const e = err(main('int count = 0; conut++;')); expect(e.message).toContain('count'); });
  it('関数名の書き間違い', () => expect(err(main('print("x");')).message).toContain('printf'));
  it('全角文字', () => expect(err(main('int x = 1；')).message).toContain('全角'));
  it('main がない', () => expect(err('int f(void) { return 0; }').message).toContain('main'));
  it('条件の中の = は警告', () => expect(run(main('int x = 1; if (x = 2) {}')).warnings[0].msg).toContain('=='));
  it('printf の型の不一致は警告', () => expect(run(main('double d = 1.5; printf("%d\\n", d);')).warnings[0].msg).toContain('%f'));
  it('文字列の == は警告', () => expect(run(main('char s[] = "a"; if (s == "a") {}')).warnings[0].msg).toContain('strcmp'));
  it('使えないヘッダー', () => expect(err('#include <pthread.h>\nint main(void){return 0;}').message).toContain('pthread.h'));
});

describe('トレース', () => {
  it('1 文ごとの記録と配列・ポインタ', () => {
    const r = run(main('int a[3] = {1, 2, 3}; int *p = &a[1]; *p = 9;'), { trace: true });
    expect(r.ok).toBe(true);
    const last = r.trace[r.trace.length - 1];
    const vars = last.frames[0]?.vars ?? r.trace[r.trace.length - 2].frames[0].vars;
    const a = vars.find((v) => v.name === 'a')!;
    const p = vars.find((v) => v.name === 'p')!;
    expect(a.cells.map((c) => c.text)).toEqual(['1', '9', '3']);
    expect(p.cells[0].ptr).toMatchObject({ blockId: a.blockId, index: 1 });
  });
});

describe('再帰で呼び出し後に引数を読む', () => {
  it('g(n - 1) + n が正しく計算される', () => {
    const r = run('#include <stdio.h>\nint g(int n) {\n  if (n <= 1) return 1;\n  return g(n - 1) + n;\n}\nint main(void) {\n  printf("%d\\n", g(4));\n  return 0;\n}\n');
    expect(r.error).toBeUndefined();
    expect(r.stdout).toBe('10\n');
  });
});

describe('日本語の文字列', () => {
  const P = (body: string) => `#include <stdio.h>\n#include <string.h>\nint main(void) {\n${body}\n  return 0;\n}\n`;
  it('printf の書式に日本語を書ける', () => {
    expect(run(P('printf("%d の 2 乗は %d\\n", 3, 9);')).stdout).toBe('3 の 2 乗は 9\n');
  });
  it('日本語は UTF-8 のバイト数になる', () => {
    expect(run(P('printf("%d\\n", (int)strlen("あい"));')).stdout).toBe('6\n');
  });
  it('入力の日本語をそのまま出せる', () => {
    const r = run(P('char s[64];\n  fgets(s, 64, stdin);\n  printf("[%s]", s);'), { stdin: '苔むす\n' });
    expect(r.stdout).toBe('[苔むす\n]');
  });
  it('1 行ずつの出力の位置が文字単位になる', () => {
    const r = run(P('printf("あ");\n  printf("い");'), { trace: true });
    const outs = r.trace.map((t) => r.stdout.slice(0, t.out));
    expect(outs).toContain('あ');
    expect(outs[outs.length - 1]).toBe('あい');
  });
});
