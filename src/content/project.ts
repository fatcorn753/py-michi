// 作品コース「ミニ wc / grep」。本物のコマンドと同じ動きを、小さく自分で作る
import type { Course } from './types';
import { C, r, src } from './util';

const L = (...s: string[]) => s.join('\n');
const IO = ['stdio.h'];
const IOC = ['stdio.h', 'ctype.h'];
const IOS = ['stdio.h', 'string.h'];

export const PROJECT_PC: Course = {
  id: 'wc',
  title: '作品: ミニ wc / grep',
  summary: '文字数・単語数を数える wc と、行を探す grep を自分で作ります。本編の「繰り返し」まで終えると取り組めます。最後の単元では「ポインタ」も使います。',
  units: [
    {
      id: 'chars', title: '文字と行を数える',
      summary: 'getchar で入力を 1 文字ずつ読み、終わり(EOF)まで数えます。',
      kcs: ['getchar'],
      lessons: [{
        id: 'l1', title: '1 文字ずつ読む',
        steps: [
          {
            kind: 'read', title: 'getchar と EOF',
            body: L(
              '- `getchar()` は入力から 1 文字読んで、その文字の番号を返します。入力が終わると `EOF`(多くの環境で -1)を返します。',
              '- 受け取る変数は `char` ではなく `int` にします。EOF をどの文字とも区別するためです。',
              '- `while ((c = getchar()) != EOF)` は「読んで c に入れ、それが EOF でない間くり返す」という決まった書き方です。',
              '',
              'このコースで作るのは、ターミナルの `wc`(行・単語・文字を数える)と `grep`(文字列を含む行を探す)の小さな版です。下の入力欄に好きな文章を入れて試せます。',
            ),
            example: C(r`
              int c;
              int chars = 0, lines = 0;
              // 1. 1 文字読み、EOF(入力の終わり)でなければ続ける
              while ((c = getchar()) != EOF) {
                  chars++;
                  // 2. 改行を見たら行を数える
                  if (c == '\n') lines++;
              }
              printf("%d %d\n", lines, chars);
            `),
            stdin: 'ab\ncd\n',
          },
          {
            kind: 'problem', problem: {
              id: 'wc-p1', type: 'predict', kcs: ['getchar'],
              prompt: '入力を読んだときの出力を予測してください。',
              params: { w: ['moss on stone', 'look good', 'too soon'] },
              code: C(r`
                int c, n = 0;
                while ((c = getchar()) != EOF) {
                    if (c == 'o') n++;
                }
                printf("%d\n", n);
              `),
              stdin: '$w',
            },
          },
          {
            kind: 'problem', problem: {
              id: 'wc-c1', type: 'choice', kcs: ['getchar'],
              prompt: '`c = getchar()` の c を `char` ではなく `int` にする理由はどれですか。',
              choices: [
                { text: 'char では文字を入れられないから', why: 'char にも文字は入ります。問題は EOF の扱いです。' },
                { text: 'EOF を、どの文字とも違う値として受け取るため', why: 'そのとおりです。char に入れると、EOF と、たまたま同じ値になる文字との区別がつかなくなる環境があります。' },
                { text: 'int のほうが速いから', why: '速さの問題ではありません。' },
              ],
              answer: 1,
            },
          },
          {
            kind: 'problem', problem: {
              id: 'wc-f1', type: 'fill', kcs: ['getchar'],
              prompt: '入力をそのまま出力しますが、小文字は大文字に変えます。',
              code: C(r`
                int c;
                while ((c = ___) != EOF) {
                    putchar(___);
                }
              `, IOC),
              answers: ['getchar()', 'toupper(c)'],
              tests: [{ stdin: 'Hello, moss.\n' }, { stdin: 'abc\nxyz\n' }, { stdin: '', hidden: true }],
            },
          },
          {
            kind: 'problem', problem: {
              id: 'wc-w1', type: 'write', kcs: ['getchar'],
              prompt: '入力に含まれる数字(0〜9)の個数を表示してください。',
              starter: C(r`
                int c;
              `, IOC),
              solution: C(r`
                int c, n = 0;
                while ((c = getchar()) != EOF) {
                    if (isdigit(c)) n++;
                }
                printf("%d\n", n);
              `, IOC),
              tests: [{ stdin: 'room 101, floor 3\n' }, { stdin: 'no digits\n' }, { stdin: '2026-11-23\n', hidden: true }],
              hints: ['`isdigit(c)` は c が数字なら真を返します(`ctype.h`)。`c >= \'0\' && c <= \'9\'` と書いても同じです。'],
            },
          },
        ],
      }],
      check: [{
        id: 'wc-k1', type: 'write', kcs: ['getchar'],
        prompt: '入力の行数と文字数を、`行数 文字数` の形で表示してください(改行も 1 文字と数えます)。',
        starter: C(r`
          int c;
        `, IO),
        solution: C(r`
          int c, lines = 0, chars = 0;
          while ((c = getchar()) != EOF) {
              chars++;
              if (c == '\n') lines++;
          }
          printf("%d %d\n", lines, chars);
        `, IO),
        tests: [{ stdin: 'one\ntwo\n' }, { stdin: '' }, { stdin: 'a\n\n\nb\n', hidden: true }],
        hints: ['例題と同じ形です。何も見ずに書けるか試してください。'],
      }],
    },
    {
      id: 'words', title: '単語を数える',
      summary: '「いま単語の中にいるか」を変数で覚えて、単語の数を数えます。',
      kcs: ['state'],
      lessons: [{
        id: 'l1', title: '状態を覚える',
        steps: [
          {
            kind: 'read', title: '単語の始まりを見つける',
            body: L(
              '空白を数えるだけでは、空白が続いたときや行の先頭が空白のときに数がずれます。',
              '',
              '- `in_word` に「いま単語の中にいるか」を覚えておきます。',
              '- 空白(スペース・タブ・改行)を見たら `in_word = 0` にします。',
              '- 空白でない文字を見たとき、`in_word` が 0 なら、そこが単語の始まりです。数を 1 増やして `in_word = 1` にします。',
              '',
              'このような「覚えている状態」と「来た文字」で次の動きを決める作り方は、入力を読むプログラムでよく使います。',
            ),
            example: C(r`
              int c, lines = 0, words = 0, chars = 0;
              int in_word = 0;
              while ((c = getchar()) != EOF) {
                  chars++;
                  if (c == '\n') lines++;
                  if (isspace(c)) {
                      in_word = 0;
                  } else if (!in_word) {
                      // 単語の 1 文字目を見た
                      in_word = 1;
                      words++;
                  }
              }
              printf("%d %d %d\n", lines, words, chars);
            `, IOC),
            stdin: '  quiet  and\nwarm\n',
          },
          {
            kind: 'problem', problem: {
              id: 'wc-c2', type: 'choice', kcs: ['state'],
              prompt: '「スペースの数 + 1」を単語の数とする方法の問題はどれですか。',
              choices: [
                { text: '問題はない', why: '`a  b`(スペース 2 つ)を数えると 3 になります。' },
                { text: 'スペースが続いたときや、行の先頭・末尾にスペースがあるときに数がずれる', why: 'そのとおりです。数えるべきは区切りではなく「単語の始まり」です。' },
              ],
              answer: 1,
            },
          },
          {
            kind: 'problem', problem: {
              id: 'wc-p2', type: 'predict', kcs: ['state'],
              prompt: '出力を予測してください。',
              params: { w: ['a  bb c', ' moss ', 'x y  z w'] },
              code: C(r`
                int c, words = 0, in_word = 0;
                while ((c = getchar()) != EOF) {
                    if (c == ' ') in_word = 0;
                    else if (!in_word) { in_word = 1; words++; }
                }
                printf("%d\n", words);
              `),
              stdin: '$w',
            },
          },
          {
            kind: 'problem', problem: {
              id: 'wc-w2', type: 'write', kcs: ['state', 'getchar'],
              prompt: 'ミニ wc を完成させます。入力の行数・単語数・文字数を、空白で区切って 1 行に表示してください。',
              starter: C(r`
                int c;
              `, IOC),
              solution: C(r`
                int c, lines = 0, words = 0, chars = 0;
                int in_word = 0;
                while ((c = getchar()) != EOF) {
                    chars++;
                    if (c == '\n') lines++;
                    if (isspace(c)) in_word = 0;
                    else if (!in_word) { in_word = 1; words++; }
                }
                printf("%d %d %d\n", lines, words, chars);
              `, IOC),
              tests: [{ stdin: 'hello world\n' }, { stdin: '  two   spaces \n\nend\n' }, { stdin: '' }, { stdin: 'a\tb\nc', hidden: true }],
              hints: ['例題をもう一度読んでから、見ないで書いてみてください。', '`isspace(c)` はスペース・タブ・改行のどれでも真です。'],
            },
          },
        ],
      }],
      check: [{
        id: 'wc-k2', type: 'write', kcs: ['state'],
        prompt: 'いちばん長い単語の文字数を表示してください(単語は空白で区切られた文字の並びです)。',
        starter: C(r`
          int c;
        `, IOC),
        solution: C(r`
          int c, len = 0, best = 0;
          while ((c = getchar()) != EOF) {
              if (isspace(c)) len = 0;
              else {
                  len++;
                  if (len > best) best = len;
              }
          }
          printf("%d\n", best);
        `, IOC),
        tests: [{ stdin: 'a quiet morning\n' }, { stdin: 'x\n' }, { stdin: '' }, { stdin: 'tab\tseparated  words\n', hidden: true }],
        hints: ['いまの単語の長さを数える変数と、これまでの最大を覚える変数の 2 つを使います。'],
      }],
    },
    {
      id: 'grep', title: '行を探す',
      summary: 'fgets で 1 行ずつ読み、strstr で文字列を含むかを調べます。',
      kcs: ['fgets', 'strsearch'],
      lessons: [{
        id: 'l1', title: '1 行ずつ読んで探す',
        steps: [
          {
            kind: 'read', title: 'fgets と strstr',
            body: L(
              '- `fgets(line, 256, stdin)` は、改行までの 1 行を line に読みます。改行の文字 `\\n` も line に入ります。入力が終わると `NULL` を返します。',
              '- 大きさ(256)を渡すので、長い行でも配列からはみ出しません。',
              '- `strstr(line, "moss")` は、line の中に "moss" があればその場所を、なければ `NULL` を返します。',
            ),
            example: C(r`
              char line[256];
              int no = 0;
              // 1. 1 行ずつ読む。読めなくなったら NULL が返る
              while (fgets(line, 256, stdin) != NULL) {
                  no++;
                  // 2. "moss" を含む行だけ、行番号を付けて表示する
                  if (strstr(line, "moss") != NULL) printf("%d: %s", no, line);
              }
            `, IOS),
            stdin: 'green moss\nstone\nmossy rock\n',
          },
          {
            kind: 'problem', problem: {
              id: 'grep-c1', type: 'choice', kcs: ['fgets'],
              prompt: '`fgets` で読んだ line を `printf("%s\\n", line);` で表示すると、どうなりますか。',
              choices: [
                { text: '1 行ずつ普通に表示される', why: 'line の終わりにはすでに `\\n` が入っています。' },
                { text: '行の間に空行が入る', why: 'そのとおりです。line の `\\n` と、書式の `\\n` で 2 回改行します。`printf("%s", line)` にするか、line の `\\n` を消します。' },
              ],
              answer: 1,
            },
          },
          {
            kind: 'problem', problem: {
              id: 'grep-f1', type: 'fill', kcs: ['fgets', 'strsearch'],
              prompt: '1 行目を「探す文字列」として読み、末尾の改行を消して、その長さを表示します。',
              code: C(r`
                char pat[256];
                fgets(pat, 256, stdin);
                char *nl = strchr(pat, ___);
                if (nl != NULL) ___ = '\0';
                printf("%d\n", (int)strlen(pat));
              `, IOS),
              answers: [r`'\n'`, '*nl'],
              tests: [{ stdin: 'moss\nrest\n' }, { stdin: 'ab' }, { stdin: 'two words\n', hidden: true }],
              explain: '`strchr` は文字が見つかった場所を返します。その場所に `\\0` を書けば、文字列はそこで終わります。',
            },
          },
          {
            kind: 'problem', problem: {
              id: 'grep-w1', type: 'write', kcs: ['fgets', 'strsearch'],
              prompt: 'ミニ grep を作ります。1 行目が探す文字列、2 行目からが本文です。探す文字列を含む行を、`行番号: 行` の形で表示してください(本文の 1 行目を 1 とします)。',
              starter: C(r`
                char pat[256], line[256];
              `, IOS),
              solution: C(r`
                char pat[256], line[256];
                fgets(pat, 256, stdin);
                char *nl = strchr(pat, '\n');
                if (nl != NULL) *nl = '\0';
                int no = 0;
                while (fgets(line, 256, stdin) != NULL) {
                    no++;
                    if (strstr(line, pat) != NULL) printf("%d: %s", no, line);
                }
              `, IOS),
              tests: [{ stdin: 'moss\ngreen moss\nstone\nmossy rock\n' }, { stdin: 'zz\nnothing here\n' }, { stdin: 'a\nb\nca\n', hidden: true }],
              hints: ['探す文字列の末尾の改行を消さないと、「moss\\n」を探すことになり、行の途中の moss が見つかりません。', '前の 2 問を組み合わせます。'],
            },
          },
        ],
      }],
      check: [{
        id: 'grep-k1', type: 'write', kcs: ['fgets', 'strsearch'],
        prompt: '1 行目が探す文字列、2 行目からが本文です。探す文字列を含む行の数だけを表示してください(`grep -c` と同じ動きです)。',
        starter: C(r`
          char pat[256], line[256];
        `, IOS),
        solution: C(r`
          char pat[256], line[256];
          fgets(pat, 256, stdin);
          char *nl = strchr(pat, '\n');
          if (nl != NULL) *nl = '\0';
          int n = 0;
          while (fgets(line, 256, stdin) != NULL) {
              if (strstr(line, pat) != NULL) n++;
          }
          printf("%d\n", n);
        `, IOS),
        tests: [{ stdin: 'o\none\ntwo\nthree\n' }, { stdin: 'x\nabc\n' }, { stdin: 'ab\nab\nab\nba\n', hidden: true }],
        hints: ['ミニ grep の表示する代わりに、数を数えます。'],
      }],
    },
    {
      id: 'mystr', title: '探す仕組みを自分で作る',
      summary: 'strstr を使わずに、ポインタで文字列を探す関数を作ります。ポインタの単元を終えてから取り組んでください。',
      kcs: ['strsearch', 'ptrarith'],
      lessons: [{
        id: 'l1', title: 'my_strstr',
        steps: [
          {
            kind: 'read', title: 'ずらしながら比べる',
            body: L(
              '文字列 s の中に p があるかは、次のように調べられます。',
              '',
              '- s の先頭から 1 文字ずつ「ここから始まるか」を試す。',
              '- 試す位置から、p の文字と 1 文字ずつ比べる。p の終わり(`\\0`)まで全部同じなら見つかった。',
              '- 途中で違ったら、次の位置へずらす。',
              '',
              '下の例は、ポインタ 2 本(a と b)を並べて進めています。メモリ図の矢印が、比べている文字を指します。',
            ),
            example: src(r`
              #include <stdio.h>

              // s が p で始まっていれば 1
              int starts_with(char *s, char *p) {
                  char *a = s, *b = p;
                  // 1. p の終わりまで、1 文字ずつ比べる
                  while (*b != '\0') {
                      if (*a != *b) return 0;
                      a++;
                      b++;
                  }
                  return 1;
              }

              int main(void) {
                  printf("%d %d\n", starts_with("moss", "mo"), starts_with("moss", "ms"));
                  return 0;
              }
            `),
          },
          {
            kind: 'problem', problem: {
              id: 'mystr-w1', type: 'write', kcs: ['strsearch', 'ptrarith'],
              prompt: '`strstr` と同じ働きの `my_strstr` を書いてください。見つかればその位置のポインタを、なければ `NULL` を返します。`string.h` の関数は使わずに書きます。',
              starter: src(r`
                #include <stdio.h>

                char *my_strstr(char *s, char *p) {
                    // ここに書く
                    return NULL;
                }

                int main(void) {
                    char s[256], p[256];
                    scanf("%255s %255s", s, p);
                    char *r = my_strstr(s, p);
                    if (r == NULL) printf("none\n");
                    else printf("%d\n", (int)(r - s));
                    return 0;
                }
              `),
              solution: src(r`
                #include <stdio.h>

                char *my_strstr(char *s, char *p) {
                    for (; *s != '\0'; s++) {
                        char *a = s, *b = p;
                        while (*b != '\0' && *a == *b) {
                            a++;
                            b++;
                        }
                        if (*b == '\0') return s;
                    }
                    return NULL;
                }

                int main(void) {
                    char s[256], p[256];
                    scanf("%255s %255s", s, p);
                    char *r = my_strstr(s, p);
                    if (r == NULL) printf("none\n");
                    else printf("%d\n", (int)(r - s));
                    return 0;
                }
              `),
              tests: [{ stdin: 'greenmoss moss' }, { stdin: 'stone moss' }, { stdin: 'aaab aab' }, { stdin: 'mos moss', hidden: true }, { stdin: 'abc c', hidden: true }],
              hints: [
                '外側のくり返しで開始位置 s を 1 つずつ進め、内側で starts_with と同じ比べ方をします。',
                '`*a == *b` を調べる前に、s のほうが先に終わる場合(`*a` が `\\0`)も考えてください。`*a == *b` で比べていれば、`\\0` と p の文字は違うので自然に止まります。',
                '見つからないまま s の終わりまで来たら `NULL` を返します。',
              ],
            },
          },
        ],
      }],
      check: [{
        id: 'mystr-k1', type: 'write', kcs: ['strsearch', 'ptrarith'],
        prompt: '仕上げです。大文字と小文字を区別せずに探すミニ grep(`grep -i` と同じ動き)を作ってください。1 行目が探す文字列、2 行目からが本文で、見つかった行を `行番号: 行` の形で表示します。',
        starter: src(r`
          #include <stdio.h>
          #include <ctype.h>

          int main(void) {
              char pat[256], line[256];
              return 0;
          }
        `),
        solution: src(r`
          #include <stdio.h>
          #include <ctype.h>

          int contains_i(char *s, char *p) {
              for (; *s != '\0'; s++) {
                  char *a = s, *b = p;
                  while (*b != '\0' && tolower(*a) == tolower(*b)) {
                      a++;
                      b++;
                  }
                  if (*b == '\0') return 1;
              }
              return 0;
          }

          int main(void) {
              char pat[256], line[256];
              fgets(pat, 256, stdin);
              for (char *q = pat; *q != '\0'; q++) {
                  if (*q == '\n') *q = '\0';
              }
              int no = 0;
              while (fgets(line, 256, stdin) != NULL) {
                  no++;
                  if (contains_i(line, pat)) printf("%d: %s", no, line);
              }
              return 0;
          }
        `),
        tests: [{ stdin: 'moss\nGreen MOSS\nstone\nMossy rock\n' }, { stdin: 'X\nnone\n' }, { stdin: 'aB\nab\nAB\nba\n', hidden: true }],
        hints: ['my_strstr の比べる所を `tolower(*a) == tolower(*b)` に変えます。', '探す文字列の改行を消すのを忘れずに。'],
      }],
    },
  ],
};
