// ============================================================================
// mindmap（思维导图·左右发散）测试：快照、平局归右侧、折叠后再分配、
// 两侧不越界、确定性。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { layoutMindmap } from '../src/layout/mindmap';
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

describe('mindmap 快照', () => {
  it('小树（2 叶：先右后左）', () => {
    expect(snap(layoutMindmap(small, makeOpts()))).toMatchSnapshot();
  });
  it('中树（4 分支含子树，两侧平衡）', () => {
    expect(snap(layoutMindmap(medium, makeOpts()))).toMatchSnapshot();
  });
  it('深树', () => {
    expect(snap(layoutMindmap(buildDeep(), makeOpts()))).toMatchSnapshot();
  });
  it('折叠：b 折叠后重新分配两侧', () => {
    const doc = node('r', '中心主题', [
      node('a', '甲'),
      node('b', '两级', [node('b1', '子一'), node('b2', '子二')]),
      node('c', '丙'),
      node('d', '丁'),
    ]);
    doc.children[1]!.collapsed = true;
    expect(snap(layoutMindmap(doc, makeOpts()))).toMatchSnapshot();
    const r = layoutMindmap(doc, makeOpts());
    expect(r.nodeRects.has('b1')).toBe(false);
    expect(r.nodeRects.has('b2')).toBe(false);
    expect(r.nodeRects.has('b')).toBe(true);
  });
});

describe('mindmap 两侧分配语义', () => {
  it('两个等高叶：平局归右侧（第一个孩子进右）', () => {
    const r = layoutMindmap(small, makeOpts());
    const root = rectOf(r, 'r');
    const a = rectOf(r, 'a');
    const b = rectOf(r, 'b');
    expect(a.x).toBeGreaterThanOrEqual(root.x + root.width);       // a 在右
    expect(b.x + b.width).toBeLessThanOrEqual(root.x);             // b 在左
  });
  it('大子树进左、其余贪心补右，且互不重叠', () => {
    const r = layoutMindmap(medium, makeOpts());
    const root = rectOf(r, 'r');
    // b（带子树，总高最大）应先入右？——按文档序：a 先入右，b 总高更大进左
    const b = rectOf(r, 'b');
    expect(b.x + b.width).toBeLessThanOrEqual(root.x);
    for (const id of ['a', 'c', 'd']) {
      const rc = rectOf(r, id);
      expect(rc.x).toBeGreaterThanOrEqual(root.x + root.width);
    }
    assertNoOverlap(r.nodeRects);
  });
  it('branches 数 = 可见父子对数', () => {
    const r = layoutMindmap(medium, makeOpts());
    let pairs = 0;
    eachVisiblePair(medium, () => { pairs++; });
    expect(r.branches.length).toBe(pairs);
  });
});

describe('mindmap 确定性', () => {
  it('同输入两次运行输出全等', () => {
    const a = snap(layoutMindmap(medium, makeOpts()));
    const b = snap(layoutMindmap(medium, makeOpts()));
    expect(a).toEqual(b);
  });
  it('仅根/单孩子：单孩子必在右侧', () => {
    const only = layoutMindmap(node('r', '根'), makeOpts());
    expect(only.branches.length).toBe(0);
    const one = layoutMindmap(node('r', '根', [node('a', '独子')]), makeOpts());
    const root = rectOf(one, 'r');
    expect(rectOf(one, 'a').x).toBeGreaterThanOrEqual(root.x + root.width);
    expect(rectOf(one, 'a').y).toBe(root.y); // 单孩子与根同中心
  });
});
