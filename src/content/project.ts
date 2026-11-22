// 作品コース「テキスト集計ツール」。文章を読み、単語を数えて、多い順に表で出す道具を作る
import type { Course } from './types';
import { L, r, src } from './util';

const SAMPLE = 'the cat sat on the mat\nThe dog sat on the log\na cat and a dog';

export const PROJECT: Course = {
  id: 'tally',
  title: '作品: テキスト集計ツール',
  summary: '文章を読み込み、単語ごとの回数を数えて、多い順に表で出す道具を作ります。本編の「名前とオブジェクト」まで終えると取り組めます。',
  units: [
    {
      id: 'words', title: '文章を単語に分ける',
      summary: '入力をまとめて読み、行と単語に分けます。大文字と小文字、記号をそろえます。',
      kcs: ['split', 'string'],
      lessons: [{
        id: 'l1', title: '読んで、分けて、そろえる',
        steps: [
          {
            kind: 'read', title: 'sys.stdin.read() と split()',
            body: L(
              '- このコースでは、文章を読み込んで「どの単語が何回出たか」を表にする道具を作ります。',
              '- `sys.stdin.read()` は、入力をすべてまとめて 1 つの文字列として読みます(`import sys` が要ります)。',
              '- `text.split()` は空白と改行で区切って、単語のリストにします。`text.splitlines()` は行ごとに分けます。',
              '- `w.lower()` で小文字にそろえ、`w.strip(".,!?")` で両端の記号を取り除きます。どちらも新しい文字列を返します。',
            ),
            example: src(r`
              import sys
              # 1. 入力をまとめて読む
              text = sys.stdin.read()
              # 2. 行と単語に分ける
              lines = text.splitlines()
              words = text.split()
              # 3. 小文字にそろえる
              first = words[0].lower()
              print(len(lines), len(words), first)
            `),
            stdin: 'Hello world.\nHello, Python!',
          },
          {
            kind: 'problem', problem: {
              id: 'words-p1', type: 'predict', kcs: ['split'],
              prompt: '出力を予測してください。',
              code: src(r`
                text = "  red  green\nblue  "
                a = text.split()
                b = text.split(" ")
                print(len(a), a)
                print(len(b))
              `),
              explain: '引数なしの split() は、続いた空白や改行をまとめて 1 つの区切りとし、両端の空白も無視します。split(" ") は空白 1 つずつで区切るので、空の文字列が混ざります。',
            },
          },
          {
            kind: 'problem', problem: {
              id: 'words-w1', type: 'write', kcs: ['split', 'string'],
              prompt: '入力をすべて読み、両端の `.,!?` を取り除いて小文字にした単語を、1 行に 1 つずつ表示してください。',
              starter: src(r`
                import sys
                text = sys.stdin.read()
                # ここに書く
              `),
              solution: src(r`
                import sys
                text = sys.stdin.read()
                for w in text.split():
                    print(w.strip(".,!?").lower())
              `),
              tests: [{ stdin: 'Hello world.\nHello, Python!' }, { stdin: 'One. TWO? three!' }],
              hints: ['`for w in text.split():` で 1 語ずつ取り出します。', '`w.strip(".,!?").lower()` のように、メソッドは続けて呼べます。'],
            },
          },
        ],
      }],
      check: [
        {
          id: 'words-k1', type: 'fill', kcs: ['split', 'string'],
          prompt: '入力の行数と単語数を `行 3 単語 12` の形で表示します。空欄を埋めてください。',
          code: src(r`
            import sys
            text = sys.stdin.read()
            n_lines = len(text.___())
            n_words = len(text.___())
            print("行", n_lines, "単語", n_words)
          `),
          answers: ['splitlines', 'split'],
          tests: [{ stdin: SAMPLE }, { stdin: 'just one line' }],
        },
        {
          id: 'words-k2', type: 'choice', kcs: ['string'],
          prompt: '`w = "Cat."` のあと `w.strip(".")` だけを書いて、`print(w)` しました。何が表示されますか。',
          choices: [
            { text: 'Cat', why: 'strip は新しい文字列を返すだけです。`w = w.strip(".")` と受け取る必要があります。' },
            { text: 'Cat.', why: 'そのとおりです。文字列は変えられないので、w は元のままです。' },
            { text: 'cat', why: 'strip は小文字にはしません。小文字にするのは lower() です。' },
          ],
          answer: 1,
        },
      ],
    },
    {
      id: 'count', title: '辞書で数える',
      summary: '単語をキー、回数を値にした辞書を作ります。',
      kcs: ['dict', 'count'],
      lessons: [{
        id: 'l1', title: '辞書の読み書き',
        steps: [
          {
            kind: 'read', title: 'counts[w] = counts.get(w, 0) + 1',
            body: L(
              '- 辞書 `{}` は「キー → 値」の組を持ちます。`d["cat"] = 2` で書き、`d["cat"]` で読みます。',
              '- ないキーを `d["dog"]` で読むと KeyError です。`d.get("dog", 0)` なら、ないときに 0 を返します。',
              '- 数えるときの決まった形は `counts[w] = counts.get(w, 0) + 1` です。',
              '- `for w, n in counts.items():` で、キーと値の組を順に取り出せます。',
              '',
              '図では、辞書の箱の中にキーと値の組が並び、数えるたびに増えていく様子が見えます。',
            ),
            example: src(r`
              words = ["cat", "dog", "cat", "cat"]
              # 1. 空の辞書から始める
              counts = {}
              for w in words:
                  # 2. なければ 0、あればその値に 1 を足す
                  counts[w] = counts.get(w, 0) + 1
              # 3. 組を順に取り出す
              for w, n in counts.items():
                  print(w, n)
            `),
          },
          {
            kind: 'problem', problem: {
              id: 'count-t1', type: 'trace', kcs: ['count', 'dict'],
              prompt: '4 行目に来るたびに、その行を実行する前の w と counts の値を書いてください。',
              params: { w: ['a', 'b'] },
              code: src(r`
                words = ["a", "$w", "a"]
                counts = {}
                for w in words:
                    counts[w] = counts.get(w, 0) + 1
                print(counts)
              `),
              line: 4, vars: ['w', 'counts'],
            },
          },
          {
            kind: 'problem', problem: {
              id: 'count-c1', type: 'choice', kcs: ['dict'],
              prompt: '`counts = {}` のあと、いきなり `counts["cat"] += 1` と書くとどうなりますか。',
              choices: [
                { text: 'counts["cat"] が 1 になる', why: '`+=` は、まず今の値を読みます。まだ "cat" がないので読めません。' },
                { text: 'KeyError になる', why: 'そのとおりです。初めての単語では、get(w, 0) のように「ないときは 0」とします。' },
                { text: 'counts["cat"] が None になる', why: 'ないキーを [] で読むと、None ではなくエラーになります。' },
              ],
              answer: 1,
            },
          },
          {
            kind: 'problem', problem: {
              id: 'count-w1', type: 'write', kcs: ['count', 'split'],
              prompt: '入力の単語を小文字にそろえて数え、出てきた順に `単語 回数` を 1 行ずつ表示してください。',
              starter: src(r`
                import sys
                text = sys.stdin.read()
                counts = {}
                # ここに書く
              `),
              solution: src(r`
                import sys
                text = sys.stdin.read()
                counts = {}
                for w in text.split():
                    w = w.lower()
                    counts[w] = counts.get(w, 0) + 1
                for w, n in counts.items():
                    print(w, n)
              `),
              tests: [{ stdin: SAMPLE }, { stdin: 'b a B a A' }],
              hints: ['数える形は `counts[w] = counts.get(w, 0) + 1` です。', '辞書は、キーを入れた順を覚えています。`counts.items()` で順に取り出します。'],
            },
          },
        ],
      }],
      check: [
        {
          id: 'count-k1', type: 'predict', kcs: ['count', 'dict'],
          prompt: '出力を予測してください。',
          params: { a: ['x', 'y'] },
          code: src(r`
            counts = {}
            for ch in "$a" + "yxzy":
                counts[ch] = counts.get(ch, 0) + 1
            print(counts)
            print(counts.get("w", 0), len(counts))
          `),
        },
        {
          id: 'count-k2', type: 'parsons', kcs: ['count'],
          prompt: '入力の文字(空白と改行を除く)ごとの回数を数え、辞書をそのまま表示します。行を並べてください。',
          lines: [
            'import sys',
            'counts = {}',
            'for ch in sys.stdin.read():',
            '    if ch.isspace():',
            '        continue',
            '    counts[ch] = counts.get(ch, 0) + 1',
            'print(counts)',
          ],
          distractors: ['    counts[ch] += 1', 'counts = []'],
          tests: [{ stdin: 'abca b' }, { stdin: 'xx\ny' }],
        },
      ],
    },
    {
      id: 'rank', title: '多い順に並べて表にする',
      summary: 'sorted と key で並べ替え、桁をそろえて表示して、道具を仕上げます。',
      kcs: ['sort', 'format', 'func'],
      lessons: [{
        id: 'l1', title: '並べて、そろえて、仕上げる',
        steps: [
          {
            kind: 'read', title: 'sorted(..., key=...) と f"{x:>5}"',
            body: L(
              '- `sorted(リスト)` は並べ替えた**新しいリスト**を返します。元のリストは変わりません。',
              '- `sorted(counts.items(), key=lambda p: p[1], reverse=True)` で、(単語, 回数) の組を回数の多い順に並べます。`lambda p: p[1]` は「組の 2 番目で比べる」という小さな関数です。',
              '- 回数が同じなら単語の順にしたいときは `key=lambda p: (-p[1], p[0])` とします。',
              '- `f"{w:<8}{n:>3}"` は、w を 8 文字分の幅に左寄せ、n を 3 文字分に右寄せで表示します。',
            ),
            example: src(r`
              counts = {"cat": 2, "the": 4, "a": 2, "dog": 1}
              # 1. 回数の多い順、同じなら単語の順
              ranked = sorted(counts.items(), key=lambda p: (-p[1], p[0]))
              # 2. 上位 3 つを、幅をそろえて表示する
              for w, n in ranked[:3]:
                  print(f"{w:<5}{n:>3}")
            `),
          },
          {
            kind: 'problem', problem: {
              id: 'rank-p1', type: 'predict', kcs: ['sort'],
              prompt: '出力を予測してください。',
              code: src(r`
                nums = [3, 1, 2]
                a = sorted(nums)
                b = sorted(nums, reverse=True)
                print(nums, a, b)
                words = ["bb", "a", "ccc"]
                print(sorted(words, key=len))
              `),
              explain: 'sorted は新しいリストを返すので、nums は元の順のままです。key=len は「長さで比べる」という意味です。',
            },
          },
          {
            kind: 'problem', problem: {
              id: 'rank-f1', type: 'fill', kcs: ['sort', 'format'],
              prompt: '辞書の中身を回数の多い順(同じなら単語の順)に並べ、単語を 6 文字幅の左寄せ、回数を 3 文字幅の右寄せで表示します。空欄を埋めてください。',
              code: src(r`
                counts = {"sat": 2, "the": 4, "on": 2, "mat": 1}
                ranked = sorted(counts.items(), key=lambda p: (___, p[0]))
                for w, n in ranked:
                    print(f"{w:___}{n:>3}")
              `),
              answers: ['-p[1]', '<6'],
              tests: [{}],
            },
          },
          {
            kind: 'problem', problem: {
              id: 'rank-w1', type: 'write', kcs: ['sort', 'format', 'count', 'func'],
              prompt: L(
                '仕上げです。入力の文章について、単語(両端の `.,!?` を取り除き、小文字にそろえる)を数え、回数の多い順(同じなら単語の順)に**上位 3 つ**を表示してください。',
                '各行は、単語を 8 文字幅の左寄せ、回数を 3 文字幅の右寄せにします。数える部分は関数 `count_words(text)` に分け、辞書を返すようにしてください。',
              ),
              starter: src(r`
                import sys

                def count_words(text):
                    counts = {}
                    # ここに書く
                    return counts

                counts = count_words(sys.stdin.read())
                # 並べて、上位 3 つを表示する
              `),
              solution: src(r`
                import sys

                def count_words(text):
                    counts = {}
                    for w in text.split():
                        w = w.strip(".,!?").lower()
                        if w:
                            counts[w] = counts.get(w, 0) + 1
                    return counts

                counts = count_words(sys.stdin.read())
                ranked = sorted(counts.items(), key=lambda p: (-p[1], p[0]))
                for w, n in ranked[:3]:
                    print(f"{w:<8}{n:>3}")
              `),
              tests: [
                { stdin: SAMPLE },
                { stdin: 'Go, go, GO! Stop. stop' },
                { stdin: 'b a c b a b', hidden: true },
              ],
              hints: [
                '数える部分は、前の単元の `counts[w] = counts.get(w, 0) + 1` に、strip と lower を足したものです。',
                '並べるのは `sorted(counts.items(), key=lambda p: (-p[1], p[0]))`、上位 3 つは `[:3]` です。',
                '表示は `print(f"{w:<8}{n:>3}")` です。',
              ],
            },
          },
        ],
      }],
      check: [
        {
          id: 'rank-k1', type: 'choice', kcs: ['sort'],
          prompt: '`a = [3, 1, 2]` のあと `sorted(a)` だけを実行し、`print(a)` しました。何が表示されますか。',
          choices: [
            { text: '[1, 2, 3]', why: 'sorted は新しいリストを返すだけです。a を並べ替えたいなら `a.sort()` を使います。' },
            { text: '[3, 1, 2]', why: 'そのとおりです。a は変わりません。' },
            { text: 'None', why: 'None を返すのは `a.sort()` の方です(a 自身を並べ替え、戻り値は None)。' },
          ],
          answer: 1,
        },
        {
          id: 'rank-k2', type: 'predict', kcs: ['format'],
          prompt: '出力を予測してください(空白の数も正確に書きます)。',
          params: { n: [1, 9] },
          code: src(r`
            print(f"[{'ab':<4}]")
            print(f"[{$n:>3}]")
            print(f"[{'x':^5}]")
          `),
        },
      ],
    },
  ],
};
