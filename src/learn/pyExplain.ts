// Python の例外の種類ごとに、日本語でもう一歩踏み込んだ説明をする。
// 例外のメッセージ本文は英語のまま見せ、読み方を覚えてもらう
const TEXT: Record<string, string> = {
  SyntaxError: '書き方の誤りです。カッコやコロン(:)の閉じ忘れ、引用符の閉じ忘れがないか、示した行とその 1 つ前の行を確かめてください。',
  IndentationError: '字下げの誤りです。if・for・def の次の行は字下げが要ります。同じかたまりの行は、字下げの深さをそろえます。',
  TabError: 'タブと空白が混ざっています。字下げは空白 4 つにそろえてください。',
  NameError: 'まだ作っていない名前を使いました。つづりの誤りか、代入より前に使っていないかを確かめてください。',
  UnboundLocalError: '関数の中で代入した名前は、その関数の中だけの名前になります。代入より前に読もうとしています。',
  TypeError: '型が合わない使い方です。たとえば文字列と数を + で足すことはできません。str() や int() で型をそろえます。',
  ValueError: '型は合っていますが、値が使えません。たとえば int("abc") は数に直せません。',
  IndexError: '範囲外の番号を使いました。長さ n のリストで使える番号は 0 から n-1 までです。',
  KeyError: '辞書にないキーを読みました。in で確かめるか、get() を使うと止まりません。',
  AttributeError: 'そのオブジェクトにない属性やメソッドを使いました。型が思っているものと違うことがよくあります。',
  ZeroDivisionError: '0 で割りました。割る前に 0 でないか確かめてください。',
  RecursionError: '再帰が深くなりすぎました。終わりの条件(基底条件)に必ず届くか確かめてください。',
  EOFError: 'input() で読む行が足りません。「入力」の欄に、読む分の行を書いてください。',
  ModuleNotFoundError: 'そのモジュールはこのサイトでは使えません。標準ライブラリの多くは使えます。',
  AssertionError: 'assert で書いた条件が成り立ちませんでした。',
};

export function explainPyError(type: string): string | undefined {
  return TEXT[type];
}
