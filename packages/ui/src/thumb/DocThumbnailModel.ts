// ============================================================================
// 文档缩略图（主界面「最近文档」卡片用）：用引擎布局直接画示意小图。
//
// thumbnailModel 为纯函数（零 DOM：固定字号 + 确定性假测量），node 环境可单测；
// DocThumbnail 组件消费其输出渲染 SVG（矩形 + 中心连线示意）。
// ============================================================================

import { DEFAULT_LAYOUT_OPTIONS, getTheme, layout, normalizeOptions } from 'mindflow-core';
import type { MindDoc, NodeId, Theme } from 'mindflow-core';
import { applyPosOffsets } from '../flowModel';

/** 缩略图节点（已按目标尺寸等比缩放） */
export interface ThumbNode {
  id: NodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  level: number;
}

export interface ThumbModel {
  /** 等比缩放后的示意矩形 */
  nodes: ThumbNode[];
  /** 中心连线示意（父子中心点对） */
  branches: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }>;
  viewBox: { w: number; h: number };
}

/** 确定性假测量（缩略图是示意图，无需真实字宽） */
function schematicMeasure(fontSize: number) {
  return (text: string, bold: boolean): { width: number; height: number } => {
    const ratio = bold ? 1.05 : 1;
    const lines = text.split('\n');
    let width = 0;
    for (const line of lines) {
      let w = 0;
      for (const ch of line) w += /[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/.test(ch) ? 1 : 0.62;
      width = Math.max(width, w * fontSize * ratio);
    }
    return { width, height: lines.length * fontSize * 1.4 };
  };
}

/**
 * 计算文档缩略图模型（纯函数）：
 * 引擎布局（缩略尺度参数）→ 应用 pos 偏移 → bounds 等比缩放进 (maxW × maxH)。
 * @param doc   文档
 * @param maxW  目标最大宽（px）
 * @param maxH  目标最大高（px）
 * @param theme 文档主题（取逐级配色；缺省 classic）
 */
export function thumbnailModel(doc: MindDoc, maxW: number, maxH: number, theme?: Theme): ThumbModel {
  const t = theme ?? getTheme(doc.theme);
  const fontSize = 8;
  const res = layout(doc.root, doc.structure, normalizeOptions({
    ...DEFAULT_LAYOUT_OPTIONS,
    nodePadding: 4,
    levelGap: 22,
    siblingGap: 7,
    fontSize,
    measureText: schematicMeasure(fontSize),
  }));
  const geo = applyPosOffsets(doc, res);

  const bw = geo.bounds.width || 1;
  const bh = geo.bounds.height || 1;
  const scale = Math.min(maxW / bw, maxH / bh, 1);

  const centers = new Map<NodeId, { x: number; y: number }>();
  const nodes: ThumbNode[] = [];
  for (const [id, r] of geo.nodeRects) {
    centers.set(id, { x: r.x + r.width / 2, y: r.y + r.height / 2 });
  }
  // 层级信息来自文档树（geo 只有矩形）
  const levels = new Map<NodeId, number>();
  const walkLv = (id: NodeId, level: number, children: MindDoc['root']['children']) => {
    levels.set(id, level);
    for (const c of children) walkLv(c.id, level + 1, c.children);
  };
  walkLv(doc.root.id, 0, doc.root.children);

  for (const [id, r] of geo.nodeRects) {
    const level = levels.get(id) ?? 0;
    nodes.push({
      id,
      x: r.x * scale,
      y: r.y * scale,
      w: Math.max(3, r.width * scale),
      h: Math.max(2.5, r.height * scale),
      fill: level === 0
        ? t.rootStyle.fill ?? t.nodeFillByLevel[0]!
        : t.nodeFillByLevel[Math.min(level, t.nodeFillByLevel.length - 1)]!,
      level,
    });
  }

  const branches = geo.branches.map((b) => {
    const p = centers.get(b.fromId);
    const c = centers.get(b.toId);
    const level = levels.get(b.toId) ?? 1;
    return {
      x1: (p?.x ?? 0) * scale, y1: (p?.y ?? 0) * scale,
      x2: (c?.x ?? 0) * scale, y2: (c?.y ?? 0) * scale,
      color: t.branchColorByLevel[Math.min(level, t.branchColorByLevel.length - 1)]!,
    };
  });

  return { nodes, branches, viewBox: { w: bw * scale, h: bh * scale } };
}
