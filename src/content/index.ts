// 教材の入口。コースの並びと知識要素、診断テストをまとめて出す
import type { Course } from './types';
import { VARS, COND, LOOP } from './main1';
import { LIST, FUNC, ALIAS } from './main2';
import { PROJECT } from './project';

export { KCS } from './kcs';
export { DIAG } from './diag';

export const MAIN: Course = {
  id: 'main',
  title: '本編: Python の基礎',
  summary: '値と計算から、名前とオブジェクトの関係まで。1 行ずつ動きを見て、予測して、書きます。',
  units: [VARS, COND, LOOP, LIST, FUNC, ALIAS],
};

/** 先頭が本編。続いて作品コース */
export const COURSES: Course[] = [MAIN, PROJECT];
