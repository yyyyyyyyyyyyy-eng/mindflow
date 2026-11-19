// ============================================================================
// flowModel：文档树 + 布局结果 → React Flow 节点/边（纯函数，零 DOM）。
//
// 设计原则：布局是唯一几何权威——画布只是投影。节点坐标/尺寸全部来自
// LayoutResult.nodeRects，React Flow 不再自行排布；连线直接使用布局产出的
// 贝塞尔 path（BranchPath.d），由自定义边渲染。
// 主题映射规则（契约 §2/§5）：style 覆盖 > 根样式 rootStyle > 逐级配色末位兜底。
// ============================================================================

import type { Edge, Node } from '@xyflow/react';
import type { DocNode, LayoutResult, MindDoc, NodeId, Theme } from 'mindflow-core';

/** 画布节点数据（自定义 'mind' 节点类型的 data） */
export interface MindNodeData extends Record<string, unknown> {
  text: string;
  level: number;
  isRoot: boolean;
  collapsed: boolean;
  childCount: number;        // 全部孩子数（含折叠隐藏的）
  hasNote: boolean;
  shape: 'rounded-rect' | 'rect' | 'ellipse' | 'underline' | 'diamond';
  fill: string;
  textColor: string;
  bold: boolean;
  fontSize: number;
  editing: boolean;          // 行内编辑态（由画布维护，非文档属性）
}

export type MindFlowNode = Node<MindNodeData, 'mind'>;

/** 画布边数据：d 为布局产出的 SVG path，color 为该层连线色 */
export interface MindBranchData extends Record<string, unknown> {
  d: string;
  color: string;
}

export type MindFlowEdge = Edge<MindBranchData>;

/** 节点索引：id → { 节点, 深度 }（整棵树，含折叠隐藏的节点） */
export interface IndexedEntry {
  node: DocNode;
  level: number;
}

export function indexTree(root: DocNode): Map<NodeId, IndexedEntry> {
  const out = new Map<NodeId, IndexedEntry>();
  const walk = (node: DocNode, level: number) => {
    out.set(node.id, { node, level });
    for (const child of node.children) walk(child, level + 1);
  };
  walk(root, 0);
  return out;
}

/** 逐级配色取值：层级超出数组长度时取末位（契约 §5） */
export function colorByLevel(palette: readonly string[], level: number): string {
  const v = palette[Math.min(level, palette.length - 1)];
  return v ?? palette[0]!;
}

/** 粗体判定：与引擎 isBold 语义一致（style.fontWeight 优先；缺省仅根加粗） */
export function displayBold(node: DocNode, level: number): boolean {
  const fw = node.style?.fontWeight;
  if (fw) return fw === 'bold';
  return level === 0;
}

/**
 * 构建画布图：文档 + 布局结果 + 主题 → React Flow nodes/edges。
 * @param doc       当前文档
 * @param res       layout() 产出
 * @param editingId 行内编辑中的节点 id（null 无）
 * @param theme     当前主题
 */
export function buildFlowGraph(
  doc: MindDoc,
  res: LayoutResult,
  editingId: NodeId | null,
  theme: Theme,
): { nodes: MindFlowNode[]; edges: MindFlowEdge[] } {
  const index = indexTree(doc.root);
  const nodes: MindFlowNode[] = [];

  for (const [id, rect] of res.nodeRects) {
    const entry = index.get(id);
    if (!entry) continue;                 // 防御：布局结果与文档不一致时跳过
    const { node, level } = entry;
    const isRoot = level === 0;
    const style = node.style;

    const fill = style?.fill
      ?? (isRoot
        ? theme.rootStyle.fill ?? colorByLevel(theme.nodeFillByLevel, 0)
        : colorByLevel(theme.nodeFillByLevel, level));
    const textColor = style?.textColor
      ?? (isRoot ? theme.rootStyle.textColor ?? theme.textColor : theme.textColor);
    const shape = style?.shape
      ?? (isRoot && theme.rootStyle.shape ? theme.rootStyle.shape : 'rounded-rect');

    const data: MindNodeData = {
      text: node.text,
      level,
      isRoot,
      collapsed: node.collapsed === true,
      childCount: node.children.length,
      hasNote: typeof node.note === 'string' && node.note.length > 0,
      shape,
      fill,
      textColor,
      bold: displayBold(node, level),
      fontSize: style?.fontSize ?? 14,
      editing: editingId === id,
    };

    nodes.push({
      id,
      type: 'mind',
      position: { x: rect.x, y: rect.y },
      style: { width: rect.width, height: rect.height },
      data,
    });
  }

  const edges: MindFlowEdge[] = res.branches.map((b) => {
    const target = index.get(b.toId);
    return {
      id: `e-${b.fromId}-${b.toId}`,
      source: b.fromId,
      target: b.toId,
      type: 'branch',
      data: {
        d: b.d,
        color: colorByLevel(theme.branchColorByLevel, target?.level ?? 1),
      },
    };
  });

  return { nodes, edges };
}
