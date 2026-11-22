// 試験用に、Node で Pyodide を 1 つ読み込む
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { installTracer, runPython } from '../src/py/core';
import type { PyRunOptions, PyRunResult } from '../src/py/types';

let ready: Promise<PyodideAPI> | null = null;

export function nodePy(): Promise<PyodideAPI> {
  // vitest の変換を通ると自分の場所を見失うので、読み込み元を明示する
  ready ??= loadPyodide({ indexURL: decodeURIComponent(new URL('../node_modules/pyodide/', import.meta.url).pathname) })
    .then((py) => { installTracer(py); return py; });
  return ready;
}

export async function nodeRun(code: string, opts?: PyRunOptions): Promise<PyRunResult> {
  return runPython(await nodePy(), code, opts);
}
