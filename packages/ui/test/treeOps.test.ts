// ============================================================================
// treeOps 单测：节点定位、子树判定（拖拽防环）、大纲可见行收集（折叠截断）。
// ============================================================================

import { describe, expect, it } from 'vitest';
import type { DocNode } from 'mindflow-core';
import { collectOutlineRows, findNode, inSubtree } from '../src/treeOps';

function tree(): DocNode {
  return {
    id: 'r',
    text: '根',
    children: [
      {
        id: 'a', text: 'A',
        children: [{ id: 'a1', text: 'A1', children: [{ id: 'a1x', text: 'A1X', children: [] }] }],
      },
      { id: 'b', text: 'B', collapsed: true, children: [{ id: 'b1', text: 'B1', children: [] }] },
    ],
  };
}

describe('findNode', () => {
  it('定位普通节点：返回父节点与下标', () => {
    const loc = findNode(tree(), 'a1')!;
    expect(loc.node.text).toBe('A1');
    expect(loc.parent?.id).toBe('a');
    expect(loc.index).toBe(0);
  });

  it('根节点：parent 为 null，index 0', () => {
    const loc = findNode(tree(), 'r')!;
    expect(loc.parent).toBeNull();
    expect(loc.index).toBe(0);
  });

  it('不存在返回 null；折叠不影响查找', () => {
    expect(findNode(tree(), 'nope')).toBeNull();
    expect(findNode(tree(), 'b1')!.node.text).toBe('B1');
  });
});

describe('inSubtree（拖拽防环判定）', () => {
  const t = tree();
  it('自身判定为在子树内', () => {
    expect(inSubtree(t, 'a', 'a')).toBe(true);
  });
  it('后代判定：a 的子树含 a1 / a1x', () => {
    expect(inSubtree(t, 'a', 'a1')).toBe(true);
    expect(inSubtree(t, 'a', 'a1x')).toBe(true);
  });
  it('不在子树内：a 子树不含 b / 根', () => {
    expect(inSubtree(t, 'a', 'b')).toBe(false);
    expect(inSubtree(t, 'a', 'r')).toBe(false);
  });
});

describe('collectOutlineRows（大纲可见行）', () => {
  it('折叠处截断：B1 不出现，其余深度优先序', () => {
    const rows = collectOutlineRows(tree());
    expect(rows.map((r) => r.id)).toEqual(['r', 'a', 'a1', 'a1x', 'b']);
    expect(rows[4]!.collapsed).toBe(true);
    expect(rows[4]!.childCount).toBe(1);
  });

  it('层级随深度递增', () => {
    const rows = collectOutlineRows(tree());
    expect(rows[2]!.level).toBe(2);
    expect(rows[3]!.level).toBe(3);
  });
});
