// ============================================================================
// 时间轴 layout-timeline（timeline-h / timeline-v）：
// - 深度 1 节点沿主轴等距排布（盒缘间距 = levelGap），根与深度 1 全部
//   中心落在主轴上；
// - 深度 ≥2：每个一级子的孩子按索引奇偶交替进入负/正方向侧
//   （h：偶上奇下；v：偶左奇右——契约未指定首侧，默认负侧优先），
//   每个深度 2 节点作为小栈根、其后代沿「向外」主轴作纵向 tidy
//   （机制与 org-chart 同构，向上/向左时镜像）；
// - 主轴以「root → 末位深度 1 节点」的 BranchPath 表示（与鱼骨主脊同约定）；
//   深度 1 节点本身不再各发一条连线（主轴即其视觉连线）。
// h 与 v 共享同一实现：vertical=false → 主轴=x；true → 主轴=y。
// ============================================================================

import type { BranchPath, DocNode, LayoutOptions, LayoutResult, NodeId, Rect } from '../types';
import {
  arrangeTidy, at, buildResult, collectVisible, hCurve, normalizeOptions, num, vCurve,
  type NodeBox, type TidyResult,
} from './common';

/** 时间轴内部实现：vertical=false → timeline-h；true → timeline-v */
function layoutTimeline(root: DocNode, opts: LayoutOptions, vertical: boolean): LayoutResult {
  const o = normalizeOptions(opts);
  const box = collectVisible(root, o);

  const rawRects = new Map<NodeId, Rect>();
  // 根：主轴起点 0，副轴中心 0（h：x=0,y=-h/2；v：x=-w/2,y=0）
  rawRects.set(box.id, vertical
    ? { x: -box.w / 2, y: 0, width: box.w, height: box.h }
    : { x: 0, y: -box.h / 2, width: box.w, height: box.h });

  /** 一级子与其小栈根的对应关系（连线阶段用） */
  const miniRoots: Array<{ parent: NodeBox; child: NodeBox; sigma: 1 | -1 }> = [];

  // 主轴游标：下一个深度 1 节点的主轴起点（盒缘间距恒 levelGap）
  const rootMainSize = vertical ? box.h : box.w;
  let axisCursor = rootMainSize + o.levelGap;

  for (const p of box.children) {
    const pMainSize = vertical ? p.h : p.w;
    const pMainStart = axisCursor;
    axisCursor += pMainSize + o.levelGap;
    rawRects.set(p.id, vertical
      ? { x: -p.w / 2, y: pMainStart, width: p.w, height: p.h }
      : { x: pMainStart, y: -p.h / 2, width: p.w, height: p.h });
    if (p.children.length === 0) continue;

    // 小栈整理（栈主轴 = h 时为 y、v 时为 x → arrangeTidy 的 horizontal = vertical）
    const tidy = new Map<NodeId, TidyResult>();
    const pStackHalf = vertical ? p.w / 2 : p.h / 2;  // 一级子在栈轴上的半尺寸
    const miniCrossCenter = vertical ? pMainStart + p.h / 2 : pMainStart + p.w / 2; // 小栈副轴中心
    const stackSize = (b: NodeBox): number => (vertical ? b.w : b.h);

    let negCursor = o.levelGap; // 负方向侧（h:上 / v:左）已推进的向外距离
    let posCursor = o.levelGap; // 正方向侧（h:下 / v:右）

    p.children.forEach((c, j) => {
      const sigma: 1 | -1 = j % 2 === 0 ? -1 : 1;
      const res = arrangeTidy(c, o, vertical, tidy);
      // 小栈自主栈根近缘起算的总主跨距
      let span = 0;
      for (const l of res.levels) span = Math.max(span, l.right);
      const u0 = sigma < 0 ? negCursor : posCursor;
      if (sigma < 0) negCursor += span + o.siblingGap;
      else posCursor += span + o.siblingGap;
      miniRoots.push({ parent: p, child: c, sigma });

      // 递归放置小栈：u = 自一级子近缘起算的向外距离；crossCenter 沿副轴
      const placeMini = (b: NodeBox, u: number, crossCenter: number): void => {
        if (!vertical) {
          // h：栈轴 = y；crossCenter = x 中心
          if (sigma < 0) {
            const yBottom = -pStackHalf - u; // 向上：盒底 = 一级子上缘 - u
            rawRects.set(b.id, { x: crossCenter - b.w / 2, y: yBottom - b.h, width: b.w, height: b.h });
          } else {
            const yTop = pStackHalf + u; // 向下：盒顶 = 一级子下缘 + u
            rawRects.set(b.id, { x: crossCenter - b.w / 2, y: yTop, width: b.w, height: b.h });
          }
        } else {
          // v：栈轴 = x；crossCenter = y 中心
          if (sigma < 0) {
            const xRight = -pStackHalf - u;
            rawRects.set(b.id, { x: xRight - b.w, y: crossCenter - b.h / 2, width: b.w, height: b.h });
          } else {
            const xLeft = pStackHalf + u;
            rawRects.set(b.id, { x: xLeft, y: crossCenter - b.h / 2, width: b.w, height: b.h });
          }
        }
        const r = tidy.get(b.id)!;
        b.children.forEach((cc, i) => {
          placeMini(cc, u + stackSize(b) + o.levelGap, crossCenter + at(r.childOffsets, i));
        });
      };
      placeMini(c, u0, miniCrossCenter);
    });
  }

  return buildResult(rawRects, [], (rectOf) => {
    const branches: BranchPath[] = [];
    const rootRect = rectOf(box.id);

    // 主轴：根远缘 → 末位深度 1 节点远缘（无深度 1 则不出主轴）
    if (box.children.length > 0) {
      const last = box.children[box.children.length - 1]!;
      const lastRect = rectOf(last.id);
      if (!vertical) {
        const y = rootRect.y + rootRect.height / 2;
        branches.push({
          fromId: box.id, toId: last.id,
          d: `M ${num(rootRect.x + rootRect.width)} ${num(y)} L ${num(lastRect.x + lastRect.width)} ${num(y)}`,
        });
      } else {
        const x = rootRect.x + rootRect.width / 2;
        branches.push({
          fromId: box.id, toId: last.id,
          d: `M ${num(x)} ${num(rootRect.y + rootRect.height)} L ${num(x)} ${num(lastRect.y + lastRect.height)}`,
        });
      }
    }

    // 一级子 → 小栈根：沿栈轴的直线；栈内：沿栈轴 S 曲线
    for (const { parent: p, child: c, sigma } of miniRoots) {
      const pr = rectOf(p.id);
      const cr = rectOf(c.id);
      if (!vertical) {
        const x = pr.x + pr.width / 2;
        if (sigma < 0) {
          branches.push({ fromId: p.id, toId: c.id, d: `M ${num(x)} ${num(pr.y)} L ${num(x)} ${num(cr.y + cr.height)}` });
        } else {
          branches.push({ fromId: p.id, toId: c.id, d: `M ${num(x)} ${num(pr.y + pr.height)} L ${num(x)} ${num(cr.y)}` });
        }
      } else {
        const y = pr.y + pr.height / 2;
        if (sigma < 0) {
          branches.push({ fromId: p.id, toId: c.id, d: `M ${num(pr.x)} ${num(y)} L ${num(cr.x + cr.width)} ${num(y)}` });
        } else {
          branches.push({ fromId: p.id, toId: c.id, d: `M ${num(pr.x + pr.width)} ${num(y)} L ${num(cr.x)} ${num(y)}` });
        }
      }
      // 栈内逐层
      const walkMini = (b: NodeBox): void => {
        for (const cc of b.children) {
          const br = rectOf(b.id);
          const ccr = rectOf(cc.id);
          if (!vertical) {
            // 栈轴 = y：向上侧取父上缘→子下缘；向下侧取父下缘→子上缘
            branches.push(sigma < 0
              ? { fromId: b.id, toId: cc.id, d: vCurve(br.x + br.width / 2, br.y, ccr.x + ccr.width / 2, ccr.y + ccr.height) }
              : { fromId: b.id, toId: cc.id, d: vCurve(br.x + br.width / 2, br.y + br.height, ccr.x + ccr.width / 2, ccr.y) });
          } else {
            // 栈轴 = x：向左侧取父左缘→子右缘；向右侧取父右缘→子左缘
            branches.push(sigma < 0
              ? { fromId: b.id, toId: cc.id, d: hCurve(br.x, br.y + br.height / 2, ccr.x + ccr.width, ccr.y + ccr.height / 2) }
              : { fromId: b.id, toId: cc.id, d: hCurve(br.x + br.width, br.y + br.height / 2, ccr.x, ccr.y + ccr.height / 2) });
          }
          walkMini(cc);
        }
      };
      walkMini(c);
    }
    return branches;
  });
}

/** 时间轴（横向）：根在左，主轴水平向右 */
export function layoutTimelineH(root: DocNode, opts: LayoutOptions): LayoutResult {
  return layoutTimeline(root, opts, false);
}

/** 时间轴（纵向）：根在顶，主轴垂直向下 */
export function layoutTimelineV(root: DocNode, opts: LayoutOptions): LayoutResult {
  return layoutTimeline(root, opts, true);
}
