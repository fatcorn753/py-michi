// 学習者に見せるエラー。kind で「コンパイル時」「実行時」を分ける。
export type ErrorKind = 'compile' | 'runtime' | 'limit';

/** 実行時エラーの種類。解説と、復習で弱点を数えるのに使う */
export type RuntimeCode =
  | 'out-of-bounds' | 'use-after-free' | 'double-free' | 'bad-free' | 'uninit' | 'null-deref'
  | 'div-zero' | 'overflow' | 'stack-overflow' | 'step-limit' | 'bad-pointer' | 'no-input' | 'other';

export class CError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
    public line: number,
    public col = 0,
    public code: RuntimeCode = 'other',
    /** 何が起きたかを図で示すための補足(どのブロックのどこを触ったか) */
    public detail?: { blockId?: number; offset?: number; size?: number },
  ) {
    super(message);
  }
}
