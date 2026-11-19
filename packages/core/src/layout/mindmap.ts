// ============================================================================
// 思维导图（左右发散）layout-mindmap：
// 根居中；一级子树按文档序贪心加入「当前总高较小」的一侧（严格更小才进左侧，
// 平局归右侧）；每侧内部与 logic-right 完全同构；侧块整体垂直居中于根。
// 说明：「两侧总高度差最小」按贪心序实现（XMind 同类做法）；若主对话裁决
// 要求全局最优划分，再改为子集和 DP——见交付摘要疑问清单。
// ============================================================================

import type { BranchPath, DocNode, LayoutOptions, LayoutResult, NodeId, Rect } from '../types';
import {
  arrangeTidy, at, buildResult, collectVisible, crossExtentOf, hCurve,
  normalizeOptions, stackSubtrees, type NodeBox, type TidyResult,
} from './common';

export function layoutMindmap(root: DocNode, opts: LayoutOptions): LayoutResult {
  const o = normalizeOptions(opts);
  const box = collectVisible(root, o);

  // 每棵一级子树独立做 tidy 整理（副轴几何与 logic-right 同构）
  const tidy = new Map<NodeId, TidyResult>();
  const items = box.children.map((c) => ({ box: c, res: arrangeTidy(c, o, true, tidy) }));

  // 两侧分配：文档序贪心，加入当前总高较小侧；平局（含初始 0=0）归右
  const left: typeof items = [];
  const right: typeof items = [];
  let leftSum = 0;
  let rightSum = 0;
  for (const it of items) {
    const ext = crossExtentOf(it.res);
    if (leftSum < rightSum) {
      left.push(it);
      leftSum += ext.bottom - ext.top;
    } else {
      right.push(it);
      rightSum += ext.bottom - ext.top;
    }
  }

  const rawRects = new Map<NodeId, Rect>();
  rawRects.set(box.id, { x: 0, y: -box.h / 2, width: box.w, height: box.h });

  // 深度遍历放置：dir=1 向右（孩子左缘=父右缘+levelGap），dir=-1 向左镜像
  const place = (b: NodeBox, x: number, cross: number, dir: 1 | -1): void => {
    rawRects.set(b.id, { x, y: cross - b.h / 2, width: b.w, height: b.h });
    const res = tidy.get(b.id)!; // arrangeTidy 已覆盖全部可见节点
    b.children.forEach((c, i) => {
      const childX = dir === 1 ? x + b.w + o.levelGap : x - o.levelGap - c.w;
      place(c, childX, cross + at(res.childOffsets, i), dir);
    });
  };

  const branches: BranchPath[] = [];
  const connect = (parent: NodeBox, child: NodeBox, dir: 1 | -1, rectOf: (id: NodeId) => Rect): void => {
    const p = rectOf(parent.id);
    const r = rectOf(child.id);
    // 右侧：父右缘 → 子左缘；左侧镜像：父左缘 → 子右缘（hCurve 对 x1>x2 同样成立）
    const d = dir === 1
      ? hCurve(p.x + p.width, p.y + p.height / 2, r.x, r.y + r.height / 2)
      : hCurve(p.x, p.y + p.height / 2, r.x + r.width, r.y + r.height / 2);
    branches.push({ fromId: parent.id, toId: child.id, d });
  };

  // 两侧分别堆叠并居中于根副轴中心（根中心=0）
  const sides: Array<{ list: typeof items; dir: 1 | -1 }> = [
    { list: right, dir: 1 },
    { list: left, dir: -1 },
  ];
  for (const side of sides) {
    if (side.list.length === 0) continue;
    const { centers, contour } = stackSubtrees(side.list, o, true, box.w + o.levelGap);
    let top = Infinity;
    let bottom = -Infinity;
    for (const l of contour) {
      if (!l) continue;
      top = Math.min(top, l.top);
      bottom = Math.max(bottom, l.bottom);
    }
    const blockCenter = (top + bottom) / 2;
    side.list.forEach((it, i) => {
      const cross = at(centers, i) - blockCenter; // 块中心平移到根中心
      // 一级孩子主轴：右缘/左缘贴根 + levelGap
      const x = side.dir === 1 ? box.w + o.levelGap : -o.levelGap - it.box.w;
      place(it.box, x, cross, side.dir);
    });
  }

  return buildResult(rawRects, [], (rectOf) => {
    // 连线：根 → 两侧一级孩子；侧内逐层父 → 子（镜像方向由 dir 决定）
    for (const side of sides) {
      for (const it of side.list) {
        connect(box, it.box, side.dir, rectOf);
        const walk = (p: NodeBox): void => {
          for (const c of p.children) {
            connect(p, c, side.dir, rectOf);
            walk(c);
          }
        };
        walk(it.box);
      }
    }
    return branches;
  });
}
