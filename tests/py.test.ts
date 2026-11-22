// Pyodide の上で、トレーサーと止める仕組みを確かめる(Node で node_modules の pyodide を使う)
import { beforeAll, describe, expect, it } from 'vitest';
import type { PyodideAPI } from 'pyodide';
import { runPython } from '../src/py/core';
import { nodePy } from './pyNode';
import { r, src } from '../src/content/util';
import { usesUi } from '../src/py/app';
import { EXAMPLES } from '../src/content/examples';

let py: PyodideAPI;
beforeAll(async () => { py = await nodePy(); }, 60_000);

const names = (step: { frames: { locals: [string, string][] }[] }) =>
  Object.fromEntries(step.frames.at(-1)!.locals);

describe('runPython', () => {
  it('出力と、1 行ずつの記録が取れる', () => {
    const res = runPython(py, src(r`
      a = 1
      b = a + 1
      print(a, b)
    `));
    expect(res.status).toBe('ok');
    expect(res.stdout).toBe('1 2\n');
    // 最後の return はモジュールの終わり。最終の状態として図に使う
    expect(res.trace.map((s) => `${s.event}:${s.line}`)).toEqual(['line:1', 'line:2', 'line:3', 'return:3']);
    // 2 行目を実行する直前には a だけがある
    expect(Object.keys(names(res.trace[1]))).toEqual(['a']);
    expect(res.trace[2].stdoutLen).toBe(0);
  });

  it('b = a では同じリストを指す(別名)', () => {
    const res = runPython(py, src(r`
      a = [1, 2]
      b = a
      b.append(3)
      x = 0
    `));
    const last = res.trace.at(-1)!;
    const n = names(last);
    expect(n.a).toBe(n.b);
    expect(last.heap[n.a].type).toBe('list');
    expect(last.heap[n.a].items!.map((id) => last.heap[id].repr)).toEqual(['1', '2', '3']);
  });

  it('関数呼び出しではフレームが積まれ、既定引数の [] が共有される', () => {
    const res = runPython(py, src(r`
      def add(x, acc=[]):
          acc.append(x)
          return acc
      p = add(1)
      q = add(2)
      print(p is q, q)
    `));
    expect(res.stdout).toBe('True [1, 2]\n');
    const inFunc = res.trace.find((s) => s.frames.length === 2)!;
    expect(inFunc.frames.map((f) => f.name)).toEqual(['<module>', 'add']);
  });

  it('無限ループはステップ数の上限で止まる。except Exception でも握りつぶせない', () => {
    const res = runPython(py, src(r`
      while True:
          try:
              pass
          except Exception:
              pass
    `), { maxSteps: 5_000 });
    expect(res.status).toBe('step-limit');
    expect(res.trace.length).toBeLessThanOrEqual(2_000);
    expect(res.traceTruncated).toBe(true);
  });

  it('止めたあとも、続けて別のコードを動かせる', () => {
    runPython(py, 'while True: pass', { maxSteps: 100 });
    const res = runPython(py, 'print("ok")');
    expect(res.status).toBe('ok');
    expect(res.stdout).toBe('ok\n');
  });

  it('実行時エラーは種類と行を返す', () => {
    const res = runPython(py, src(r`
      x = [1]
      print(x[3])
    `));
    expect(res.status).toBe('error');
    expect(res.error).toMatchObject({ type: 'IndexError', line: 2 });
  });

  it('文法エラーも行を返す', () => {
    const res = runPython(py, 'x = (1,\nprint(x)\n');
    expect(res.status).toBe('error');
    expect(res.error!.type).toBe('SyntaxError');
  });

  it('input() には渡した行が順に入る', () => {
    const res = runPython(py, 'a = input()\nb = input()\nprint(b, a)', { stdin: 'x\ny' });
    expect(res.stdout).toBe('y x\n');
  });

  it('前の実行の変数は残らない', () => {
    runPython(py, 'secret = 1');
    const res = runPython(py, 'print(secret)');
    expect(res.error!.type).toBe('NameError');
  });

  it('改行なしの print も、その時点までの出力に入る', () => {
    const res = runPython(py, 'print("a", end="")\nx = 1\n');
    expect(res.trace[1].stdoutLen).toBe(1);
    expect(res.stdout).toBe('a');
  });

  it('関数から戻るときは戻り値を記録する', () => {
    const res = runPython(py, src(r`
      def sq(n):
          return n * n
      y = sq(3)
    `));
    const ret = res.trace.find((s) => s.event === 'return' && s.ret)!;
    expect(ret.heap[ret.ret!].repr).toBe('9');
    // order には heap の id がすべて、辿った順に入る
    expect(new Set(ret.order)).toEqual(new Set(Object.keys(ret.heap)));
  });
});

describe('「自由に書く」の例が動く', () => {
  for (const ex of EXAMPLES) {
    it(ex.title, () => {
      const app = usesUi(ex.code) ? { inputs: {}, clicked: null, state: null } : undefined;
      const res = runPython(py, ex.code, { stdin: ex.stdin, app });
      if (app) {
        expect(res.status, JSON.stringify(res.error)).toBe('ok');
        expect(res.app!.elements.length).toBeGreaterThan(0);
      } else if (ex.title.includes('誤り')) {
        expect(res.status).toBe('error');
      } else {
        expect(res.status, JSON.stringify(res.error)).toBe('ok');
        expect(res.stdout.length).toBeGreaterThan(0);
      }
    });
  }
});
