// ============================================================================
// org-chart / tree 测试：快照（小/中/深 + 折叠）、子严格在父下方、
// 两结构矩形逐像素一致、tree 折线含 L 指令、确定性。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { layoutOrgChart } from '../src/layout/org-chart';
import { layoutTree } from '../src/layout/tree';
import type { DocNode } from '../src/types';
import {
  assertNoOverlap, eachVisiblePair, makeOpts, node, rectOf, snap,
} from './helpers';

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

function buildDeep(): DocNode {
  let child: DocNode = node('d8', '最深');
  for (let i = 7; i >= 1; i--) {
    child = node(`d${i}`, `第${i}层`, [node(`x${i}`, `侧叶${i}`), child]);
  }
  return node('r', 'root', [child]);
}

describe('org-chart 快照', () => {
  it('小树', () => {
    expect(snap(layoutOrgChart(small, makeOpts()))).toMatchSnapshot();
  });
  it('中树', () => {
    expect(snap(layoutOrgChart(medium, makeOpts()))).toMatchSnapshot();
  });
  it('深树', () => {
    expect(snap(layoutOrgChart(buildDeep(), makeOpts()))).toMatchSnapshot();
  });
  it('折叠', () => {
    const doc = node('r', '根', [
      node('a', '甲'),
      node('b', '两级', [node('b1', '子一'), node('b2', '子二')]),
      node('c', '丙'),
    ]);
    doc.children[1]!.collapsed = true;
    expect(snap(layoutOrgChart(doc, makeOpts()))).toMatchSnapshot();
    const r = layoutOrgChart(doc, makeOpts());
    expect(r.nodeRects.has('b1')).toBe(false);
    expect(r.nodeRects.has('b2')).toBe(false);
  });
});

describe('org-chart 结构性质', () => {
  it('孩子顶边严格位于父底边 + levelGap', () => {
    const r = layoutOrgChart(medium, makeOpts());
    eachVisiblePair(medium, (parent, child) => {
      const p = rectOf(r, parent.id);
      const c = rectOf(r, child.id);
      expect(c.y).toBe(p.y + p.height + 60);
    });
  });
  it('全部节点两两不重叠；根是最顶节点', () => {
    const r = layoutOrgChart(medium, makeOpts());
    assertNoOverlap(r.nodeRects);
    let minY = Infinity;
    for (const rect of r.nodeRects.values()) minY = Math.min(minY, rect.y);
    expect(rectOf(r, 'r').y).toBe(minY);
  });
  it('父横向居中于首末孩子（经典 RT）', () => {
    const r = layoutOrgChart(medium, makeOpts());
    const p = rectOf(r, 'b');
    const b1 = rectOf(r, 'b1');
    const b2 = rectOf(r, 'b2');
    const expectCenter = (b1.x + b1.width / 2 + b2.x + b2.width / 2) / 2;
    expect(p.x + p.width / 2).toBe(expectCenter);
  });
});

describe('tree：org-chart 折线变体', () => {
  it('矩形与 org-chart 逐像素一致，仅连线不同', () => {
    const a = layoutOrgChart(medium, makeOpts());
    const b = layoutTree(medium, makeOpts());
    expect([...a.nodeRects.entries()]).toEqual([...b.nodeRects.entries()]);
    expect(a.bounds).toEqual(b.bounds);
    expect(a.branches).not.toEqual(b.branches);
  });
  it('折线含 3 段 L 指令且经过中线', () => {
    const r = layoutTree(medium, makeOpts());
    expect(r.branches[0]!.d).toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
    const p = rectOf(r, 'r');
    const c = rectOf(r, 'a');
    // M x1 y1 L x1 my L x2 my L x2 y2（path 数字经 num() 保留 2 位，用 toBeCloseTo 比对）
    const vals = r.branches[0]!.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const x1 = p.x + p.width / 2;
    const y1 = p.y + p.height;
    const x2 = c.x + c.width / 2;
    const my = (y1 + c.y) / 2;
    expect(vals).toHaveLength(8);
    expect(vals[0]).toBeCloseTo(x1, 2);
    expect(vals[1]).toBeCloseTo(y1, 2);
    expect(vals[2]).toBeCloseTo(x1, 2);
    expect(vals[3]).toBeCloseTo(my, 2);
    expect(vals[4]).toBeCloseTo(x2, 2);
    expect(vals[5]).toBeCloseTo(my, 2);
    expect(vals[6]).toBeCloseTo(x2, 2);
    expect(vals[7]).toBeCloseTo(c.y, 2);
  });
  it('快照（中树）', () => {
    expect(snap(layoutTree(medium, makeOpts()))).toMatchSnapshot();
  });
});

describe('org-chart / tree 确定性', () => {
  it('同输入两次运行输出全等', () => {
    expect(snap(layoutOrgChart(medium, makeOpts()))).toEqual(snap(layoutOrgChart(medium, makeOpts())));
    expect(snap(layoutTree(medium, makeOpts()))).toEqual(snap(layoutTree(medium, makeOpts())));
  });
});
