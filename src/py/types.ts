// Python 実行の結果の形。オブジェクトは id(文字列)で参照し合う

export interface PyRunOptions {
  /** input() に渡す行(改行区切り) */
  stdin?: string;
  /** この行数を超えたら止める(無限ループ対策の 1 段目) */
  maxSteps?: number;
  /** 記録するステップの上限 */
  maxTrace?: number;
}

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
}
