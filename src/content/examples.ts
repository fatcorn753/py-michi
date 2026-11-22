// 「自由に書く」で読み込める例(Python)
import { r, src } from './util';

export const EXAMPLES: { title: string; code: string; stdin?: string }[] = [
  {
    title: 'はじめの一歩',
    code: src(r`
      n = 5
      for i in range(1, n + 1):
          print(i, 'の 2 乗は', i * i)
    `),
  },
  {
    title: '入力を読む',
    code: src(r`
      a = int(input())
      b = int(input())
      print('合計', a + b)
    `),
    stdin: '3\n4',
  },
  {
    title: 'b = a はコピーしない',
    code: src(r`
      a = [1, 2, 3]
      b = a
      b.append(4)
      print(a)
      c = a.copy()
      c.append(5)
      print(a, c)
    `),
  },
  {
    title: '関数の中でリストを変える',
    code: src(r`
      def add_bonus(scores):
          for i in range(len(scores)):
              scores[i] += 10

      mine = [60, 75]
      add_bonus(mine)
      print(mine)
    `),
  },
  {
    title: '既定引数の [] は使い回される',
    code: src(r`
      def add(item, box=[]):
          box.append(item)
          return box

      x = add('りんご')
      y = add('みかん')
      print(x, y, x is y)
    `),
  },
  {
    title: '単語を数える',
    code: src(r`
      text = 'the cat and the dog and the bird'
      counts = {}
      for word in text.split():
          counts[word] = counts.get(word, 0) + 1
      for word, n in sorted(counts.items(), key=lambda p: -p[1]):
          print(word, n)
    `),
  },
  {
    title: '家計簿アプリ(画面あり)',
    code: src(r`
      import ui

      if "items" not in ui.state:
          ui.state["items"] = []

      ui.title("家計簿")
      name = ui.text_input("品名")
      price = ui.number_input("金額")
      kind = ui.selectbox("分類", ["食費", "日用品", "その他"])
      if ui.button("追加") and name:
          ui.state["items"].append({"品名": name, "分類": kind, "金額": price})

      items = ui.state["items"]
      ui.table(items)
      ui.metric("合計", sum(x["金額"] for x in items))
      by_kind = {}
      for x in items:
          by_kind[x["分類"]] = by_kind.get(x["分類"], 0) + x["金額"]
      ui.bar_chart(by_kind)
    `),
  },
  {
    title: '範囲外の番号(わざと誤り)',
    code: src(r`
      a = [1, 2, 3]
      for i in range(4):
          print(a[i])
    `),
  },
];
