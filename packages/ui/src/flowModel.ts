// ============================================================================
// flowModel：文档树 + 布局结果 → React Flow 节点/边（纯函数，零 DOM）。
//
// 设计原则：布局是唯一几何权威——画布只是投影。节点坐标/尺寸全部来自
// LayoutResult.nodeRects，React Flow 不再自行排布；连线直接使用布局产出的
// 贝塞尔 path（BranchPath.d），由自定义边渲染。
// 主题映射规则（契约 §2/§5）：style 覆盖 > 根样式 rootStyle > 逐级配色末位兜底。
// ============================================================================

import type { Edge, Node } from '@xyflow/react';
import type {
  BranchPath, DocNode, LayoutResult, MindDoc, NodeId, Rect, Theme,
} from 'mindflow-core';

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

/** 画布边数据：d 为布局产出的 SVG path（兜底几何）；pinA/pinB 为顶钉（静态参考 + live 增量基准）；
 *  anchorA/anchorB 为按父子几何选择的实际挂绳锚点（底边/顶边/钉）；axis=true 为主轴/主脊（张紧直线渲染） */
export interface MindBranchData extends Record<string, unknown> {
  d: string;
  color: string;
  /** 父节点顶上小钉中心（live 跟随的位移基准） */
  pinA: { x: number; y: number };
  /** 子节点顶上小钉中心 */
  pinB: { x: number; y: number };
  /** 实际挂绳锚点：父侧（底边中点 / 顶钉 / 主轴直线端点） */
  anchorA: { x: number; y: number };
  /** 实际挂绳锚点：子侧（顶钉 / 底边中点 / 主轴直线端点） */
  anchorB: { x: number; y: number };
  /** 主轴/主脊（timeline 主轴、鱼骨主脊）：张紧直线，不做悬垂物理 */
  axis?: boolean;
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

// —— 自定义位置（契约 §2 pos）：布局后处理，子树整体随动 ——————————————

interface Offset {
  dx: number;
  dy: number;
}

const ZERO: Offset = { dx: 0, dy: 0 };

/** 数字归整：与引擎 num() 同规格（保留 2 位小数） */
function num(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * 收集逐节点偏移：pos 只作用于节点本身（2026-11-20 按用户口径修订，取消子树随动）；
 * 无任何 pos 时返回 null（快速路径）。
 */
function collectOffsets(root: DocNode): Map<NodeId, Offset> | null {
  const map = new Map<NodeId, Offset>();
  let found = false;
  const walk = (node: DocNode) => {
    if (node.pos) {
      found = true;
      map.set(node.id, { dx: node.pos.dx, dy: node.pos.dy });
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return found ? map : null;
}

function shiftRect(r: Rect, o: Offset): Rect {
  return { x: r.x + o.dx, y: r.y + o.dy, width: r.width, height: r.height };
}

/** 矩形边框上朝向目标的锚点（中心连线与边框的交点） */
function borderPoint(r: Rect, target: { x: number; y: number }): { x: number; y: number } {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = Math.min(
    (r.width / 2) / Math.abs(dx || Infinity),
    (r.height / 2) / Math.abs(dy || Infinity),
  );
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** 通用锚定贝塞尔：两端取边框交点，主轴决定切线方向（水平/垂直 S 曲线） */
function regenBranch(from: Rect, to: Rect): string {
  const pa = borderPoint(from, { x: to.x + to.width / 2, y: to.y + to.height / 2 });
  const pb = borderPoint(to, { x: from.x + from.width / 2, y: from.y + from.height / 2 });
  if (Math.abs(pb.x - pa.x) >= Math.abs(pb.y - pa.y)) {
    const mx = (pa.x + pb.x) / 2;
    return `M ${num(pa.x)} ${num(pa.y)} C ${num(mx)} ${num(pa.y)}, ${num(mx)} ${num(pb.y)}, ${num(pb.x)} ${num(pb.y)}`;
  }
  const my = (pa.y + pb.y) / 2;
  return `M ${num(pa.x)} ${num(pa.y)} C ${num(pa.x)} ${num(my)}, ${num(pb.x)} ${num(my)}, ${num(pb.x)} ${num(pb.y)}`;
}

/**
 * 应用自定义位置偏移（纯函数）：
 * - 节点矩形按「自身 pos」平移（仅该节点，不带动子孙——2026-11-20 修订）；
 * - 两端偏移均为 0 的连线保留引擎原 path；任一端有偏移的连线用通用锚定贝塞尔重生成；
 * - bounds 按平移后的矩形重算。
 * 文档无任何 pos 时原样返回 res（零开销快速路径）。
 */
export function applyPosOffsets(doc: MindDoc, res: LayoutResult): LayoutResult {
  const offsets = collectOffsets(doc.root);
  if (offsets === null) return res;

  const nodeRects = new Map<NodeId, Rect>();
  for (const [id, rect] of res.nodeRects) {
    nodeRects.set(id, shiftRect(rect, offsets.get(id) ?? ZERO));
  }

  const branches: BranchPath[] = res.branches.map((b) => {
    const p = offsets.get(b.fromId) ?? ZERO;
    const c = offsets.get(b.toId) ?? ZERO;
    const moved = (p.dx !== 0 || p.dy !== 0 || c.dx !== 0 || c.dy !== 0);
    if (!moved) return b;                      // 两端未动：保留引擎曲线样式
    const pr = nodeRects.get(b.fromId);
    const cr = nodeRects.get(b.toId);
    if (!pr || !cr) return b;                  // 防御：矩形缺失时不重生成
    return { ...b, d: regenBranch(pr, cr) };
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of nodeRects.values()) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return {
    nodeRects,
    branches,
    bounds: { width: maxX - minX, height: maxY - minY },
  };
}

/**
 * 小钉挂点：卡片顶面装饰钉的球心（MindNode 的钉 span：top:-9 高 12 → 球心在顶面上方 3px）。
 * 细绳从父/子钉球心之间悬挂（契约内 UI 细节，2026-11-20 实体感升级）。
 */
export function pinOf(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y - 3 };
}

/**
 * 按父子相对几何选择挂绳锚点（2026-11-20 修「绳穿卡片」）：
 * - 子在父正下方（组织架构/树形/时间轴下侧小栈）：父卡片底边中点 ↔ 子顶钉；
 * - 子在父正上方（时间轴上侧小栈）：父顶钉 ↔ 子卡片底边中点；
 * - 同层/侧向（思维导图/逻辑图/鱼骨）：钉对钉。
 */
export function anchorFor(parent: Rect, child: Rect): { a: { x: number; y: number }; b: { x: number; y: number } } {
  // 子顶边已在父底边之下（留 1px 容差） → 下方连接
  if (child.y >= parent.y + parent.height - 1) {
    return {
      a: { x: parent.x + parent.width / 2, y: parent.y + parent.height },
      b: pinOf(child),
    };
  }
  // 子底边已在父顶边之上 → 上方连接
  if (child.y + child.height <= parent.y + 1) {
    return {
      a: pinOf(parent),
      b: { x: child.x + child.width / 2, y: child.y + child.height },
    };
  }
  // 侧向：钉对钉
  return { a: pinOf(parent), b: pinOf(child) };
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
  // 自定义位置后处理：pos 偏移在此统一应用（子树随动 + 连线重生成）
  const geo = applyPosOffsets(doc, res);
  const nodes: MindFlowNode[] = [];

  for (const [id, rect] of geo.nodeRects) {
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
      // RF 拖拽只允许从卡片本体发起：顶上手柄（自定义位置）与两侧圆钮不触发 d3 拖拽
      // （2026-11-20 修复手柄拖拽瞬移：合成 stopPropagation 拦不住 d3 原生监听，必须用官方 dragHandle 隔离）
      dragHandle: '.mf-node-body',
      data,
    });
  }

  const edges: MindFlowEdge[] = geo.branches.map((b) => {
    const target = index.get(b.toId);
    const pr = geo.nodeRects.get(b.fromId);
    const cr = geo.nodeRects.get(b.toId);
    const anchors = pr && cr ? anchorFor(pr, cr) : null;
    // 主轴/主脊识别（timeline 主轴、鱼骨主脊 = 根 → 末位一级子）：张紧直线，
    // 悬垂绳会垂穿中间所有轴卡——锚点直接取引擎直线段两端。
    const axisStructure = doc.structure === 'timeline-h' || doc.structure === 'timeline-v' || doc.structure === 'fishbone';
    const lastChild = doc.root.children.length > 0 ? doc.root.children[doc.root.children.length - 1]!.id : null;
    const isAxis = axisStructure && b.fromId === doc.root.id && b.toId === lastChild;
    let anchorA = anchors?.a ?? pinOf(pr ?? { x: 0, y: 0, width: 0, height: 0 });
    let anchorB = anchors?.b ?? pinOf(cr ?? { x: 0, y: 0, width: 0, height: 0 });
    if (isAxis) {
      const m = /^M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)$/.exec(b.d);
      if (m) {
        anchorA = { x: Number(m[1]), y: Number(m[2]) };
        anchorB = { x: Number(m[3]), y: Number(m[4]) };
      }
    }
    return {
      id: `e-${b.fromId}-${b.toId}`,
      source: b.fromId,
      target: b.toId,
      type: 'branch',
      data: {
        d: b.d,
        color: colorByLevel(theme.branchColorByLevel, target?.level ?? 1),
        pinA: pinOf(pr ?? { x: 0, y: 0, width: 0, height: 0 }),
        pinB: pinOf(cr ?? { x: 0, y: 0, width: 0, height: 0 }),
        anchorA,
        anchorB,
        ...(isAxis ? { axis: true } : {}),
      },
    };
  });

  return { nodes, edges };
}
