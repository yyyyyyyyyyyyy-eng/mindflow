// ============================================================================
// 测试公共助手：确定性假 measureText、文档构造器、快照序列化、结构断言。
// 假 measure 规格按交付要求：CJK（非 ASCII）宽 1em、ASCII 0.62em、
// 行高系数 1.4、粗体 ×1.05 —— 全部来自 opts，同输入同输出。
// ============================================================================

import type { BranchPath, DocNode, LayoutOptions, LayoutResult, NodeId, Rect, TextSize } from '../src/types';

/** 契约默认布局参数（nodePadding 12 / levelGap 60 / siblingGap 16 / fontSize 14 / boldRatio 1.05 / lineHeight 1.4） */
export function makeOpts(overrides?: Partial<LayoutOptions>): LayoutOptions {
  const base: LayoutOptions = {
    nodePadding: 12,
    levelGap: 60,
    siblingGap: 16,
    fontFace: 'sans-serif',
    fontSize: 14,
    boldRatio: 1.05,
    lineHeight: 1.4,
    measureText: makeMeasure(14, 1.05, 1.4),
  };
  return { ...base, ...overrides };
}

/** 确定性假 measureText：ASCII 0.62em、其余（CJK 等）1em；宽=最长行；高=行数 × fontSize × lineHeight；粗体 × boldRatio */
export function makeMeasure(
  fontSize: number,
  boldRatio: number,
  lineHeight: number,
): (text: string, bold: boolean) => TextSize {
  return (text: string, bold: boolean): TextSize => {
    const lines = text.split('\n');
    let width = 0;
    for (const line of lines) {
      let w = 0;
      for (const ch of line) {
        const code = ch.codePointAt(0) ?? 0;
        w += code < 0x80 ? 0.62 : 1;
      }
      if (w > width) width = w;
    }
    return {
      width: width * fontSize * (bold ? boldRatio : 1),
      height: lines.length * fontSize * lineHeight,
    };
  };
}

/** 节点速造器：node('r', '根', [children], { note, collapsed, style, icons, labels }) */
export function node(
  id: string,
  text: string,
  children: DocNode[] = [],
  extra: Partial<DocNode> = {},
): DocNode {
  return { id, text, children, ...extra };
}

/** 计数器 id 生成器（保证确定性，替代 nanoid） */
export function counterIdGen(prefix = 'n'): () => string {
  let i = 0;
  return () => `${prefix}${i++}`;
}

/** 快照序列化：Map → 有序数组，保证 JSON 稳定 */
export function snap(result: LayoutResult): {
  nodeRects: Array<[NodeId, Rect]>;
  branches: BranchPath[];
  bounds: { width: number; height: number };
} {
  return {
    nodeRects: [...result.nodeRects.entries()],
    branches: result.branches,
    bounds: result.bounds,
  };
}

/** 两两断言：所有可见节点矩形互不重叠（贴边允许） */
export function assertNoOverlap(rects: Map<NodeId, Rect>): void {
  const entries = [...rects.entries()];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]![1];
      const b = entries[j]![1];
      const overlapX = a.x < b.x + b.width && b.x < a.x + a.width;
      const overlapY = a.y < b.y + b.height && b.y < a.y + a.height;
      if (overlapX && overlapY) {
        throw new Error(`节点矩形重叠：${entries[i]![0]} 与 ${entries[j]![0]}`);
      }
    }
  }
}

/** 遍历「可见的父子对」（collapsed 子树不进入） */
export function eachVisiblePair(
  root: DocNode,
  fn: (parent: DocNode, child: DocNode) => void,
): void {
  for (const c of root.children ?? []) {
    fn(root, c);
    if (!c.collapsed) eachVisiblePair(c, fn);
  }
}

/** 取某节点矩形（不存在则抛错，方便测试定位） */
export function rectOf(result: LayoutResult, id: NodeId): Rect {
  const r = result.nodeRects.get(id);
  if (!r) throw new Error(`节点 ${id} 不在 nodeRects 中`);
  return r;
}
