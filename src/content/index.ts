// 教材の入口。コースの並びと知識要素、診断テストをまとめて出す
import type { Course } from './types';
import { VARS, COND, LOOP } from './main1';
import { ARRAY, FUNC, PTR } from './main2';
import { PROJECT_PC } from './project';

export { KCS } from './kcs';
export { DIAG } from './diag';

export const MAIN: Course = {
  id: 'main',
  title: '本編: C の基礎',
  summary: '変数からポインタまで。1 行ずつ動きを見て、予測して、書きます。',
  units: [VARS, COND, LOOP, ARRAY, FUNC, PTR],
};

/** 先頭が本編。作品コースは利用者が選んだ系統のものを見せる */
export const COURSES: Course[] = [MAIN, PROJECT_PC];
