// ============================================================================
// flowModel 单测（纯函数，node 环境）：
// 坐标投影 / 主题逐级配色与根样式覆盖 / 折叠子树不出现 / 行内编辑标记 / 连线颜色。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { getTheme } from 'mindflow-core';
import type { LayoutResult, MindDoc } from 'mindflow-core';
import { buildFlowGraph, colorByLevel, indexTree } from '../src/flowModel';

function makeDoc(): MindDoc {
  return {
    formatVersion: 1,
    id: 'd1',
    title: '中心主题',
    structure: 'mindmap',
    theme: 'classic',
    root: {
      id: 'r',
      text: '中心主题',
      children: [
        { id: 'a', text: '分支甲', children: [{ id: 'a1', text: '要点', children: [] }] },
        { id: 'b', text: '分支乙', collapsed: true, children: [{ id: 'b1', text: '隐藏', children: [] }] },
      ],
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** 手工布局结果：b 已折叠故 b1 不出现 */
function makeLayout(): LayoutResult {
  return {
    nodeRects: new Map([
      ['r', { x: 0, y: 0, width: 120, height: 40 }],
      ['a', { x: 180, y: -30, width: 100, height: 40 }],
      ['a1', { x: 340, y: -50, width: 80, height: 36 }],
      ['b', { x: 180, y: 30, width: 90, height: 40 }],
    ]),
    branches: [
      { fromId: 'r', toId: 'a', d: 'M120 20 C150 20 150 -10 180 -10' },
      { fromId: 'r', toId: 'b', d: 'M120 20 C150 20 150 50 180 50' },
      { fromId: 'a', toId: 'a1', d: 'M280 -10 C310 -10 310 -32 340 -32' },
    ],
    bounds: { width: 420, height: 120 },
  };
}

describe('buildFlowGraph', () => {
  const doc = makeDoc();
  const res = makeLayout();
  const theme = getTheme('classic');

  it('投影：节点数量/坐标/尺寸与布局结果一致', () => {
    const { nodes } = buildFlowGraph(doc, res, null, theme);
    expect(nodes.length).toBe(4);
    const a = nodes.find((n) => n.id === 'a')!;
    expect(a.position).toEqual({ x: 180, y: -30 });
    expect(a.style?.width).toBe(100);
    expect(a.style?.height).toBe(40);
  });

  it('主题：根用 rootStyle，其余按深度取逐级配色', () => {
    const { nodes } = buildFlowGraph(doc, res, null, theme);
    const r = nodes.find((n) => n.id === 'r')!;
    const a = nodes.find((n) => n.id === 'a')!;
    const a1 = nodes.find((n) => n.id === 'a1')!;
    expect(r.data.fill).toBe(theme.rootStyle.fill);
    expect(r.data.textColor).toBe(theme.rootStyle.textColor);
    expect(a.data.fill).toBe(theme.nodeFillByLevel[1]);
    expect(a1.data.fill).toBe(theme.nodeFillByLevel[2]);
    expect(a.data.shape).toBe('rounded-rect');
  });

  it('折叠：b 可见且标记 collapsed，子节点 b1 不出现；childCount 含隐藏孩子', () => {
    const { nodes } = buildFlowGraph(doc, res, null, theme);
    const b = nodes.find((n) => n.id === 'b')!;
    expect(b.data.collapsed).toBe(true);
    expect(b.data.childCount).toBe(1);
    expect(nodes.find((n) => n.id === 'b1')).toBeUndefined();
  });

  it('行内编辑：editingId 命中单个节点', () => {
    const { nodes } = buildFlowGraph(doc, res, 'a', theme);
    expect(nodes.find((n) => n.id === 'a')!.data.editing).toBe(true);
    expect(nodes.find((n) => n.id === 'r')!.data.editing).toBe(false);
  });

  it('连线：3 条，path 原样透传，颜色按子节点层级', () => {
    const { edges } = buildFlowGraph(doc, res, null, theme);
    expect(edges.length).toBe(3);
    const ra = edges.find((e) => e.id === 'e-r-a')!;
    expect(ra.data?.d).toBe('M120 20 C150 20 150 -10 180 -10');
    expect(ra.data?.color).toBe(theme.branchColorByLevel[1]);
    const aa1 = edges.find((e) => e.id === 'e-a-a1')!;
    expect(aa1.data?.color).toBe(theme.branchColorByLevel[2]);
  });

  it('colorByLevel 越界回退末位', () => {
    expect(colorByLevel(['#111', '#222'], 9)).toBe('#222');
    expect(colorByLevel(['#111'], 0)).toBe('#111');
  });

  it('indexTree 覆盖全树（含折叠隐藏）且深度正确', () => {
    const idx = indexTree(doc.root);
    expect(idx.size).toBe(5);                       // 含 b1
    expect(idx.get('b1')!.level).toBe(2);
  });
});
