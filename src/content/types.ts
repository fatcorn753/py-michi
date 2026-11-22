// 教材のデータ形式。正解の出力は書かず、インタプリタで実行して求める(教材と実行結果がずれないように)

/** 変数の範囲。問題を出すたびに値を変えて、答えの丸暗記を防ぐ */
export type Params = Record<string, [number, number] | string[]>;

interface ProblemBase {
  id: string;
  /** 知識要素(KC)。習得度はこの単位で推定する */
  kcs: string[];
  prompt: string;
  params?: Params;
  /** 解いた後に見せる解説 */
  explain?: string;
}

export interface TestCase {
  stdin?: string;
  /** 省略すると参照解の出力を正解にする */
  expect?: string;
  hidden?: boolean;
  /** 行頭の `名前 = …` の最初の 1 行を、この値に置き換えて動かす。数字の直書きで通るのを防ぐ */
  set?: Record<string, string>;
  /** 末尾に足して動かすコード。関数を別の引数でも呼んで確かめる */
  append?: string;
}

export type Problem = ProblemBase & (
  /** 出力の予測(PRIMM の Predict)。答えた後に実行して確かめる */
  | { type: 'predict'; code: string; stdin?: string }
  /** 選択肢。choices[i] に、それを選んだ人向けの説明を付ける */
  | { type: 'choice'; code?: string; choices: { text: string; why: string }[]; answer: number }
  /** トレース表。line の行に来た時点の変数の値を、来た順に埋める */
  | { type: 'trace'; code: string; line: number; vars: string[]; stdin?: string }
  /** 行の並べ替え。distractors は使わない行(よくある誤り) */
  | { type: 'parsons'; lines: string[]; distractors?: string[]; before?: string; after?: string; tests: TestCase[] }
  /** 穴埋め。code の中の ___ を埋める。answers は参照解(採点は実行結果で行う) */
  | { type: 'fill'; code: string; answers: string[]; tests: TestCase[] }
  /** 白紙から書く・直す。solution は参照解 */
  | { type: 'write'; starter: string; solution: string; tests: TestCase[]; hints: string[] }
);

export type Step =
  | { kind: 'read'; title: string; body: string; /** サブゴールの注釈付きの例題。ステップ実行で見せる */ example?: string; stdin?: string }
  | { kind: 'problem'; problem: Problem };

export interface Lesson { id: string; title: string; steps: Step[] }

export interface Unit {
  id: string;
  title: string;
  summary: string;
  kcs: string[];
  lessons: Lesson[];
  /** 確認テスト。合格すると次の単元が開く */
  check: Problem[];
}

export interface KC { id: string; label: string; /** 混同しやすい KC(交互練習で一緒に出す) */ confusable?: string[] }

export interface Course {
  id: string;
  title: string;
  summary: string;
  units: Unit[];
}
