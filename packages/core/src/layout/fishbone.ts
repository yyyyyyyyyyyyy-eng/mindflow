// ============================================================================
// 鱼骨图 layout-fishbone：
// 根（主题框）在左、纵心落在主脊上；主脊水平向右；一级子为 60° 斜肋、沿脊
// 交替上下（偶数肋在上）；一级子的全部后代按先序展平成一条链、沿肋线性排布
// （相邻盒缘距恒为 levelGap，盒子中心落在肋线上）。
//
// 几何默认值（契约只给规则形状，具体常数在此固定，见交付摘要）：
// - 肋锚点间距 = levelGap；
// - 主脊末端 = 全部内容右缘 + levelGap，计入 bounds；
// - 主脊以「root → 最后一个一级子」的 BranchPath 表示（契约 BranchPath 只有
//   父/子两个 id，主脊这类结构线暂借末位一级子承载，见交付摘要疑问）；
// - 肋上分支：锚点 → 一级子近缘；链上：父远缘 → 子近缘（同一肋线）。
// ============================================================================

import type { BranchPath, DocNode, LayoutOptions, LayoutResult, NodeId, Rect } from '../types';
import { buildResult, collectVisible, normalizeOptions, num, type NodeBox } from './common';

/** 60° 三角常数（确定性，无随机源） */
const SIN60 = Math.sqrt(3) / 2;
const COS60 = 0.5;

/** 盒子中心沿肋线（单位方向）到边界的距离：与两半轴的交点取近者 */
function edgeDist(b: NodeBox): number {
  return Math.min(b.w, b.h / 2 / SIN60);
}

/** 肋链节点：box + 树上的真实父节点（含链内父 RibNode 引用，O(1) 免查找） + 中心沿肋距锚点距离 */
interface RibNode {
  box: NodeBox;
  parentBox: NodeBox;    // 一级子的 parentBox = 根
  parentNode: RibNode | null; // 链内父节点（一级子为 null）
  dist: number;          // 中心距锚点距离（沿肋单位方向）
}

export function layoutFishbone(root: DocNode, opts: LayoutOptions): LayoutResult {
  const o = normalizeOptions(opts);
  const box = collectVisible(root, o);

  // —— 每根肋：展平链 + 线性距离分配（raw 坐标）——
  const ribData: Array<{ rib: NodeBox; dirY: 1 | -1; chain: RibNode[] }> = [];
  box.children.forEach((rib, i) => {
    const dirY: 1 | -1 = i % 2 === 0 ? -1 : 1; // 偶数肋在上（画布 y 向下）
    const chain: RibNode[] = [];
    let prevEdge: number | null = null; // 前一链节远缘位置（null=尚未放置任何节点）
    const build = (b: NodeBox, parentBox: NodeBox, parentNode: RibNode | null): void => {
      const near = prevEdge === null ? o.levelGap : prevEdge + o.levelGap;
      const dist = near + edgeDist(b);
      const rn: RibNode = { box: b, parentBox, parentNode, dist };
      chain.push(rn);
      prevEdge = dist + edgeDist(b);
      for (const c of b.children) build(c, b, rn);
    };
    build(rib, box, null);
    ribData.push({ rib, dirY, chain });
  });

  // —— 矩形（raw：根左缘 0，主脊 y=0 即根中心）——
  const rawRects = new Map<NodeId, Rect>();
  rawRects.set(box.id, { x: 0, y: -box.h / 2, width: box.w, height: box.h });
  ribData.forEach((rd, i) => {
    const attachX = box.w + i * o.levelGap; // 锚点 raw x
    for (const rn of rd.chain) {
      const cx = attachX + rn.dist * COS60;
      const cy = rn.dist * SIN60 * rd.dirY;
      rawRects.set(rn.box.id, { x: cx - rn.box.w / 2, y: cy - rn.box.h / 2, width: rn.box.w, height: rn.box.h });
    }
  });

  // —— 主脊末端参与 bounds（无肋则不出主脊）——
  const extraPoints: Array<[number, number]> = [];
  if (box.children.length > 0) {
    let maxRight = box.w;
    for (const r of rawRects.values()) maxRight = Math.max(maxRight, r.x + r.width);
    extraPoints.push([maxRight + o.levelGap, 0]);
  }

  return buildResult(rawRects, extraPoints, (rectOf, rects) => {
    const branches: BranchPath[] = [];
    const rootRect = rectOf(box.id);
    const spineY = rootRect.y + rootRect.height / 2;

    // 主脊：根 → 最后一个一级子
    if (box.children.length > 0) {
      let endX = rootRect.x + rootRect.width;
      for (const r of rects.values()) endX = Math.max(endX, r.x + r.width);
      const lastRib = box.children[box.children.length - 1]!;
      branches.push({
        fromId: box.id,
        toId: lastRib.id,
        d: `M ${num(rootRect.x + rootRect.width)} ${num(spineY)} L ${num(endX + o.levelGap)} ${num(spineY)}`,
      });
    }

    // 各肋：锚点 → 一级子近缘；链上：父远缘 → 子近缘
    ribData.forEach((rd, i) => {
      const attachX = rootRect.x + rootRect.width + i * o.levelGap; // 平移后锚点
      const dx = COS60;
      const dy = SIN60 * rd.dirY;
      for (const rn of rd.chain) {
        const startDist = rn.parentNode === null
          ? 0 // 一级子：分支自主脊锚点出发
          : rn.parentNode.dist + edgeDist(rn.parentNode.box); // 父远缘
        const endDist = rn.dist - edgeDist(rn.box); // 子近缘
        branches.push({
          fromId: rn.parentBox.id,
          toId: rn.box.id,
          d: `M ${num(attachX + startDist * dx)} ${num(spineY + startDist * dy)}`
            + ` L ${num(attachX + endDist * dx)} ${num(spineY + endDist * dy)}`,
        });
      }
    });
    return branches;
  });
}
