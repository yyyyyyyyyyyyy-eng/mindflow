// ============================================================================
// logic-right（逻辑图·右向）测试：快照（小/中/深）、折叠语义、确定性、
// 结构性质（子在父右侧、无重叠）、跨层级碰撞回归。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { layoutLogicRight } from '../src/layout/logic-right';
import type { DocNode } from '../src/types';
import {
  assertNoOverlap, eachVisiblePair, makeOpts, node, rectOf, snap,
} from './helpers';

// —— 固定测试树 ——
const small = node('r', '根', [node('a', '甲'), node('b', '乙')]);

const medium = node('r', '中心主题', [
  node('a', '长长的一级节点标题'),
  node('b', '两级节点', [
    node('b1', '子节点一'),
    node('b2', '两行\n文本'),
  ]),
  node('c', 'English mixed 中英混排'),
  node('d', '叶子'),
]);

/** 深树：深度 8 的链，链上每层挂 1 个侧叶，共 17 个可见节点 */
function buildDeep(): DocNode {
  let child: DocNode = node('d8', '最深');
  for (let i = 7; i >= 1; i--) {
    child = node(`d${i}`, `第${i}层`, [node(`x${i}`, `侧叶${i}`), child]);
  }
  return node('r', 'root', [child]);
}

describe('logic-right 快照', () => {
  it('小树（根 + 2 叶）', () => {
    expect(snap(layoutLogicRight(small, makeOpts()))).toMatchSnapshot();
  });
  it('中树（4 分支、含多行文本与中英混排）', () => {
    expect(snap(layoutLogicRight(medium, makeOpts()))).toMatchSnapshot();
  });
  it('深树（8 层链 + 侧叶）', () => {
    expect(snap(layoutLogicRight(buildDeep(), makeOpts()))).toMatchSnapshot();
  });
  it('折叠：b.collapsed 后其子树不进入结果', () => {
    const doc = node('r', '中心主题', [
      node('a', '甲'),
      node('b', '两级', [node('b1', '子一'), node('b2', '子二')]),
      node('c', '丙'),
    ]);
    doc.children[1]!.collapsed = true;
    const r = layoutLogicRight(doc, makeOpts());
    expect(snap(r)).toMatchSnapshot();
    expect(r.nodeRects.has('b1')).toBe(false);
    expect(r.nodeRects.has('b2')).toBe(false);
    expect(r.branches.some((b) => b.toId === 'b1' || b.toId === 'b2')).toBe(false);
    expect(r.nodeRects.has('b')).toBe(true); // 折叠节点本身可见
  });
});

describe('logic-right 结构性质', () => {
  it('孩子严格位于父右缘 + levelGap 处', () => {
    const r = layoutLogicRight(medium, makeOpts());
    eachVisiblePair(medium, (parent, child) => {
      const p = rectOf(r, parent.id);
      const c = rectOf(r, child.id);
      expect(c.x).toBe(p.x + p.width + 60);
    });
  });
  it('全部节点两两不重叠', () => {
    for (const doc of [small, medium, buildDeep()]) {
      assertNoOverlap(layoutLogicRight(doc, makeOpts()).nodeRects);
    }
  });
  it('根是最左节点', () => {
    const r = layoutLogicRight(medium, makeOpts());
    let minX = Infinity;
    for (const rect of r.nodeRects.values()) minX = Math.min(minX, rect.x);
    expect(rectOf(r, 'r').x).toBe(minX);
  });
  it('跨层级碰撞回归：宽叶 + 窄兄弟带高三层孩子，不产生重叠', () => {
    // 若轮廓合并只比同层，b1（深、窄）会垂直撞上宽叶 a 的右半区
    const doc = node('r', '根', [
      node('a', 'a'.repeat(60)),          // 宽叶（约 545px 宽）
      node('b', '乙', [node('b1', '一\n二\n三')]), // 窄子 + 高孙
    ]);
    const r = layoutLogicRight(doc, makeOpts());
    assertNoOverlap(r.nodeRects);
    const a = rectOf(r, 'a');
    const b1 = rectOf(r, 'b1');
    expect(b1.y).toBeGreaterThanOrEqual(a.y + a.height + 16 - 1e-9); // 与宽叶保持 siblingGap
  });
});

describe('logic-right 折叠与确定性', () => {
  it('branches 数 = 可见父子对数', () => {
    const r = layoutLogicRight(medium, makeOpts());
    let pairs = 0;
    eachVisiblePair(medium, () => { pairs++; });
    expect(r.branches.length).toBe(pairs);
    expect(r.nodeRects.size).toBe(7); // 4 + 2 + 1
  });
  it('同输入两次运行输出全等（确定性）', () => {
    const a = snap(layoutLogicRight(medium, makeOpts()));
    const b = snap(layoutLogicRight(medium, makeOpts()));
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('仅根节点：1 矩形、0 连线、bounds 等于根尺寸', () => {
    const r = layoutLogicRight(node('r', '仅根'), makeOpts());
    expect(r.nodeRects.size).toBe(1);
    expect(r.branches.length).toBe(0);
    const rect = rectOf(r, 'r');
    expect(r.bounds).toEqual({ width: rect.width, height: rect.height });
  });
});
