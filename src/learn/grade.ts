// 問題の具体化(値の差し替え)と採点。正解はすべてインタプリタで実行して求める
import type { Params, Problem, TestCase } from '../content/types';
import { run, type RunResult } from '../interp/interp';
import { rng } from './engine';

/** 値を差し替えた問題。$a のような印を、種から決まる値に置き換える */
export function instantiate(p: Problem, seed: number): Problem {
  if (!p.params) return p;
  const r = rng(seed);
  const vals: Record<string, string> = {};
  for (const [k, spec] of Object.entries(p.params as Params)) {
    if (typeof spec[0] === 'number') {
      const [lo, hi] = spec as [number, number];
      vals[k] = String(lo + Math.floor(r() * (hi - lo + 1)));
    } else {
      const arr = spec as string[];
      vals[k] = arr[Math.floor(r() * arr.length)];
    }
  }
  const sub = (s: string) => s.replace(/\$([a-z]\w*)/g, (m, k) => (k in vals ? vals[k] : m));
  return JSON.parse(JSON.stringify(p), (_k, v) => (typeof v === 'string' ? sub(v) : v));
}

/** 出力を比べる。中身が同じで、行末の空白や最後の改行だけが違うときは「書式の違い」として区別する */
export function compareOutput(got: string, want: string): 'same' | 'format' | 'different' {
  if (got === want) return 'same';
  const norm = (s: string) => s.replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  if (norm(got) === norm(want)) return 'format';
  return 'different';
}

export interface TestResult {
  stdin?: string;
  want: string;
  got: string;
  verdict: 'same' | 'format' | 'different' | 'error';
  run: RunResult;
  hidden?: boolean;
}

export interface Grade {
  ok: boolean;
  /** 書式だけが違う(正解として扱い、注意を添える) */
  formatOnly?: boolean;
  tests?: TestResult[];
  leak?: boolean;
  message?: string;
}

const refCache = new Map<string, string>();

function expected(ref: string, t: TestCase): string {
  if (t.expect !== undefined) return t.expect;
  const key = ref + '\u0000' + (t.stdin ?? '');
  let v = refCache.get(key);
  if (v === undefined) {
    const r = run(ref, { stdin: t.stdin });
    if (r.error) throw new Error(`参照解が実行できません: ${r.error.message}`);
    v = r.stdout;
    refCache.set(key, v);
  }
  return v;
}

export function runTests(code: string, ref: string, tests: TestCase[], noLeak = false): Grade {
  const results: TestResult[] = tests.map((t) => {
    const want = expected(ref, t);
    const r = run(code, { stdin: t.stdin, maxSteps: 300_000 });
    const verdict = r.error ? 'error' : compareOutput(r.stdout, want);
    return { stdin: t.stdin, want, got: r.stdout, verdict, run: r, hidden: t.hidden };
  });
  const passed = results.every((t) => t.verdict === 'same' || t.verdict === 'format');
  const leak = noLeak && results.some((t) => t.run.leaks.length > 0);
  return {
    ok: passed && !leak,
    formatOnly: passed && results.some((t) => t.verdict === 'format'),
    tests: results,
    leak,
  };
}

/** 参照解のコード。並べ替えと穴埋めは、正しい答えを組み立てたもの */
export function referenceCode(p: Problem): string {
  switch (p.type) {
    case 'parsons': return [p.before ?? '', ...p.lines, p.after ?? ''].filter(Boolean).join('\n');
    case 'fill': return fillBlanks(p.code, p.answers);
    case 'write': return p.solution;
    case 'predict': case 'trace': return p.code;
    default: return '';
  }
}

export function fillBlanks(code: string, answers: string[]): string {
  let i = 0;
  return code.replace(/___/g, () => answers[i++] ?? '');
}

/** トレース表の正解。指定した行に来た時点(その行を実行する前)の変数の値を、来た順に並べる */
export function traceRows(p: Problem & { type: 'trace' }, max = 8): string[][] {
  const r = run(p.code, { stdin: p.stdin, trace: true });
  const rows: string[][] = [];
  for (const s of r.trace) {
    if (s.line !== p.line || s.event) continue;
    const top = s.frames[s.frames.length - 1];
    rows.push(p.vars.map((name) => {
      const v = top?.vars.find((x) => x.name === name) ?? s.globals.find((x) => x.name === name);
      if (!v) return '—';
      const c = v.cells[0];
      return c.init ? c.text : '?';
    }));
    if (rows.length >= max) break;
  }
  return rows;
}

/** 予測の答えを比べる。改行の有無や行末の空白の違いは許す */
export function checkPredict(answer: string, actual: string): boolean {
  const norm = (s: string) => s.replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '').replace(/^\n+/, '');
  return norm(answer) === norm(actual);
}

export function checkTraceCell(answer: string, want: string): boolean {
  const a = answer.trim().replace(/^'(.)'$/, '$1');
  return a === want || (want === '?' && /^(\?|ゴミ|不定)$/.test(a));
}
