// Python 実行の結果の形。オブジェクトは id(文字列)で参照し合う

export interface PyRunOptions {
  /** input() に渡す行(改行区切り) */
  stdin?: string;
  /** この行数を超えたら止める(無限ループ対策の 1 段目) */
  maxSteps?: number;
  /** 記録するステップの上限 */
  maxTrace?: number;
  /** ui を使うアプリとして動かす。部品の値・押したボタン・持ち越す state を渡す */
  app?: AppInput;
}

export interface AppInput {
  /** 部品の id(ふつうはラベル)→ 値 */
  inputs: Record<string, string | number>;
  /** この実行の直前に押したボタンの id */
  clicked: string | null;
  state: unknown;
}

/** ui の部品 1 つ。実行のたびに上から並べ直したもの */
export type UiElement =
  | { kind: 'title' | 'header' | 'write'; text: string }
  | { kind: 'divider' }
  | { kind: 'text_input'; id: string; label: string; value: string }
  | { kind: 'number_input'; id: string; label: string; value: number }
  | { kind: 'selectbox'; id: string; label: string; value: string; options: string[] }
  | { kind: 'button'; id: string; label: string }
  | { kind: 'table'; columns: string[] | null; rows: string[][] }
  | { kind: 'bar_chart'; data: [string, number][] }
  | { kind: 'metric'; label: string; text: string };

export interface AppOutput { elements: UiElement[]; state: unknown }

export interface HeapEntry {
  type: string;
  repr?: string;
  items?: string[];
  pairs?: [string, string][];
  attrs?: [string, string][];
  truncated?: number;
}

export interface Frame {
  name: string;
  line: number;
  /** [名前, オブジェクト id] */
  locals: [string, string][];
}

export interface Step {
  event: 'line' | 'return';
  line: number;
  frames: Frame[];
  heap: Record<string, HeapEntry>;
  /** heap の id を、名前から辿った順に並べたもの */
  order: string[];
  /** 関数から戻るときの戻り値の id */
  ret: string | null;
  /** この時点までの出力の長さ */
  stdoutLen: number;
}

export type PyStatus = 'ok' | 'error' | 'step-limit' | 'interrupted' | 'timeout' | 'stopped';

export interface PyRunResult {
  status: PyStatus;
  error: { type: string; message: string; line: number | null } | null;
  steps: number;
  trace: Step[];
  traceTruncated: boolean;
  stdout: string;
  /** アプリとして動かしたときの画面。そうでなければ null */
  app: AppOutput | null;
}
