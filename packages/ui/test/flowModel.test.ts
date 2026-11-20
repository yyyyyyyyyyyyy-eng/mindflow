// ============================================================================
// flowModel 单测（纯函数，node 环境）：
// 坐标投影 / 主题逐级配色与根样式覆盖 / 折叠子树不出现 / 行内编辑标记 / 连线颜色。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { getTheme } from 'mindflow-core';
import type { LayoutResult, MindDoc } from 'mindflow-core';
import { applyPosOffsets, buildFlowGraph, colorByLevel, indexTree } from '../src/flowModel';

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

  it('投影：节点数量/坐标/尺寸与布局结果一致，且声明 dragHandle 限定 RF 拖拽只从卡片本体发起', () => {
    const { nodes } = buildFlowGraph(doc, res, null, theme);
    expect(nodes.length).toBe(4);
    const a = nodes.find((n) => n.id === 'a')!;
    expect(a.position).toEqual({ x: 180, y: -30 });
    expect(a.style?.width).toBe(100);
    expect(a.style?.height).toBe(40);
    expect(a.dragHandle).toBe('.mf-node-body');
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

  it('连线：3 条，path 原样透传，颜色按子节点层级，挂绳钉点=父/子卡片顶上球心', () => {
    const { edges } = buildFlowGraph(doc, res, null, theme);
    expect(edges.length).toBe(3);
    const ra = edges.find((e) => e.id === 'e-r-a')!;
    expect(ra.data?.d).toBe('M120 20 C150 20 150 -10 180 -10');
    expect(ra.data?.color).toBe(theme.branchColorByLevel[1]);
    // r(0,0,120,40) → 钉 {x:60, y:-3}；a(180,-30,100,40) → 钉 {x:230, y:-33}
    expect(ra.data?.pinA).toEqual({ x: 60, y: -3 });
    expect(ra.data?.pinB).toEqual({ x: 230, y: -33 });
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

describe('applyPosOffsets（自定义位置，2026-11-20）', () => {
  it('无任何 pos：快速路径原样返回同一对象', () => {
    const res = makeLayout();
    expect(applyPosOffsets(makeDoc(), res)).toBe(res);
  });

  it('单节点偏移：a.pos 只平移 a，子孙（a1）与未动节点保持原位', () => {
    const doc = makeDoc();
    const a = doc.root.children[0]!;
    a.pos = { dx: 40, dy: -10 };
    const shifted = applyPosOffsets(doc, makeLayout());

    expect(shifted.nodeRects.get('a')).toEqual({ x: 220, y: -40, width: 100, height: 40 });
    expect(shifted.nodeRects.get('a1')).toEqual({ x: 340, y: -50, width: 80, height: 36 });   // 不随动
    expect(shifted.nodeRects.get('r')).toEqual({ x: 0, y: 0, width: 120, height: 40 });
    expect(shifted.nodeRects.get('b')).toEqual({ x: 180, y: 30, width: 90, height: 40 });
  });

  it('连线规则：两端未动保留引擎 path；任一端动过则重生成（锚定贝塞尔）', () => {
    const doc = makeDoc();
    doc.root.children[0]!.pos = { dx: 40, dy: -10 };
    const natural = makeLayout();
    const shifted = applyPosOffsets(doc, natural);

    const rb = shifted.branches.find((b) => b.toId === 'b')!;
    expect(rb.d).toBe('M120 20 C150 20 150 50 180 50');    // r→b 两端未动：原样

    const ra = shifted.branches.find((b) => b.toId === 'a')!;
    expect(ra.d).not.toBe('M120 20 C150 20 150 -10 180 -10');
    expect(ra.d.startsWith('M 120')).toBe(true);          // 从父边框出发
    const endX = Number(ra.d.split(' ').slice(-2, -1)[0]);
    expect(endX).toBeCloseTo(220, 1);                     // 到子（平移后）边框

    const aa1 = shifted.branches.find((b) => b.toId === 'a1')!;
    expect(aa1.d).not.toBe('M280 -10 C310 -10 310 -32 340 -32');  // 两端都动过 → 重生成
  });

  it('bounds 按平移后矩形重算', () => {
    const doc = makeDoc();
    doc.root.children[0]!.pos = { dx: 40, dy: -10 };
    const shifted = applyPosOffsets(doc, makeLayout());
    // a 移至 220..320（a1 自然位 340..420 仍为最右），minY 取 a 的 -40
    expect(shifted.bounds).toEqual({ width: 420, height: 120 });
  });

  it('buildFlowGraph 集成：节点投影坐标带偏移', () => {
    const doc = makeDoc();
    doc.root.children[0]!.pos = { dx: 40, dy: -10 };
    const { nodes } = buildFlowGraph(doc, makeLayout(), null, getTheme('classic'));
    expect(nodes.find((n) => n.id === 'a')!.position).toEqual({ x: 220, y: -40 });
    expect(nodes.find((n) => n.id === 'b')!.position).toEqual({ x: 180, y: 30 });
  });
});
