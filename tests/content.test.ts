// 教材の検査。例と参照解が実際に動き、問題として成り立っているかを確かめる
import { describe, expect, it } from 'vitest';
import { COURSES, DIAG, KCS } from '../src/content';
import type { Problem } from '../src/content/types';
import { run } from '../src/interp/interp';
import { instantiate, referenceCode, runTests, traceRows } from '../src/learn/grade';

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
    it(ex.title, () => {
      const r = run(ex.code, { stdin: ex.stdin });
      expect(r.error, JSON.stringify(r.error)).toBeUndefined();
      expect(r.stdout.length).toBeGreaterThan(0);
      expect(r.warnings).toEqual([]);
    });
  }
});

describe('問題が成り立つ', () => {
  for (const p0 of problems) {
    it(p0.id, () => {
      for (const seed of p0.params ? SEEDS : [1]) {
        const p = instantiate(p0, seed);
        expect(JSON.stringify(p), '置き換え残り').not.toMatch(/\$[a-z]\b/);
        switch (p.type) {
          case 'predict': {
            const r = run(p.code, { stdin: p.stdin });
            expect(r.error, `${p.id} ${JSON.stringify(r.error)}`).toBeUndefined();
            expect(r.stdout.length).toBeGreaterThan(0);
            expect(r.warnings, p.id).toEqual([]);
            break;
          }
          case 'choice': {
            expect(p.answer).toBeLessThan(p.choices.length);
            if (p.code?.includes('main(')) {
              const r = run(p.code);
              expect(r.error?.kind, `${p.id} ${JSON.stringify(r.error)}`).not.toBe('compile');
            }
            break;
          }
          case 'trace': {
            const r = run(p.code, { stdin: p.stdin });
            expect(r.error, JSON.stringify(r.error)).toBeUndefined();
            const rows = traceRows(p);
            expect(rows.length, p.id).toBeGreaterThan(0);
            for (const row of rows) for (const c of row) expect(c, `${p.id} ${JSON.stringify(rows)}`).not.toBe('—');
            break;
          }
          case 'parsons': case 'fill': case 'write': {
            const ref = referenceCode(p);
            const g = runTests(ref, ref, p.tests, p.type === 'write' && !!p.noLeak);
            expect(g.ok, `${p.id} ${JSON.stringify(g).slice(0, 600)}`).toBe(true);
            const r = run(ref, { stdin: p.tests[0].stdin });
            expect(r.warnings, p.id).toEqual([]);
            if (p.type === 'write') {
              const s = run(p.starter, { stdin: p.tests[0].stdin });
              expect(s.error?.kind, `${p.id} 書き始め ${JSON.stringify(s.error)}`).not.toBe('compile');
              // 書き始めのままでは合格しない
              expect(runTests(p.starter, ref, p.tests, !!p.noLeak).ok, p.id).toBe(false);
            }
            break;
          }
        }
      }
    });
  }
});
