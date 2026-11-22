// 問題の具体化(値の差し替え)と採点。正解はすべて参照解を Python で実行して求める
import type { Params, Problem, TestCase } from '../content/types';
import type { PyRunOptions, PyRunResult } from '../py/types';
import { lookup } from '../py/show';
import { rng } from './engine';

export type PyRun = (code: string, opts?: PyRunOptions) => Promise<PyRunResult>;

// 画面では Worker の Pyodide を使う。試験では Node の Pyodide に差し替える
let runner: PyRun = async (code, opts) => (await import('../py/session')).runPy(code, opts);
export function setRunner(r: PyRun) { runner = r; refCache.clear(); }
export const runCode: PyRun = (code, opts) => runner(code, opts);

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
  run: PyRunResult;
  hidden?: boolean;
  /** set・append で変えた中身の説明 */
  note?: string;
}

export interface Grade {
  ok: boolean;
  /** 書式だけが違う(正解として扱い、注意を添える) */
  formatOnly?: boolean;
  tests?: TestResult[];
  message?: string;
}

const refCache = new Map<string, string>();

export async function expected(ref: string, t: TestCase): Promise<string> {
  if (t.expect !== undefined) return t.expect;
  const key = ref + '\u0000' + (t.stdin ?? '');
  let v = refCache.get(key);
  if (v === undefined) {
    const r = await runner(ref, { stdin: t.stdin, maxTrace: 0 });
    if (r.status !== 'ok') throw new Error(`参照解が実行できません: ${r.error?.type} ${r.error?.message}`);
    v = r.stdout;
    refCache.set(key, v);
  }
  return v;
}

/** テストの set・append を、解答にも参照解にも同じように当てる */
export function applyTest(code: string, t: TestCase): string {
  let out = code;
  for (const [name, value] of Object.entries(t.set ?? {})) {
    out = out.replace(new RegExp(`^${name}\\s*=(?!=).*$`, 'm'), `${name} = ${value}`);
  }
  if (t.append) out = out.replace(/\s*$/, '\n') + t.append + '\n';
  return out;
}

function testNote(t: TestCase): string | undefined {
  const parts: string[] = [];
  const set = Object.entries(t.set ?? {});
  if (set.length) parts.push(`値を ${set.map(([k, v]) => `${k} = ${v}`).join('、')} に変えて動かしました。`);
  if (t.append) parts.push(`最後に次の行を足して動かしました。\n${t.append}`);
  return parts.length ? parts.join('\n') : undefined;
}

export async function runTests(code: string, ref: string, tests: TestCase[]): Promise<Grade> {
  const results: TestResult[] = [];
  // 1 つずつ順に動かす(実行環境は 1 つなので、並べても速くならない)
  for (const t of tests) {
    const want = await expected(applyTest(ref, t), t);
    const r = await runner(applyTest(code, t), { stdin: t.stdin, maxSteps: 300_000, maxTrace: 0 });
    const verdict = r.status !== 'ok' ? 'error' : compareOutput(r.stdout, want);
    results.push({ stdin: t.stdin, want, got: r.stdout, verdict, run: r, hidden: t.hidden, note: testNote(t) });
  }
  const passed = results.every((t) => t.verdict === 'same' || t.verdict === 'format');
  return {
    ok: passed,
    formatOnly: passed && results.some((t) => t.verdict === 'format'),
    tests: results,
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
export async function traceRows(p: Problem & { type: 'trace' }, max = 8): Promise<string[][]> {
  const r = await runner(p.code, { stdin: p.stdin });
  const rows: string[][] = [];
  for (const s of r.trace) {
    if (s.line !== p.line || s.event !== 'line') continue;
    rows.push(p.vars.map((name) => lookup(s, name) ?? '—'));
    if (rows.length >= max) break;
  }
  return rows;
}

/** 予測の答えを比べる。改行の有無や行末の空白の違いは許す */
export function checkPredict(answer: string, actual: string): boolean {
  const norm = (s: string) => s.replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '').replace(/^\n+/, '');
  return norm(answer) === norm(actual);
}

/** トレース表の 1 マスを比べる。文字列は引用符の有無と種類を問わない。空白の入れ方も問わない */
export function checkTraceCell(answer: string, want: string): boolean {
  const norm = (s: string) => s.trim().replace(/"/g, "'").replace(/\s+/g, ' ').replace(/\s*([,:\[\](){}])\s*/g, '$1');
  const a = norm(answer), w = norm(want);
  if (a === w) return true;
  const m = /^'(.*)'$/.exec(w);
  return !!m && a === m[1];
}
