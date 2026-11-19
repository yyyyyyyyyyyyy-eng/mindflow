// ============================================================================
// 布局公共设施：可见树收集、文本测量、变尺寸 Reingold–Tilford 副轴整理、
// 结果归一化（bounds 左上角平移到 (0,0)）与 SVG path 助手。
// 本文件不在契约固定清单内，属于 6 个布局引擎共享的内部实现，
// 集成时可与 6 个引擎文件一并拷入 packages/core/src/layout/。
// ============================================================================

import type {
  BranchPath, DocNode, LayoutOptions, LayoutResult, NodeId, Rect, TextSize,
} from '../types';

// —— 契约 §3 注释给出的缺省参数（fontFace 契约未指定缺省，取通用族名）——
export const DEFAULT_LAYOUT_OPTIONS = {
  nodePadding: 12,
  levelGap: 60,
  siblingGap: 16,
  fontFace: 'sans-serif',
  fontSize: 14,
  boldRatio: 1.05,
  lineHeight: 1.4,
} as const;

/** 归一化后的布局参数（与 LayoutOptions 同形，数值字段保证非空） */
export type NormOpts = LayoutOptions;

/** 归一化布局参数：缺省字段取契约默认值；measureText 缺失直接抛错（引擎零 DOM，不可缺省） */
export function normalizeOptions(opts: LayoutOptions): NormOpts {
  if (typeof opts.measureText !== 'function') {
    throw new Error('layout(): opts.measureText 未注入（引擎零 DOM 依赖，文本测量必须由调用方提供）');
  }
  return { ...DEFAULT_LAYOUT_OPTIONS, ...opts };
}

/** 数组取值助手：越界抛错（noUncheckedIndexedAccess 下显式兜底，防止 undefined 静默扩散） */
export function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`内部索引越界：index=${i}, length=${arr.length}`);
  return v;
}

/** 布局内部节点：已测量尺寸的可见树（collapsed 的后代在收集时整体剪除） */
export interface NodeBox {
  id: NodeId;
  node: DocNode;
  level: number;
  w: number;                 // 含内边距的完整框宽
  h: number;                 // 含内边距的完整框高
  children: NodeBox[];       // 仅可见孩子
}

/** 粗体判定：style.fontWeight 优先；缺省仅深度 0（根/中心主题）加粗 */
export function isBold(node: DocNode, level: number): boolean {
  const fw = node.style?.fontWeight;
  if (fw) return fw === 'bold';
  return level === 0;
}

/** 收集可见节点并测量尺寸：collapsed 节点本身可见、其后代整体剪除 */
export function collectVisible(root: DocNode, o: NormOpts): NodeBox {
  const build = (node: DocNode, level: number): NodeBox => {
    const size: TextSize = o.measureText(node.text ?? '', isBold(node, level));
    const box: NodeBox = {
      id: node.id,
      node,
      level,
      w: size.width + o.nodePadding * 2,
      h: size.height + o.nodePadding * 2,
      children: [],
    };
    if (node.collapsed) return box; // 折叠：孩子不进入布局
    box.children = (node.children ?? []).map((c) => build(c, level + 1));
    return box;
  };
  return build(root, 0);
}

// —— 变尺寸 tidy tree（Reingold–Tilford 轮廓合并的保守变体）——

/** 子树某一层级的包围区间：主轴 [left,right] 相对本子树根的主轴起点；副轴 [top,bottom] 相对本子树根的副轴中心 */
export interface LevelRange {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** arrangeTidy 的单棵子树结果 */
export interface TidyResult {
  levels: LevelRange[];    // levels[0] = 根自身；levels[k] = 深度 k 的合并区间
  childOffsets: number[];  // 各孩子副轴中心相对本根副轴中心的偏移
}

/**
 * 兄弟子树顺序堆叠（保守轮廓合并）。
 * - 同层节点以 siblingGap 隔开；
 * - 跨层级对（如宽叶子与旁支深层节点主轴区间重叠时）同样参与副轴避让，
 *   这是变宽/变高节点下经典「仅同层轮廓」合并会漏掉的碰撞情形；
 * - centers 相对首个子树的副轴中心为 0；contour 的主轴坐标已含 mainShift 偏移。
 */
export function stackSubtrees(
  items: ReadonlyArray<{ box: NodeBox; res: TidyResult }>,
  o: NormOpts,
  horizontal: boolean,
  mainShift: number,
): { centers: number[]; contour: LevelRange[] } {
  const centers: number[] = [];
  const contour: LevelRange[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = at(items, i);
    const selfCross = horizontal ? item.box.h : item.box.w;
    let center = 0;
    if (i > 0) {
      center = -Infinity;
      // 新子树的层级 j 需与已放置轮廓的任意层级 k 比对（主轴区间重叠才避让）
      for (let j = 0; j < item.res.levels.length; j++) {
        const l = at(item.res.levels, j);
        const lo = mainShift + l.left;
        const hi = mainShift + l.right;
        for (let k = 0; k < contour.length; k++) {
          const a = contour[k];
          if (!a) continue;
          if (a.right > lo && hi > a.left) {
            const need = a.bottom + o.siblingGap - l.top;
            if (need > center) center = need;
          }
        }
      }
      if (center === -Infinity) {
        // 防御兜底：理论上 j=0（兄弟自身框）必与前兄弟主轴重叠，此分支不应到达
        const prev = at(items, i - 1);
        const prevCross = horizontal ? prev.box.h : prev.box.w;
        center = at(centers, i - 1) + prevCross / 2 + selfCross / 2 + o.siblingGap;
      }
    }
    centers.push(center);
    // 合并该子树全部层级区间到累计轮廓
    for (let j = 0; j < item.res.levels.length; j++) {
      const l = at(item.res.levels, j);
      const range: LevelRange = {
        left: mainShift + l.left,
        right: mainShift + l.right,
        top: center + l.top,
        bottom: center + l.bottom,
      };
      const a = contour[j];
      if (!a) contour[j] = { ...range };
      else {
        a.left = Math.min(a.left, range.left);
        a.right = Math.max(a.right, range.right);
        a.top = Math.min(a.top, range.top);
        a.bottom = Math.max(a.bottom, range.bottom);
      }
    }
  }
  return { centers, contour };
}

/**
 * Reingold–Tilford 副轴整理（自底向上递归）。
 * horizontal=true 时主轴为 x（logic-right 类：孩子整体向右）；false 时主轴为 y（org-chart 类：向下）。
 * 根的副轴中心按经典规则取「首末孩子副轴中心的中点」。
 * 结果写入 out（含每个可见节点的 TidyResult，供二次遍历换算绝对坐标）。
 */
export function arrangeTidy(
  box: NodeBox,
  o: NormOpts,
  horizontal: boolean,
  out: Map<NodeId, TidyResult>,
): TidyResult {
  const main = horizontal ? box.w : box.h;
  const cross = horizontal ? box.h : box.w;
  if (box.children.length === 0) {
    const leaf: TidyResult = {
      levels: [{ left: 0, right: main, top: -cross / 2, bottom: cross / 2 }],
      childOffsets: [],
    };
    out.set(box.id, leaf);
    return leaf;
  }
  const mainShift = main + o.levelGap; // 孩子主轴起点相对本根主轴起点的偏移
  const items = box.children.map((c) => ({ box: c, res: arrangeTidy(c, o, horizontal, out) }));
  const { centers, contour } = stackSubtrees(items, o, horizontal, mainShift);

  const rootCenter = (at(centers, 0) + at(centers, centers.length - 1)) / 2;

  // 本子树层级区间：levels[0]=根自身；levels[k+1]=contour[k] 平移 -rootCenter（副轴）
  const levels: LevelRange[] = [{ left: 0, right: main, top: -cross / 2, bottom: cross / 2 }];
  for (let j = 0; j < contour.length; j++) {
    const a = contour[j];
    if (!a) continue; // 首子树层级连续填充，空洞理论不可达，防御保留
    levels.push({ left: a.left, right: a.right, top: a.top - rootCenter, bottom: a.bottom - rootCenter });
  }
  const res: TidyResult = { levels, childOffsets: centers.map((c) => c - rootCenter) };
  out.set(box.id, res);
  return res;
}

/** 子树的副轴总范围（相对其根的副轴中心） */
export function crossExtentOf(res: TidyResult): { top: number; bottom: number } {
  let top = Infinity;
  let bottom = -Infinity;
  for (const l of res.levels) {
    top = Math.min(top, l.top);
    bottom = Math.max(bottom, l.bottom);
  }
  if (!Number.isFinite(top)) return { top: 0, bottom: 0 }; // 空层级防御
  return { top, bottom };
}

// —— 坐标归一化与结果装配 ——

/**
 * 装配 LayoutResult：整体平移使包围盒左上角位于 (0,0)；
 * bounds 覆盖全部节点矩形与 extraPoints（鱼骨主脊末端等连线端点，raw 坐标）。
 * branches 由 emitBranches 生成：rectOf 取平移后的矩形，rects 为最终矩形表
 * （鱼骨等结构需在平移坐标系中重建主脊末端）。
 */
export function buildResult(
  rawRects: Map<NodeId, Rect>,
  extraPoints: ReadonlyArray<readonly [number, number]>,
  emitBranches: (rectOf: (id: NodeId) => Rect, rects: ReadonlyMap<NodeId, Rect>) => BranchPath[],
): LayoutResult {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rawRects.values()) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  for (const [x, y] of extraPoints) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; } // 空防御（root 恒在，理论不可达）
  const nodeRects = new Map<NodeId, Rect>();
  for (const [id, r] of rawRects) {
    nodeRects.set(id, { x: r.x - minX, y: r.y - minY, width: r.width, height: r.height });
  }
  const rectOf = (id: NodeId): Rect => {
    const r = nodeRects.get(id);
    if (!r) throw new Error(`buildResult: 节点 ${id} 不在可见矩形表中`);
    return r;
  };
  return {
    nodeRects,
    branches: emitBranches(rectOf, nodeRects),
    bounds: { width: maxX - minX, height: maxY - minY },
  };
}

// —— SVG path 数字与常用曲线 ——

/** path 数字格式化：保留 2 位小数去浮点尾噪，同输入同输出（确定性） */
export function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** 水平 S 形贝塞尔（主轴为 x：logic-right / mindmap 右侧） */
export function hCurve(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${num(x1)} ${num(y1)} C ${num(mx)} ${num(y1)}, ${num(mx)} ${num(y2)}, ${num(x2)} ${num(y2)}`;
}

/** 垂直 S 形贝塞尔（主轴为 y：org-chart 及时间轴小栈内部） */
export function vCurve(x1: number, y1: number, x2: number, y2: number): string {
  const my = (y1 + y2) / 2;
  return `M ${num(x1)} ${num(y1)} C ${num(x1)} ${num(my)}, ${num(x2)} ${num(my)}, ${num(x2)} ${num(y2)}`;
}
