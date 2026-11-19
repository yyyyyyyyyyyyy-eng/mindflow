// ============================================================================
// 布局性能基准（vitest 5 bench：test 上下文 fixture）：
// - 确定性 1000 节点树（BFS 三叉填充，文本「节点N」，无随机源）；
// - 契约要求：单次 layout() < 16ms —— 以 latency.mean 断言并输出；
// - 附 3000 节点应力档供余量参考。
// 运行：pnpm bench（vitest bench --run）
// ============================================================================

import { expect, test } from 'vitest';
import { layout } from '../src/layout';
import type { DocNode, LayoutOptions, StructureType } from '../src/types';
import { makeMeasure, makeOpts } from '../test/helpers';

/** 确定性 N 节点树：BFS 三叉填充 */
function buildTree(total: number): DocNode {
  const nodes: DocNode[] = [];
  const mk = (i: number): DocNode => ({ id: `n${i}`, text: `节点${i}`, children: [] });
  const root = mk(0);
  nodes.push(root);
  let cursor = 1;
  let frontier = 0; // 待挂孩子的队首
  while (cursor < total) {
    const parent = nodes[frontier]!;
    for (let k = 0; k < 3 && cursor < total; k++) {
      const child = mk(cursor++);
      nodes.push(child);
      parent.children.push(child);
    }
    frontier++;
  }
  return root;
}

const tree1000 = buildTree(1000);
const tree3000 = buildTree(3000);
const opts: LayoutOptions = makeOpts({ measureText: makeMeasure(14, 1.05, 1.4) });

const STRUCTURES: StructureType[] = [
  'logic-right', 'mindmap', 'org-chart', 'fishbone', 'timeline-h', 'timeline-v', 'tree',
];

test('layout × 1000 节点（契约阈值：单次 <16ms）', async (ctx) => {
  for (const s of STRUCTURES) {
    const result = await ctx.bench(`${s} × 1000`, () => {
      layout(tree1000, s, opts);
    }).run();
    console.log(`[bench] ${result.name} → latency.mean ${result.latency.mean.toFixed(3)}ms（阈值 16ms）`);
    expect(result.latency.mean).toBeLessThan(16);
  }
});

test('layout × 3000 节点（余量参考，阈值 16ms）', async (ctx) => {
  for (const s of ['logic-right', 'mindmap'] as const) {
    const result = await ctx.bench(`${s} × 3000`, () => {
      layout(tree3000, s, opts);
    }).run();
    console.log(`[bench] ${result.name} → latency.mean ${result.latency.mean.toFixed(3)}ms（参考）`);
    expect(result.latency.mean).toBeLessThan(16);
  }
});
