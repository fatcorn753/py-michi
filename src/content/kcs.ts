import type { KC } from './types';

/** 知識要素。習得度はこの単位で推定し、診断と復習もこの単位で選ぶ */
export const KCS: KC[] = [
  { id: 'var', label: '変数への代入と値の変化' },
  { id: 'printf', label: 'printf の書式' },
  { id: 'intdiv', label: '整数の割り算と余り', confusable: ['printf'] },
  { id: 'if', label: 'if と else if の流れ' },
  { id: 'eqassign', label: '= と == の違い', confusable: ['if'] },
  { id: 'logic', label: 'かつ・または・範囲の書き方' },
  { id: 'for', label: 'for 文の回り方' },
  { id: 'while', label: 'while 文と終わる条件', confusable: ['for'] },
  { id: 'offbyone', label: '繰り返しの回数(1 つずれ)' },
  { id: 'array', label: '配列の添字' },
  { id: 'bounds', label: '配列の範囲外', confusable: ['offbyone'] },
  { id: 'string', label: '文字列と終わりの \\0' },
  { id: 'func', label: '関数の定義と呼び出し' },
  { id: 'byvalue', label: '引数は値のコピー', confusable: ['ptrparam'] },
  { id: 'return', label: '戻り値と再帰' },
  { id: 'addr', label: 'アドレスとポインタ' },
  { id: 'deref', label: '* で指す先を読み書きする', confusable: ['addr'] },
  { id: 'ptrarith', label: 'ポインタの足し算と配列', confusable: ['array'] },
  { id: 'ptrparam', label: 'ポインタ引数で呼び出し元を変える' },
  { id: 'malloc', label: 'malloc と free' },
  { id: 'getchar', label: 'getchar と EOF' },
  { id: 'state', label: '状態を覚える変数' },
  { id: 'fgets', label: 'fgets で 1 行ずつ読む' },
  { id: 'strsearch', label: '文字列の中を探す' },
];
