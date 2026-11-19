// ============================================================================
// 逻辑图（右向）layout-logic-right：
// 经典 Reingold–Tilford tidy tree（左右轮廓合并），根在左，子树向右展开。
// 主轴 = x（孩子左缘 = 父右缘 + levelGap），副轴 = y（arrangeTidy 整理）。
// ============================================================================

import type { BranchPath, DocNode, LayoutOptions, LayoutResult, NodeId, Rect } from '../types';
import {
  arrangeTidy, at, buildResult, collectVisible, hCurve, normalizeOptions,
  type NodeBox, type TidyResult,
} from './common';

export function layoutLogicRight(root: DocNode, opts: LayoutOptions): LayoutResult {
  const o = normalizeOptions(opts);
  const box = collectVisible(root, o);
  const tidy = new Map<NodeId, TidyResult>();
  arrangeTidy(box, o, true, tidy);

  // 绝对坐标：根左缘 x=0、副轴中心 y=0（buildResult 统一再平移到原点）
  const rawRects = new Map<NodeId, Rect>();
  const place = (b: NodeBox, x: number, cross: number): void => {
    rawRects.set(b.id, { x, y: cross - b.h / 2, width: b.w, height: b.h });
    const res = tidy.get(b.id)!; // arrangeTidy 已为每个可见节点写入
    b.children.forEach((c, i) => {
      place(c, x + b.w + o.levelGap, cross + at(res.childOffsets, i));
    });
  };
  place(box, 0, 0);

  return buildResult(rawRects, [], (rectOf) => {
    const branches: BranchPath[] = [];
    const walk = (b: NodeBox): void => {
      for (const c of b.children) {
        const p = rectOf(b.id);
        const r = rectOf(c.id);
        // 水平 S 曲线：父右缘中点 → 子左缘中点
        branches.push({
          fromId: b.id,
          toId: c.id,
          d: hCurve(p.x + p.width, p.y + p.height / 2, r.x, r.y + r.height / 2),
        });
        walk(c);
      }
    };
    walk(box);
    return branches;
  });
}
