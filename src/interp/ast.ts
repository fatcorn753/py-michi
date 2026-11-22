// 構文木。sema が ty(式の型)と sym(名前の解決先)を書き込む
import type { CType } from './types';

export interface Sym {
  name: string;
  ty: CType;
  kind: 'local' | 'global' | 'func' | 'builtin';
  id: number;
  line: number;
  /** 可変長配列の長さを実行時に決める式 */
  vlaLen?: Expr;
  fn?: FuncDef;
  decl?: Declarator;
}

interface Base { line: number; col: number; ty?: CType }

export type Expr = Base & (
  | { k: 'num'; v: number }
  | { k: 'float'; v: number }
  | { k: 'str'; v: string }
  | { k: 'id'; name: string; sym?: Sym }
  | { k: 'bin'; op: string; l: Expr; r: Expr }
  | { k: 'assign'; op: string; l: Expr; r: Expr }
  | { k: 'un'; op: string; e: Expr }
  | { k: 'incdec'; op: '++' | '--'; prefix: boolean; e: Expr }
  | { k: 'call'; name: string; args: Expr[]; sym?: Sym }
  | { k: 'index'; a: Expr; i: Expr }
  | { k: 'cond'; c: Expr; a: Expr; b: Expr }
  | { k: 'cast'; to: CType; e: Expr }
  | { k: 'sizeof'; t?: CType; e?: Expr }
  | { k: 'comma'; l: Expr; r: Expr }
  | { k: 'initlist'; items: Expr[] }
);

export interface Declarator {
  name: string;
  ty: CType;
  init?: Expr;
  vlaLen?: Expr;
  line: number;
  col: number;
  sym?: Sym;
}

export type Stmt = { line: number; col: number } & (
  | { k: 'expr'; e: Expr }
  | { k: 'decl'; decls: Declarator[] }
  | { k: 'block'; body: Stmt[] }
  | { k: 'if'; c: Expr; t: Stmt; e?: Stmt }
  | { k: 'while'; c: Expr; b: Stmt }
  | { k: 'dowhile'; c: Expr; b: Stmt }
  | { k: 'for'; init?: Stmt; c?: Expr; step?: Expr; b: Stmt }
  | { k: 'return'; e?: Expr }
  | { k: 'break' }
  | { k: 'continue' }
  | { k: 'switch'; e: Expr; body: Stmt[] }
  | { k: 'case'; v: Expr | null; cv?: number }
  | { k: 'empty' }
);

export interface FuncDef {
  name: string;
  ty: CType & { k: 'func' };
  params: Declarator[];
  body: Stmt & { k: 'block' };
  line: number;
}

export interface Program {
  funcs: FuncDef[];
  globals: Declarator[];
  protos: { name: string; ty: CType; line: number }[];
}
