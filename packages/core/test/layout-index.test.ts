// ============================================================================
// layout() 统一入口测试：7 结构分发、未知结构抛错、measureText 缺失抛错、
// 折叠语义跨全部结构、确定性跨全部结构。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { layout } from '../src/layout';
import { layoutLogicRight } from '../src/layout/logic-right';
import { layoutTree } from '../src/layout/tree';
import type { DocNode, LayoutOptions, StructureType } from '../src/types';
import { counterIdGen, makeOpts, node, snap } from './helpers';

const ALL: StructureType[] = [
  'logic-right', 'mindmap', 'org-chart', 'fishbone', 'timeline-h', 'timeline-v', 'tree',
];

/** 可见节点计数（含根；collapsed 子树不计） */
function countVisible(root: DocNode): number {
  let n = 1;
  for (const c of root.children ?? []) {
    n += 1;
    if (!c.collapsed) n += countVisible(c) - 1;
  }
  return n;
}

const doc = node('r', '中心主题', [
  node('a', '分支一', [node('a1', '叶一'), node('a2', '叶二')]),
  node('b', '分支二'),
  node('c', '分支三', [node('c1', '叶三')]),
]);

describe('layout() 分发', () => {
  it.each(ALL)('结构 %s：节点数 = 可见节点数，且与直接引擎调用等价（抽查）', (s) => {
    const r = layout(doc, s, makeOpts());
    expect(r.nodeRects.size).toBe(countVisible(doc));
    expect(r.bounds.width).toBeGreaterThan(0);
    expect(r.bounds.height).toBeGreaterThan(0);
  });
  it('分发正确性抽查：与直接调用全等', () => {
    const opts = makeOpts();
    expect(snap(layout(doc, 'logic-right', opts))).toEqual(snap(layoutLogicRight(doc, opts)));
    expect(snap(layout(doc, 'tree', opts))).toEqual(snap(layoutTree(doc, opts)));
  });
  it('未知结构抛出明确错误', () => {
    expect(() => layout(doc, 'bogus' as StructureType, makeOpts())).toThrowError(/未知的结构类型/);
  });
  it('measureText 缺失抛出明确错误', () => {
    const bad = { ...makeOpts(), measureText: undefined } as unknown as LayoutOptions;
    expect(() => layout(doc, 'mindmap', bad)).toThrowError(/measureText/);
  });
});

describe('折叠语义（全部结构一致）', () => {
  it.each(ALL)('结构 %s：collapsed 子树不进 nodeRects/branches', (s) => {
    const folded = node('r', '根', [
      node('a', '甲'),
      node('b', '折叠分支', [node('b1', '隐藏一'), node('b2', '隐藏二', [node('b21', '更深')])]),
      node('c', '丙'),
    ]);
    folded.children[1]!.collapsed = true;
    const r = layout(folded, s, makeOpts());
    for (const hidden of ['b1', 'b2', 'b21']) {
      expect(r.nodeRects.has(hidden)).toBe(false);
      expect(r.branches.some((br) => br.toId === hidden || br.fromId === hidden)).toBe(false);
    }
    expect(r.nodeRects.has('b')).toBe(true); // 折叠节点本身可见
    expect(r.nodeRects.size).toBe(countVisible(folded));
  });
});

describe('确定性（全部结构一致，禁 Math.random / Date.now）', () => {
  it.each(ALL)('结构 %s：同输入两次运行输出全等', (s) => {
    const opts = makeOpts();
    const a = snap(layout(doc, s, opts));
    const b = snap(layout(doc, s, opts));
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('id 与文本边界', () => {
  it('空文本/空 children 树可布局（尺寸=纯内边距）', () => {
    const empty = node(counterIdGen()(), '', []);
    const r = layout(empty, 'mindmap', makeOpts());
    const rect = r.nodeRects.values().next().value!;
    expect(rect.width).toBe(24); // 2 × nodePadding（空文本宽度为 0）
    expect(rect.height).toBeCloseTo(14 * 1.4 + 24, 6); // 高度不受粗体影响：1 行 × 1.4
  });
});
