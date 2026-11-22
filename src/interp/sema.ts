// 名前の解決と型の計算。本物のコンパイラが出す警告のうち、初学者がつまずくものを日本語で出す
import { fromBytes } from './bytes';
import type { Declarator, Expr, FuncDef, Program, Stmt, Sym } from './ast';
import { CError } from './errors';
import {
  T, arithResult, decay, isArith, isInt, isScalar, promote, ptrTo, typeName, type CType,
} from './types';

export interface Warning { line: number; msg: string }

const cp = ptrTo(T.char);
const vp = ptrTo(T.void);
const F = (ret: CType, params: CType[], variadic = false): CType => ({ k: 'func', ret, params, variadic });

export const BUILTINS: Record<string, CType> = {
  printf: F(T.int, [cp], true), scanf: F(T.int, [cp], true), puts: F(T.int, [cp]), putchar: F(T.int, [T.int]),
  getchar: F(T.int, []), fgets: F(cp, [cp, T.int, vp]),
  strlen: F(T.ulong, [cp]), strcpy: F(cp, [cp, cp]), strncpy: F(cp, [cp, cp, T.ulong]), strcmp: F(T.int, [cp, cp]),
  strncmp: F(T.int, [cp, cp, T.ulong]), strcat: F(cp, [cp, cp]), strchr: F(cp, [cp, T.int]), strstr: F(cp, [cp, cp]),
  malloc: F(vp, [T.ulong]), calloc: F(vp, [T.ulong, T.ulong]), realloc: F(vp, [vp, T.ulong]), free: F(T.void, [vp]),
  memset: F(vp, [vp, T.int, T.ulong]), memcpy: F(vp, [vp, vp, T.ulong]),
  abs: F(T.int, [T.int]), atoi: F(T.int, [cp]), exit: F(T.void, [T.int]), rand: F(T.int, []), srand: F(T.void, [T.uint]),
  isdigit: F(T.int, [T.int]), isalpha: F(T.int, [T.int]), isspace: F(T.int, [T.int]), isupper: F(T.int, [T.int]),
  islower: F(T.int, [T.int]), isalnum: F(T.int, [T.int]), toupper: F(T.int, [T.int]), tolower: F(T.int, [T.int]),
  sqrt: F(T.double, [T.double]), pow: F(T.double, [T.double, T.double]), fabs: F(T.double, [T.double]),
  floor: F(T.double, [T.double]), ceil: F(T.double, [T.double]),
};

/** ヘッダーが定義する定数。stdin は特別なポインタ値として扱う */
const CONSTS: Record<string, { v: number; ty: CType }> = {
  NULL: { v: 0, ty: vp }, EOF: { v: -1, ty: T.int }, true: { v: 1, ty: T.int }, false: { v: 0, ty: T.int },
  INT_MAX: { v: 2147483647, ty: T.int }, INT_MIN: { v: -2147483648, ty: T.int }, RAND_MAX: { v: 32767, ty: T.int },
  CHAR_MAX: { v: 127, ty: T.int }, CHAR_MIN: { v: -128, ty: T.int }, LONG_MAX: { v: Number.MAX_SAFE_INTEGER, ty: T.long },
  EXIT_SUCCESS: { v: 0, ty: T.int }, EXIT_FAILURE: { v: 1, ty: T.int }, stdin: { v: -2, ty: vp },
};

export interface Checked {
  prog: Program;
  warnings: Warning[];
  globals: Sym[];
  funcs: Map<string, Sym>;
}

export function check(prog: Program): Checked {
  return new Sema(prog).run();
}

class Sema {
  private warnings: Warning[] = [];
  private scopes: Map<string, Sym>[] = [];
  private funcs = new Map<string, Sym>();
  private globals: Sym[] = [];
  private nextId = 1;
  private curFn: FuncDef | null = null;
  private loopDepth = 0;
  private switchDepth = 0;

  constructor(private prog: Program) {}

  private warn(line: number, msg: string) {
    if (!this.warnings.some((w) => w.line === line && w.msg === msg)) this.warnings.push({ line, msg });
  }
  private err(n: { line: number; col?: number }, msg: string): never {
    throw new CError('compile', msg, n.line, n.col ?? 0);
  }

  run(): Checked {
    for (const p of this.prog.protos) this.declareFunc(p.name, p.ty, p.line);
    for (const f of this.prog.funcs) {
      const s = this.declareFunc(f.name, f.ty, f.line);
      if (s.fn) this.err(f, `関数「${f.name}」が 2 回定義されています。片方の名前を変えるか、消してください。`);
      s.fn = f;
    }
    this.scopes.push(new Map());
    // 関数より前に書かれた大域変数だけでなく、全部を先に登録する(第 1 版では書く順を問わない)
    for (const g of this.prog.globals) {
      const s = this.declare(g, 'global');
      if (g.init) this.checkInit(g, s.ty);
      this.globals.push(s);
    }
    if (!this.funcs.get('main')?.fn) {
      throw new CError('compile', 'main 関数がありません。プログラムは int main(void) { ... } から始まります。', 1);
    }
    for (const f of this.prog.funcs) this.func(f);
    return { prog: this.prog, warnings: this.warnings.sort((a, b) => a.line - b.line), globals: this.globals, funcs: this.funcs };
  }

  private declareFunc(name: string, ty: CType, line: number): Sym {
    if (BUILTINS[name]) this.err({ line }, `「${name}」は標準ライブラリの関数と同じ名前です。別の名前にしてください。`);
    const old = this.funcs.get(name);
    if (old) return old;
    const s: Sym = { name, ty, kind: 'func', id: this.nextId++, line };
    this.funcs.set(name, s);
    return s;
  }

  private declare(d: Declarator, kind: 'local' | 'global'): Sym {
    const scope = this.scopes[this.scopes.length - 1];
    if (scope.has(d.name)) this.err(d, `変数「${d.name}」が同じブロックの中で 2 回宣言されています(最初は ${scope.get(d.name)!.line} 行目)。`);
    if (CONSTS[d.name] && d.name !== 'true' && d.name !== 'false') this.warn(d.line, `「${d.name}」は標準で使われている名前です。別の名前にすると混乱しません。`);
    if (d.ty.k === 'void') this.err(d, `変数「${d.name}」を void 型にはできません。int などの型にしてください。`);
    let ty = d.ty;
    // int a[] = {1,2,3}; のように長さを省いたときは、初期化子の数から決める
    if (ty.k === 'array' && ty.len === null && !d.vlaLen) {
      if (d.init?.k === 'initlist') ty = { ...ty, len: d.init.items.length };
      else if (d.init?.k === 'str') ty = { ...ty, len: d.init.v.length + 1 };
      else this.err(d, `配列「${d.name}」の大きさが決まっていません。[ ] の中に要素の数を書いてください。`);
      d.ty = ty;
    }
    if (d.vlaLen) this.expr(d.vlaLen);
    const s: Sym = { name: d.name, ty, kind, id: this.nextId++, line: d.line, vlaLen: d.vlaLen, decl: d };
    scope.set(d.name, s);
    d.sym = s;
    return s;
  }

  private lookup(name: string): Sym | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const s = this.scopes[i].get(name);
      if (s) return s;
    }
    return undefined;
  }

  private func(f: FuncDef) {
    this.curFn = f;
    this.scopes.push(new Map());
    for (const p of f.params) {
      if (!p.name) this.err(f, `関数「${f.name}」の引数に名前がありません。`);
      this.declare(p, 'local');
    }
    // 関数の本体は引数と同じスコープにする(引数と同名の変数を本体で宣言するとエラー)
    for (const s of f.body.body) this.stmt(s);
    this.scopes.pop();
    if (f.ty.ret.k !== 'void' && f.name !== 'main' && !this.alwaysReturns(f.body)) {
      this.warn(f.line, `関数「${f.name}」の最後まで進むと、値を返さずに終わります。すべての道で return を書いてください。`);
    }
    this.curFn = null;
  }

  private alwaysReturns(s: Stmt): boolean {
    switch (s.k) {
      case 'return': return true;
      case 'block': return s.body.some((x) => this.alwaysReturns(x));
      case 'if': return !!s.e && this.alwaysReturns(s.t) && this.alwaysReturns(s.e);
      case 'while': case 'for': return (s.k === 'while' ? isConstTrue(s.c) : !s.c || isConstTrue(s.c));
      default: return false;
    }
  }

  private stmt(s: Stmt) {
    switch (s.k) {
      case 'expr': this.expr(s.e); break;
      case 'decl':
        for (const d of s.decls) {
          // 初期化子は宣言より前に調べる(int x = x; は警告にするため)
          const sym = this.declare(d, 'local');
          if (d.init) this.checkInit(d, sym.ty);
        }
        break;
      case 'block':
        this.scopes.push(new Map());
        for (const x of s.body) this.stmt(x);
        this.scopes.pop();
        break;
      case 'if':
        this.cond(s.c);
        this.stmt(s.t);
        if (s.e) this.stmt(s.e);
        break;
      case 'while': case 'dowhile':
        this.cond(s.c);
        this.loopDepth++; this.stmt(s.b); this.loopDepth--;
        break;
      case 'for':
        this.scopes.push(new Map());
        if (s.init) this.stmt(s.init);
        if (s.c) this.cond(s.c);
        if (s.step) this.expr(s.step);
        this.loopDepth++; this.stmt(s.b); this.loopDepth--;
        this.scopes.pop();
        break;
      case 'return': {
        const ret = this.curFn!.ty.ret;
        if (s.e) {
          const t = this.expr(s.e);
          if (ret.k === 'void') this.err(s, `void 型の関数「${this.curFn!.name}」は値を返せません。return; だけにしてください。`);
          this.assignable(ret, t, s.e, '戻り値');
        } else if (ret.k !== 'void') {
          this.err(s, `関数「${this.curFn!.name}」は ${typeName(ret)} 型の値を返す約束です。return の後に値を書いてください。`);
        }
        break;
      }
      case 'break':
        if (this.loopDepth === 0 && this.switchDepth === 0) this.err(s, 'break はループか switch の中でだけ使えます。');
        break;
      case 'continue':
        if (this.loopDepth === 0) this.err(s, 'continue はループの中でだけ使えます。');
        break;
      case 'switch': {
        const t = this.expr(s.e);
        if (!isInt(t)) this.err(s, 'switch で分けられるのは整数(int や char)だけです。');
        this.switchDepth++;
        this.scopes.push(new Map());
        const seen = new Set<number | null>();
        for (const x of s.body) {
          if (x.k === 'case') {
            const key = x.v === null ? null : x.cv ?? null;
            if (seen.has(key)) this.err(x, key === null ? 'default が 2 つあります。' : `case ${key} が 2 回書かれています。`);
            seen.add(key);
          } else this.stmt(x);
        }
        this.scopes.pop();
        this.switchDepth--;
        break;
      }
      case 'case': this.err(s, 'case は switch の中でだけ使えます。'); break;
      case 'empty': break;
    }
  }

  private cond(e: Expr) {
    if (e.k === 'assign' && e.op === '=') {
      this.warn(e.line, '条件の中で「=」(代入)を使っています。値を比べるなら「==」です。');
    }
    const t = this.expr(e);
    if (!isScalar(decay(t))) this.err(e, '条件には数かポインタを書いてください。');
  }

  private checkInit(d: Declarator, ty: CType) {
    const init = d.init!;
    if (ty.k === 'array') {
      if (init.k === 'str') {
        if (!(ty.of.k === 'int' && ty.of.size === 1)) this.err(init, '文字列で初期化できるのは char の配列だけです。');
        if (ty.len !== null && init.v.length > ty.len) this.err(init, `文字列「${fromBytes(init.v)}」(${init.v.length} バイト)は、配列「${d.name}」(${ty.len} バイト)に入りません。`);
        if (ty.len !== null && init.v.length === ty.len) this.warn(init.line, `文字列「${fromBytes(init.v)}」を入れると、終わりの印 '\\0' の入る場所が残りません。配列を 1 つ大きくしてください。`);
        init.ty = ty;
        return;
      }
      if (init.k !== 'initlist') this.err(init, `配列「${d.name}」は { 1, 2, 3 } の形で初期化してください。`);
      if (ty.len !== null && init.items.length > ty.len) this.err(init, `配列「${d.name}」の要素は ${ty.len} 個ですが、初期値が ${init.items.length} 個あります。`);
      for (const it of init.items) {
        if (ty.of.k === 'array') this.checkInit({ ...d, init: it }, ty.of);
        else this.assignable(ty.of, this.expr(it), it, '初期値');
      }
      init.ty = ty;
      return;
    }
    if (init.k === 'initlist') {
      if (init.items.length !== 1) this.err(init, `「${d.name}」は配列ではないので、{ } で複数の値は入れられません。`);
      this.assignable(ty, this.expr(init.items[0]), init.items[0], '初期値');
      return;
    }
    if (init.k === 'id' && init.name === d.name) this.warn(init.line, `「${d.name}」を、自分自身の値で初期化しています。まだ値が入っていません。`);
    this.assignable(ty, this.expr(init), init, '初期値');
  }

  /** 代入できるかを調べる。危ないが動くものは警告、明らかに誤りのものはエラー */
  private assignable(to: CType, from: CType, e: Expr, what: string) {
    const f = decay(from);
    if (to.k === 'array') this.err(e, '配列には = でまとめて代入できません。要素を 1 つずつ入れるか、文字列なら strcpy を使ってください。');
    if (isArith(to) && isArith(f)) {
      if (to.k === 'int' && f.k === 'double' && e.k !== 'float') this.warn(e.line, `double の値を ${typeName(to)} の${what}に入れると、小数点以下が切り捨てられます。`);
      return;
    }
    if (to.k === 'ptr' && f.k === 'ptr') {
      if (to.to.k !== 'void' && f.to.k !== 'void' && typeName(to.to) !== typeName(f.to)) {
        this.warn(e.line, `${typeName(f)} を ${typeName(to)} の${what}に入れています。指す先の型が違います。`);
      }
      return;
    }
    if (to.k === 'ptr' && isInt(f)) {
      if (e.k === 'num' && e.v === 0) return;
      this.warn(e.line, `整数を ${typeName(to)}(ポインタ)の${what}に入れています。アドレスを入れるなら「&変数名」と書きます。`);
      return;
    }
    if (isInt(to) && f.k === 'ptr') {
      this.warn(e.line, `ポインタを ${typeName(to)} の${what}に入れています。指す先の値が欲しいなら「*」を付けます。`);
      return;
    }
    if (to.k === 'void' || f.k === 'void') this.err(e, `void(値なし)は${what}に使えません。`);
  }

  private lvalue(e: Expr, what: string) {
    if (e.k === 'id' || e.k === 'index' || (e.k === 'un' && e.op === '*')) {
      if (e.k === 'id' && e.sym?.kind === 'func') this.err(e, `関数「${e.name}」に${what}ことはできません。`);
      if (e.k === 'id' && e.ty?.k === 'array') this.err(e, `配列「${e.name}」全体に${what}ことはできません。要素を [ ] で指定してください。`);
      return;
    }
    this.err(e, `${what}先は変数か、配列の要素か、*ポインタ である必要があります。`);
  }

  expr(e: Expr): CType {
    const t = this.exprInner(e);
    e.ty = t;
    return t;
  }

  private exprInner(e: Expr): CType {
    switch (e.k) {
      case 'num': return e.ty ?? (Math.abs(e.v) > 2147483647 ? T.long : T.int);
      case 'float': return T.double;
      case 'str': return { k: 'array', of: T.char, len: e.v.length + 1 };
      case 'id': {
        const s = this.lookup(e.name);
        if (s) { e.sym = s; return s.ty; }
        const c = CONSTS[e.name];
        if (c) {
          // 定数は数値リテラルに置き換える
          const ex = e as unknown as { k: string; v: number };
          ex.k = 'num'; ex.v = c.v;
          return c.ty;
        }
        if (this.funcs.has(e.name) || BUILTINS[e.name]) this.err(e, `関数「${e.name}」を呼ぶときは「${e.name}(...)」と括弧を付けてください。`);
        this.err(e, `「${e.name}」という変数は宣言されていません。${this.suggest(e.name)}`);
      }
      // eslint-disable-next-line no-fallthrough
      case 'initlist': this.err(e, '{ } の初期化子は、変数を宣言するときだけ使えます。');
      // eslint-disable-next-line no-fallthrough
      case 'sizeof':
        if (e.e) this.expr(e.e);
        return T.ulong;
      case 'cast': {
        const f = decay(this.expr(e.e));
        if (e.to.k === 'array') this.err(e, '配列の型にはキャストできません。');
        if (e.to.k !== 'void' && !isScalar(f)) this.err(e, `${typeName(f)} は ${typeName(e.to)} にキャストできません。`);
        return e.to;
      }
      case 'comma': this.expr(e.l); return this.expr(e.r);
      case 'cond': {
        this.cond(e.c);
        const a = decay(this.expr(e.a)), b = decay(this.expr(e.b));
        if (isArith(a) && isArith(b)) return arithResult(a, b);
        return a.k === 'ptr' ? a : b;
      }
      case 'index': {
        const a = decay(this.expr(e.a)), i = decay(this.expr(e.i));
        if (a.k === 'ptr' && isInt(i)) {
          if (a.to.k === 'void') this.err(e, 'void * のままでは [ ] を使えません。int * などの型の変数に入れてから使ってください。');
          return a.to;
        }
        if (isInt(a) && i.k === 'ptr') return i.to;
        if (i.k === 'double') this.err(e.i, '配列の添字は整数にしてください(double は使えません)。');
        this.err(e, `「${exprText(e.a)}」は配列でもポインタでもないので [ ] を使えません。`);
      }
      // eslint-disable-next-line no-fallthrough
      case 'un': {
        if (e.op === '&') {
          const t = this.expr(e.e);
          if (e.e.k === 'num' || e.e.k === 'float' || e.e.k === 'str' || e.e.k === 'bin' || e.e.k === 'call') {
            this.err(e, '「&」で取れるのは変数か配列の要素のアドレスだけです。');
          }
          if (e.e.k === 'id' && e.e.sym?.kind === 'func') this.err(e, '関数のアドレスは第 1 版では扱えません。');
          this.lvalue(e.e, 'アドレスを取る');
          return ptrTo(t);
        }
        const t = decay(this.expr(e.e));
        if (e.op === '*') {
          if (t.k !== 'ptr') this.err(e, `「${exprText(e.e)}」はポインタではないので、「*」で指す先を読めません。`);
          if (t.to.k === 'void') this.err(e, 'void * は指す先の型が分からないので「*」で読めません。int * などに入れてから使ってください。');
          return t.to;
        }
        if (e.op === '!') { if (!isScalar(t)) this.err(e, '「!」は数かポインタに使います。'); return T.int; }
        if (!isArith(t)) this.err(e, `「${e.op}」は数にだけ使えます。`);
        if (e.op === '~' && !isInt(t)) this.err(e, '「~」は整数にだけ使えます。');
        return promote(t);
      }
      case 'incdec': {
        const t = this.expr(e.e);
        this.lvalue(e.e, `${e.op} で値を変える`);
        if (!isArith(t) && t.k !== 'ptr') this.err(e, `${e.op} は数かポインタにだけ使えます。`);
        return t;
      }
      case 'assign': {
        const l = this.expr(e.l);
        this.lvalue(e.l, '代入する');
        const r = this.expr(e.r);
        if (e.op === '=') this.assignable(l, r, e.r, '変数');
        else {
          const rr = decay(r);
          if (l.k === 'ptr' && (e.op === '+=' || e.op === '-=')) {
            if (!isInt(rr)) this.err(e, 'ポインタに足し引きできるのは整数だけです。');
          } else if (!isArith(l) || !isArith(rr)) this.err(e, `「${e.op}」は数どうしにだけ使えます。`);
          else if (['%=', '&=', '|=', '^=', '<<=', '>>='].includes(e.op) && (!isInt(l) || !isInt(rr))) this.err(e, `「${e.op}」は整数どうしにだけ使えます。`);
        }
        return l;
      }
      case 'bin': return this.bin(e);
      case 'call': return this.call(e);
    }
  }

  private bin(e: Expr & { k: 'bin' }): CType {
    const l = decay(this.expr(e.l)), r = decay(this.expr(e.r));
    const op = e.op;
    if (op === '&&' || op === '||') {
      if (!isScalar(l) || !isScalar(r)) this.err(e, `「${op}」は条件(数かポインタ)どうしに使います。`);
      return T.int;
    }
    if (['==', '!=', '<', '>', '<=', '>='].includes(op)) {
      if (l.k === 'ptr' && r.k === 'ptr') {
        if ((e.l.k === 'str' || e.r.k === 'str') && (op === '==' || op === '!=')) {
          this.warn(e.line, '文字列を「==」で比べると、中身ではなくアドレスを比べます。中身を比べるなら strcmp(a, b) == 0 を使います。');
        }
        return T.int;
      }
      if ((l.k === 'ptr' && isInt(r)) || (isInt(l) && r.k === 'ptr')) {
        const zero = (x: Expr) => x.k === 'num' && x.v === 0;
        if (!zero(e.l) && !zero(e.r)) this.warn(e.line, 'ポインタと整数を比べています。指す先の値と比べるなら「*」を付けます。');
        return T.int;
      }
      if (!isArith(l) || !isArith(r)) this.err(e, `「${op}」で比べられない組み合わせです(${typeName(l)} と ${typeName(r)})。`);
      if (isInt(l) && isInt(r) && (l as { unsigned: boolean }).unsigned !== (r as { unsigned: boolean }).unsigned) {
        const neg = (x: Expr) => x.k === 'un' && x.op === '-' || (x.k === 'num' && x.v < 0);
        if (neg(e.l) || neg(e.r)) this.warn(e.line, '符号なし整数(strlen の結果など)と負の数を比べています。負の数がとても大きな数として扱われます。');
      }
      return T.int;
    }
    if (op === '+' || op === '-') {
      if (l.k === 'ptr' && isInt(r)) { this.ptrArith(l, e); return l; }
      if (op === '+' && isInt(l) && r.k === 'ptr') { this.ptrArith(r, e); return r; }
      if (op === '-' && l.k === 'ptr' && r.k === 'ptr') return T.long;
    }
    if (!isArith(l) || !isArith(r)) {
      if (l.k === 'ptr' || r.k === 'ptr') this.err(e, `ポインタに「${op}」は使えません。${op === '+' || op === '-' ? 'ポインタどうしは足せません。' : '指す先の値を使うなら「*」を付けます。'}`);
      this.err(e, `「${op}」は数どうしにだけ使えます。`);
    }
    if (['%', '&', '|', '^', '<<', '>>'].includes(op) && (!isInt(l) || !isInt(r))) {
      this.err(e, `「${op}」は整数どうしにだけ使えます。${op === '%' ? '小数の余りは使えません。' : ''}`);
    }
    if (op === '/' && isInt(l) && isInt(r) && e.l.k === 'num' && e.r.k === 'num' && e.l.v % e.r.v !== 0) {
      this.warn(e.line, `${e.l.v} / ${e.r.v} は整数どうしの割り算なので、小数点以下が切り捨てられます。小数が欲しいなら ${e.l.v}.0 / ${e.r.v} と書きます。`);
    }
    if (op === '<<' || op === '>>') return promote(l);
    return arithResult(l, r);
  }

  private ptrArith(p: CType, e: Expr) {
    if (p.k === 'ptr' && p.to.k === 'void') this.err(e, 'void * には足し算・引き算を使えません。');
  }

  private call(e: Expr & { k: 'call' }): CType {
    const user = this.funcs.get(e.name);
    const local = this.lookup(e.name);
    if (local && local.kind !== 'func') this.err(e, `「${e.name}」は変数なので、関数として呼べません。`);
    const ft = user?.ty ?? BUILTINS[e.name];
    if (!ft || ft.k !== 'func') {
      const hint = e.name === 'print' ? 'printf のことではありませんか?' : e.name === 'scan' ? 'scanf のことではありませんか?' : this.suggest(e.name);
      this.err(e, `関数「${e.name}」が見つかりません。${hint}`);
    }
    if (user) e.sym = user;
    const n = ft.params.length;
    if (e.args.length < n || (!ft.variadic && e.args.length > n)) {
      this.err(e, `関数「${e.name}」の引数は ${n} 個${ft.variadic ? '以上' : ''}ですが、${e.args.length} 個渡しています。`);
    }
    const argTys = e.args.map((a, i) => {
      const t = this.expr(a);
      if (i < n) this.assignable(ft.params[i], t, a, `${i + 1} 番目の引数`);
      return decay(t);
    });
    if ((e.name === 'printf' || e.name === 'scanf') && e.args[0]?.k === 'str') this.checkFormat(e, e.args[0].v, argTys.slice(1));
    if (user && !user.fn && !this.prog.funcs.some((f) => f.name === e.name)) {
      this.err(e, `関数「${e.name}」は宣言だけされていて、中身(定義)がありません。`);
    }
    return ft.ret;
  }

  /** printf / scanf の書式と引数の型が合っているかを調べる */
  private checkFormat(e: Expr & { k: 'call' }, fmt: string, args: CType[]) {
    const isScan = e.name === 'scanf';
    const specs = [...fmt.matchAll(/%[-+ #0]*(\*|\d+)?(?:\.(\*|\d+))?(hh|h|ll|l|z)?([diouxXcsfFeEgGp%])/g)].filter((m) => m[4] !== '%');
    if (specs.length !== args.length) {
      this.warn(e.line, `${e.name} の書式には % が ${specs.length} 個ありますが、値は ${args.length} 個渡しています。数をそろえてください。`);
    }
    specs.forEach((m, i) => {
      const a = args[i];
      if (!a) return;
      const conv = m[4], len = m[3] ?? '';
      if (isScan) {
        if (a.k !== 'ptr') {
          this.warn(e.line, `scanf の ${i + 2} 番目の引数には、変数のアドレスを渡します。「&変数名」と書いてください(文字列の配列なら & は不要です)。`);
          return;
        }
        const to = a.to;
        if ('di'.includes(conv) && !(to.k === 'int' && to.size === (len === 'l' || len === 'll' ? 8 : 4))) this.warn(e.line, `%${len}${conv} には ${len ? 'long' : 'int'} 型の変数のアドレスを渡してください(いまは ${typeName(a)})。`);
        if ('fFeEgG'.includes(conv) && to.k !== 'double') this.warn(e.line, `%${len}${conv} には double 型の変数のアドレスを渡してください。`);
        if ('fFeEgG'.includes(conv) && to.k === 'double' && len !== 'l') this.warn(e.line, 'double を scanf で読むときは %lf と書きます(%f は float 用です)。');
        if ((conv === 's' || conv === 'c') && !(to.k === 'int' && to.size === 1)) this.warn(e.line, `%${conv} には char の配列(または char 変数のアドレス)を渡してください。`);
        return;
      }
      if ('dic'.includes(conv) && !isInt(a)) this.warn(e.line, `%${conv} は整数用ですが、${typeName(a)} の値を渡しています。${a.k === 'double' ? 'double には %f を使います。' : ''}`);
      if ('di'.includes(conv) && a.k === 'int' && a.size === 8 && len !== 'l' && len !== 'll' && len !== 'z') this.warn(e.line, `long 型の値には %ld を使います(%${conv} は int 用です)。`);
      if ('uxXo'.includes(conv) && !isInt(a)) this.warn(e.line, `%${conv} は整数用ですが、${typeName(a)} の値を渡しています。`);
      if ('fFeEgG'.includes(conv) && a.k !== 'double') this.warn(e.line, `%${conv} は小数(double)用ですが、${typeName(a)} の値を渡しています。整数なら %d を使います。`);
      if (conv === 's' && !(a.k === 'ptr' && a.to.k === 'int' && a.to.size === 1)) this.warn(e.line, `%s には文字列(char の配列か char *)を渡します。いまは ${typeName(a)} です。${isInt(a) ? '1 文字なら %c を使います。' : ''}`);
      if (conv === 'p' && a.k !== 'ptr') this.warn(e.line, '%p にはポインタ(アドレス)を渡します。');
    });
  }

  private suggest(name: string): string {
    const cands = new Set<string>();
    for (const sc of this.scopes) for (const k of sc.keys()) cands.add(k);
    for (const k of this.funcs.keys()) cands.add(k);
    for (const k of Object.keys(BUILTINS)) cands.add(k);
    let best = '', bd = 3;
    for (const c of cands) {
      const d = editDistance(name, c);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) return `「${best}」の書き間違いではありませんか?`;
    return '使う前に「int ' + name + ';」のように宣言してください。';
  }
}

function isConstTrue(e: Expr): boolean {
  return e.k === 'num' && e.v !== 0;
}

export function exprText(e: Expr): string {
  switch (e.k) {
    case 'id': return e.name;
    case 'num': return String(e.v);
    case 'index': return `${exprText(e.a)}[${exprText(e.i)}]`;
    case 'un': return `${e.op}${exprText(e.e)}`;
    case 'call': return `${e.name}(...)`;
    case 'str': return `"${e.v}"`;
    default: return '式';
  }
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}
