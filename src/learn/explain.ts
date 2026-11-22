// エラーの種類ごとの、もう一歩踏み込んだ説明。本物の C ではどうなるかも伝える
import type { RuntimeCode } from '../interp/errors';

const TEXT: Partial<Record<RuntimeCode, string>> = {
  'out-of-bounds': '本物の C では、範囲外に書いても止まらず、隣の変数を黙って壊すことがあります。このサイトでは起きた瞬間に止めて知らせます。',
  'use-after-free': '本物の C では、解放した場所や消えた変数を使っても、たまたま動いてしまうことがあります。見つけにくい不具合の代表です。',
  'double-free': '本物の C では、二重の free でプログラムが落ちたり、攻撃に使われたりします。free した後のポインタに NULL を入れておくと防げます。',
  uninit: '本物の C では、値を入れていない変数には前に使われていたゴミが入っています。実行するたびに結果が変わる原因になります。',
  'null-deref': '本物の C では「Segmentation fault」と出て落ちます。',
  overflow: '本物の C では、符号付き整数のあふれは未定義動作です。マイナスの大きな数に化けることが多いですが、保証はありません。',
  'stack-overflow': '本物の C でも「Segmentation fault」で落ちます。再帰は、必ず終わりの条件(基底条件)に届くようにします。',
  'div-zero': '本物の C では「Floating point exception」と出て落ちます。',
};

export function explainError(code: RuntimeCode): string | undefined {
  return TEXT[code];
}
