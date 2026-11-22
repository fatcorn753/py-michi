// 再帰下降の構文解析。エラー文は「何が起きたか」と「どう直すか」を日本語で返す
import type { Declarator, Expr, FuncDef, Program, Stmt } from './ast';
import { CError } from './errors';
import { lex, type Token } from './lexer';
import { T, ptrTo, sizeOf, type CType } from './types';

const TYPE_WORDS = new Set(['int', 'char', 'long', 'short', 'double', 'float', 'void', 'unsigned', 'signed', 'const', 'static', 'size_t', 'bool', '_Bool']);

const BIN_PREC: Record<string, number> = {
  '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6,
  '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
};
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);

export function parse(src: string): Program {
  return new Parser(lex(src)).program();
}

class Parser {
  private p = 0;
  constructor(private toks: Token[]) {}

  private get t(): Token { return this.toks[this.p]; }
  private peek(n = 1): Token { return this.toks[Math.min(this.p + n, this.toks.length - 1)]; }
  private is(text: string): boolean { return (this.t.kind === 'op' || this.t.kind === 'kw') && this.t.text === text; }
  private next(): Token { return this.toks[this.p++]; }
  private accept(text: string): boolean { if (this.is(text)) { this.p++; return true; } return false; }

  private fail(msg: string, tok: Token = this.t): never {
    throw new CError('compile', msg, tok.line, tok.col);
  }

  private expect(text: string, what?: string): Token {
    if (this.is(text)) return this.next();
    // セミコロン忘れは、直前のトークンの行で知らせるほうが分かりやすい
    if (text === ';') {
      const prev = this.toks[this.p - 1] ?? this.t;
      this.fail(`文の終わりに「;」がありません。${prev.line} 行目の最後に「;」を書いてください。`, prev);
    }
    const got = this.t.kind === 'eof' ? 'ファイルの終わり' : `「${this.t.text}」`;
    this.fail(`${what ?? `「${text}」`}が必要な場所に${got}があります。${text === ')' || text === '}' || text === ']' ? '括弧の対応を確かめてください。' : ''}`);
  }

  private isTypeStart(tok: Token = this.t): boolean {
    return tok.kind === 'kw' && (TYPE_WORDS.has(tok.text) || tok.text === 'struct');
  }

  program(): Program {
    const prog: Program = { funcs: [], globals: [], protos: [] };
    while (this.t.kind !== 'eof') {
      if (this.is('typedef')) this.fail('typedef はこのサイトの第 1 版では使えません。型名をそのまま書いてください。');
      const base = this.baseType();
      if (this.accept(';')) continue;
      const first = this.declarator(base);
      if (first.ty.k === 'func' && this.is('{')) {
        const params = first.params ?? [];
        const body = this.block();
        prog.funcs.push({ name: first.name, ty: first.ty, params, body, line: first.line });
        continue;
      }
      const ds = [first];
      while (this.accept(',')) ds.push(this.declarator(base));
      this.expect(';');
      for (const d of ds) {
        if (d.ty.k === 'func') prog.protos.push({ name: d.name, ty: d.ty, line: d.line });
        else {
          if (d.init === undefined && this.is('=')) { /* 到達しない */ }
          prog.globals.push(d);
        }
      }
    }
    return prog;
  }

  /** 型の指定子の並び(unsigned long など)を 1 つの型にまとめる */
  private baseType(): CType {
    const start = this.t;
    if (this.is('struct')) this.fail('構造体(struct)は、このサイトの第 1 版ではまだ使えません。');
    let unsigned = false, signed = false, longs = 0, short = false;
    let base: string | null = null;
    let any = false;
    while (this.t.kind === 'kw' && TYPE_WORDS.has(this.t.text)) {
      const w = this.next().text;
      any = true;
      if (w === 'const' || w === 'static') continue;
      if (w === 'unsigned') unsigned = true;
      else if (w === 'signed') signed = true;
      else if (w === 'long') longs++;
      else if (w === 'short') short = true;
      else {
        if (base) this.fail(`型の名前が 2 つ続いています(${base} と ${w})。どちらか 1 つにしてください。`, start);
        base = w;
      }
    }
    if (!any) this.fail(`型の名前(int など)が必要な場所に「${this.t.text}」があります。`);
    void signed;
    if (base === 'void') return T.void;
    if (base === 'double' || base === 'float') return T.double;
    if (base === 'bool' || base === '_Bool') return T.bool;
    if (base === 'size_t') return T.ulong;
    if (base === 'char') return unsigned ? T.uchar : T.char;
    if (short) return unsigned ? { k: 'int', size: 2, unsigned: true } : T.short;
    if (longs > 0) return unsigned ? T.ulong : T.long;
    return unsigned ? T.uint : T.int;
  }

  private declarator(base: CType): Declarator & { params?: Declarator[] } {
    let ty = base;
    while (this.accept('*')) { ty = ptrTo(ty); while (this.accept('const')) { /* 読み飛ばす */ } }
    const nameTok = this.t;
    if (nameTok.kind !== 'id') {
      if (nameTok.kind === 'kw') this.fail(`「${nameTok.text}」は C の予約語なので、変数名には使えません。別の名前にしてください。`);
      this.fail(`変数名か関数名が必要な場所に「${nameTok.text}」があります。`);
    }
    this.next();
    const d: Declarator & { params?: Declarator[] } = { name: nameTok.text, ty, line: nameTok.line, col: nameTok.col };
    if (this.accept('(')) {
      const params: Declarator[] = [];
      let variadic = false;
      if (this.is('void') && this.peek().text === ')') this.next();
      else if (!this.is(')')) {
        do {
          if (this.accept('...')) { variadic = true; break; }
          const pb = this.baseType();
          let pt = pb;
          while (this.accept('*')) { pt = ptrTo(pt); while (this.accept('const')) { /* 読み飛ばす */ } }
          let pname = '';
          const ptok = this.t;
          if (this.t.kind === 'id') pname = this.next().text;
          // int a[] や int a[10] の引数はポインタになる
          while (this.accept('[')) {
            if (!this.is(']')) this.expr();
            this.expect(']');
            pt = ptrTo(pt);
          }
          params.push({ name: pname, ty: pt, line: ptok.line, col: ptok.col });
        } while (this.accept(','));
      }
      this.expect(')');
      d.ty = { k: 'func', ret: ty, params: params.map((x) => x.ty), variadic };
      d.params = params;
      return d;
    }
    // 配列の次元は外側から順に書かれるので、内側から組み立てる
    const dims: (Expr | null)[] = [];
    while (this.accept('[')) {
      dims.push(this.is(']') ? null : this.expr());
      this.expect(']');
    }
    for (let k = dims.length - 1; k >= 0; k--) {
      const de = dims[k];
      if (de === null) { ty = { k: 'array', of: ty, len: null }; continue; }
      const cv = this.constValue(de);
      if (cv === null) {
        if (k !== 0) this.fail('2 次元目以降の配列の大きさは、定数で書いてください。');
        ty = { k: 'array', of: ty, len: null };
        d.vlaLen = de;
      } else {
        if (cv <= 0) this.fail(`配列の大きさは 1 以上にしてください(いまは ${cv})。`, nameTok);
        ty = { k: 'array', of: ty, len: cv };
      }
    }
    d.ty = ty;
    if (this.accept('=')) d.init = this.is('{') ? this.initList() : this.assignExpr();
    return d;
  }

  private initList(): Expr {
    const open = this.expect('{');
    const items: Expr[] = [];
    while (!this.is('}')) {
      items.push(this.is('{') ? this.initList() : this.assignExpr());
      if (!this.accept(',')) break;
    }
    this.expect('}', '初期化子の終わりの「}」');
    return { k: 'initlist', items, line: open.line, col: open.col };
  }

  /** 定数式を計算する。計算できなければ null */
  constValue(e: Expr): number | null {
    switch (e.k) {
      case 'num': return e.v;
      case 'un': {
        const v = this.constValue(e.e);
        if (v === null) return null;
        return e.op === '-' ? -v : e.op === '+' ? v : e.op === '~' ? ~v : e.op === '!' ? +!v : null;
      }
      case 'bin': {
        const a = this.constValue(e.l), b = this.constValue(e.r);
        if (a === null || b === null) return null;
        switch (e.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b;
          case '/': return b ? Math.trunc(a / b) : null; case '%': return b ? a % b : null;
          case '<<': return a << b; case '>>': return a >> b;
          default: return null;
        }
      }
      case 'sizeof': return e.t ? sizeOf(e.t) : null;
      default: return null;
    }
  }

  private block(): Stmt & { k: 'block' } {
    const open = this.expect('{');
    const body: Stmt[] = [];
    while (!this.is('}')) {
      if (this.t.kind === 'eof') this.fail(`${open.line} 行目の「{」に対応する「}」がありません。`, open);
      body.push(this.stmt());
    }
    this.next();
    return { k: 'block', body, line: open.line, col: open.col };
  }

  private stmt(): Stmt {
    const tok = this.t;
    const at = { line: tok.line, col: tok.col };
    if (this.is('{')) return this.block();
    if (this.isTypeStart()) {
      const base = this.baseType();
      const decls: Declarator[] = [];
      do {
        const d = this.declarator(base);
        if (d.ty.k === 'func') this.fail('関数の中で関数を宣言・定義することはできません。main の外に書いてください。', tok);
        decls.push(d);
      } while (this.accept(','));
      this.expect(';');
      return { k: 'decl', decls, ...at };
    }
    if (tok.kind === 'kw') {
      switch (tok.text) {
        case 'if': {
          this.next(); this.expect('(', '「if」の後の「(」');
          const c = this.expr(); this.expect(')');
          const t = this.stmt();
          const e = this.accept('else') ? this.stmt() : undefined;
          return { k: 'if', c, t, e, ...at };
        }
        case 'while': {
          this.next(); this.expect('(', '「while」の後の「(」');
          const c = this.expr(); this.expect(')');
          return { k: 'while', c, b: this.stmt(), ...at };
        }
        case 'do': {
          this.next();
          const b = this.stmt();
          this.expect('while', 'do の本体の後の「while」');
          this.expect('('); const c = this.expr(); this.expect(')'); this.expect(';');
          return { k: 'dowhile', c, b, ...at };
        }
        case 'for': {
          this.next(); this.expect('(', '「for」の後の「(」');
          let init: Stmt | undefined;
          if (this.isTypeStart()) init = this.stmt();
          else if (!this.accept(';')) { const e = this.expr(); this.expect(';'); init = { k: 'expr', e, line: e.line, col: e.col }; }
          const c = this.is(';') ? undefined : this.expr();
          this.expect(';');
          const step = this.is(')') ? undefined : this.expr();
          this.expect(')');
          return { k: 'for', init, c, step, b: this.stmt(), ...at };
        }
        case 'return': {
          this.next();
          const e = this.is(';') ? undefined : this.expr();
          this.expect(';');
          return { k: 'return', e, ...at };
        }
        case 'break': this.next(); this.expect(';'); return { k: 'break', ...at };
        case 'continue': this.next(); this.expect(';'); return { k: 'continue', ...at };
        case 'switch': {
          this.next(); this.expect('(');
          const e = this.expr(); this.expect(')');
          const b = this.block();
          return { k: 'switch', e, body: b.body, ...at };
        }
        case 'case': {
          this.next();
          const v = this.condExpr();
          this.expect(':', 'case の値の後の「:」');
          const cv = this.constValue(v) ?? (v.k === 'num' ? v.v : null);
          if (cv === null && !(v.k === 'num')) this.fail('case の値は定数(数字か文字)にしてください。', tok);
          return { k: 'case', v, cv: cv ?? undefined, ...at };
        }
        case 'default': this.next(); this.expect(':'); return { k: 'case', v: null, ...at };
        case 'goto': this.fail('goto はこのサイトでは使えません。ループと break で書き直してください。');
        case 'else': this.fail('対応する if のない else があります。if の本体を { } で囲んだか確かめてください。');
      }
    }
    if (this.accept(';')) return { k: 'empty', ...at };
    const e = this.expr();
    this.expect(';');
    return { k: 'expr', e, ...at };
  }

  expr(): Expr {
    let e = this.assignExpr();
    while (this.is(',')) {
      const op = this.next();
      e = { k: 'comma', l: e, r: this.assignExpr(), line: op.line, col: op.col };
    }
    return e;
  }

  private assignExpr(): Expr {
    const l = this.condExpr();
    if (this.t.kind === 'op' && ASSIGN_OPS.has(this.t.text)) {
      const op = this.next();
      return { k: 'assign', op: op.text, l, r: this.assignExpr(), line: op.line, col: op.col };
    }
    return l;
  }

  private condExpr(): Expr {
    const c = this.binExpr(1);
    if (this.is('?')) {
      const q = this.next();
      const a = this.expr();
      this.expect(':', '条件演算子の「:」');
      return { k: 'cond', c, a, b: this.condExpr(), line: q.line, col: q.col };
    }
    return c;
  }

  private binExpr(minPrec: number): Expr {
    let l = this.unary();
    for (;;) {
      const tok = this.t;
      const prec = tok.kind === 'op' ? BIN_PREC[tok.text] : undefined;
      if (prec === undefined || prec < minPrec) return l;
      this.next();
      const r = this.binExpr(prec + 1);
      l = { k: 'bin', op: tok.text, l, r, line: tok.line, col: tok.col };
    }
  }

  private unary(): Expr {
    const tok = this.t;
    if (tok.kind === 'op') {
      if (tok.text === '++' || tok.text === '--') {
        this.next();
        return { k: 'incdec', op: tok.text, prefix: true, e: this.unary(), line: tok.line, col: tok.col };
      }
      if (['-', '+', '!', '~', '*', '&'].includes(tok.text)) {
        this.next();
        return { k: 'un', op: tok.text, e: this.unary(), line: tok.line, col: tok.col };
      }
      if (tok.text === '(' && this.isTypeStart(this.peek())) {
        this.next();
        const ty = this.typeName();
        this.expect(')');
        return { k: 'cast', to: ty, e: this.unary(), line: tok.line, col: tok.col };
      }
    }
    if (tok.kind === 'kw' && tok.text === 'sizeof') {
      this.next();
      if (this.is('(') && this.isTypeStart(this.peek())) {
        this.next();
        const ty = this.typeName();
        this.expect(')');
        return { k: 'sizeof', t: ty, line: tok.line, col: tok.col };
      }
      return { k: 'sizeof', e: this.unary(), line: tok.line, col: tok.col };
    }
    return this.postfix();
  }

  /** キャストや sizeof の中の型名(int * など) */
  private typeName(): CType {
    let ty = this.baseType();
    while (this.accept('*')) ty = ptrTo(ty);
    while (this.accept('[')) {
      const n = this.is(']') ? null : this.constValue(this.expr());
      this.expect(']');
      ty = { k: 'array', of: ty, len: n };
    }
    return ty;
  }

  private postfix(): Expr {
    let e = this.primary();
    for (;;) {
      const tok = this.t;
      if (this.accept('[')) {
        const i = this.expr();
        this.expect(']');
        e = { k: 'index', a: e, i, line: tok.line, col: tok.col };
      } else if (this.is('(')) {
        if (e.k !== 'id') this.fail('関数呼び出しは「関数名(引数)」の形で書いてください。');
        this.next();
        const args: Expr[] = [];
        if (!this.is(')')) do { args.push(this.assignExpr()); } while (this.accept(','));
        this.expect(')', '関数呼び出しの終わりの「)」');
        e = { k: 'call', name: e.name, args, line: e.line, col: e.col };
      } else if (this.is('++') || this.is('--')) {
        this.next();
        e = { k: 'incdec', op: tok.text as '++' | '--', prefix: false, e, line: tok.line, col: tok.col };
      } else if (this.is('.') || this.is('->')) {
        this.fail('構造体のメンバー(. や ->)は、このサイトの第 1 版ではまだ使えません。');
      } else return e;
    }
  }

  private primary(): Expr {
    const tok = this.next();
    const at = { line: tok.line, col: tok.col };
    switch (tok.kind) {
      case 'num': return { k: 'num', v: tok.value as number, ...at };
      case 'char': return { k: 'num', v: tok.value as number, ty: T.int, ...at };
      case 'float': return { k: 'float', v: tok.value as number, ...at };
      case 'str': return { k: 'str', v: tok.value as string, ...at };
      case 'id': return { k: 'id', name: tok.text, ...at };
      case 'op':
        if (tok.text === '(') {
          const e = this.expr();
          this.expect(')');
          return e;
        }
        break;
      case 'kw':
        if (tok.text === 'true' || tok.text === 'false') return { k: 'num', v: tok.text === 'true' ? 1 : 0, ...at };
        this.fail(`「${tok.text}」は式の中には書けません。`, tok);
    }
    if (tok.kind === 'eof') this.fail('式の途中でファイルが終わっています。括弧や「;」が足りないか確かめてください。', tok);
    this.fail(`式が必要な場所に「${tok.text}」があります。`, tok);
  }
}

export type { FuncDef };
