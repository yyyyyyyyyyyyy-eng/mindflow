// ============================================================================
// 组织架构图 layout-org-chart：自上而下的 tidy tree。
// 主轴 = y（孩子顶边 = 父底边 + levelGap），副轴 = x（arrangeTidy 居中）。
// 连线：父底边中点 → 子顶边中点的垂直 S 曲线（「垂直居中下接」）。
// tree.ts 复用本文件的 computeOrgGeometry，仅替换连线为直角折线。
// ============================================================================

import type { BranchPath, DocNode, LayoutOptions, LayoutResult, NodeId, Rect } from '../types';
import {
  arrangeTidy, at, buildResult, collectVisible, normalizeOptions, vCurve,
  type NodeBox, type NormOpts, type TidyResult,
} from './common';

/** org-chart / tree 共用的矩形几何（两结构坐标逐像素一致） */
export interface OrgGeometry {
  box: NodeBox;
  rawRects: Map<NodeId, Rect>;
  tidy: Map<NodeId, TidyResult>;
}

/** 计算 org-chart 矩形几何：根顶边 y=0、副轴中心 x=0（buildResult 再归一化） */
export function computeOrgGeometry(root: DocNode, o: NormOpts): OrgGeometry {
  const box = collectVisible(root, o);
  const tidy = new Map<NodeId, TidyResult>();
  arrangeTidy(box, o, false, tidy);
  const rawRects = new Map<NodeId, Rect>();
  const place = (b: NodeBox, top: number, cross: number): void => {
    rawRects.set(b.id, { x: cross - b.w / 2, y: top, width: b.w, height: b.h });
    const res = tidy.get(b.id)!;
    b.children.forEach((c, i) => {
      place(c, top + b.h + o.levelGap, cross + at(res.childOffsets, i));
    });
  };
  place(box, 0, 0);
  return { box, rawRects, tidy };
}

export function layoutOrgChart(root: DocNode, opts: LayoutOptions): LayoutResult {
  const o = normalizeOptions(opts);
  const { box, rawRects } = computeOrgGeometry(root, o);
  return buildResult(rawRects, [], (rectOf) => {
    const branches: BranchPath[] = [];
    const walk = (b: NodeBox): void => {
      for (const c of b.children) {
        const p = rectOf(b.id);
        const r = rectOf(c.id);
        // 父底边中点 → 子顶边中点，垂直 S 曲线
        branches.push({
          fromId: b.id,
          toId: c.id,
          d: vCurve(p.x + p.width / 2, p.y + p.height, r.x + r.width / 2, r.y),
        });
        walk(c);
      }
    };
    walk(box);
    return branches;
  });
}
