// 教材の検査。例と参照解が実際に動き、問題として成り立っているかを確かめる
import { beforeAll, describe, expect, it } from 'vitest';
import { COURSES, DIAG, KCS } from '../src/content';
import type { Problem } from '../src/content/types';
import { applyTest, checkTraceCell, instantiate, referenceCode, runTests, setRunner, traceRows } from '../src/learn/grade';
import { nodePy, nodeRun } from './pyNode';

const problems: Problem[] = [...DIAG];
const reads: { title: string; code: string; stdin?: string }[] = [];
for (const c of COURSES) for (const u of c.units) {
  for (const l of u.lessons) for (const s of l.steps) {
    if (s.kind === 'problem') problems.push(s.problem);
    else if (s.example) reads.push({ title: `${u.id}/${s.title}`, code: s.example, stdin: s.stdin });
  }
  problems.push(...u.check);
}
const SEEDS = [1, 2, 3, 1000, 424242];
const kcIds = new Set(KCS.map((k) => k.id));
const SYNTAX = ['SyntaxError', 'IndentationError', 'TabError'];

beforeAll(async () => {
  await nodePy();
  setRunner(nodeRun);
}, 60_000);

describe('教材の形', () => {
  it('問題 ID は重複しない', () => {
    const ids = problems.map((p) => p.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
  it('KC はすべて定義済み', () => {
    for (const p of problems) for (const k of p.kcs) expect(kcIds.has(k), `${p.id}: ${k}`).toBe(true);
    for (const c of COURSES) for (const u of c.units) for (const k of u.kcs) expect(kcIds.has(k), `${u.id}: ${k}`).toBe(true);
  });
  it('本編のすべての単元が診断で 1 問以上出る', () => {
    const tested = new Set(DIAG.flatMap((p) => p.kcs));
    for (const u of COURSES[0].units) expect(u.kcs.some((k) => tested.has(k)), u.id).toBe(true);
  });
});

describe('例題が動く', () => {
  for (const ex of reads) {
    it(ex.title, async () => {
      const r = await nodeRun(ex.code, { stdin: ex.stdin });
      expect(r.status, JSON.stringify(r.error)).toBe('ok');
      expect(r.stdout.length).toBeGreaterThan(0);
    });
  }
});

describe('問題が成り立つ', () => {
  for (const p0 of problems) {
    it(p0.id, async () => {
      for (const seed of p0.params ? SEEDS : [1]) {
        const p = instantiate(p0, seed);
        expect(JSON.stringify(p), '置き換え残り').not.toMatch(/\$[a-z]\b/);
        switch (p.type) {
          case 'predict': {
            const r = await nodeRun(p.code, { stdin: p.stdin });
            expect(r.status, `${p.id} ${JSON.stringify(r.error)}`).toBe('ok');
            expect(r.stdout.length).toBeGreaterThan(0);
            break;
          }
          case 'choice': {
            expect(p.answer).toBeLessThan(p.choices.length);
            break;
          }
          case 'trace': {
            const r = await nodeRun(p.code, { stdin: p.stdin });
            expect(r.status, JSON.stringify(r.error)).toBe('ok');
            const rows = await traceRows(p);
            expect(rows.length, p.id).toBeGreaterThan(0);
            for (const row of rows) for (const c of row) {
              expect(c, `${p.id} ${JSON.stringify(rows)}`).not.toBe('—');
              expect(checkTraceCell(c, c), `${p.id} 正解そのものが合格する`).toBe(true);
            }
            break;
          }
          case 'parsons': case 'fill': case 'write': {
            const ref = referenceCode(p);
            const g = await runTests(ref, ref, p.tests);
            expect(g.ok, `${p.id} ${JSON.stringify(g).slice(0, 600)}`).toBe(true);
            if (p.type === 'write') {
              const s = await nodeRun(p.starter, { stdin: p.tests[0].stdin });
              expect(SYNTAX, `${p.id} 書き始め ${JSON.stringify(s.error)}`).not.toContain(s.error?.type);
              // 書き始めのままでは合格しない
              expect((await runTests(p.starter, ref, p.tests)).ok, p.id).toBe(false);
              // 最初のテストの出力をそのまま print するだけでは合格しない(数字の直書きを防げているか)
              const first = await nodeRun(applyTest(ref, p.tests[0]), { stdin: p.tests[0].stdin });
              const literal = `print(${JSON.stringify(first.stdout)}, end="")`;
              expect((await runTests(literal, ref, p.tests)).ok, `${p.id} 直書きで合格してしまう`).toBe(false);
            }
            if (p.type === 'parsons') {
              // 紛らわしい行を 1 つ混ぜた並びは不合格になる(紛らわしい行が本当に誤りであることの確認)
              for (const d of p.distractors ?? []) {
                const lines = [...p.lines];
                const at = lines.findIndex((l) => l.trim().split(/\s/)[0] === d.trim().split(/\s/)[0]);
                if (at < 0) continue;
                lines[at] = d;
                const code = [p.before ?? '', ...lines, p.after ?? ''].filter(Boolean).join('\n');
                expect((await runTests(code, ref, p.tests)).ok, `${p.id} 紛らわしい行 ${d}`).toBe(false);
              }
            }
            break;
          }
        }
      }
    }, 30_000);
  }
});

describe('applyTest', () => {
  it('行頭の代入だけを置き換え、== の行は残す', () => {
    const code = 'w = 5\nif w == 5:\n    w = 1\nprint(w)';
    expect(applyTest(code, { set: { w: '9' } })).toBe('w = 9\nif w == 5:\n    w = 1\nprint(w)');
  });
  it('append は末尾に 1 行足す', () => {
    expect(applyTest('print(1)\n\n', { append: 'print(2)' })).toBe('print(1)\nprint(2)\n');
  });
});
