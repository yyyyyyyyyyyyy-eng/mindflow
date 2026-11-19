// ============================================================================
// 树形图 layout-tree：与 org-chart 完全相同的自上而下 tidy 矩形几何，
// 仅连线改为直角折线（父底边中点 → 下行 → 水平 → 下行接入子顶边中点）。
// 契约 §3：「tree：同 org-chart，但连线为直角折线」。
// ============================================================================

import type { BranchPath, DocNode, LayoutOptions, LayoutResult } from '../types';
import { buildResult, normalizeOptions, num, type NodeBox } from './common';
import { computeOrgGeometry } from './org-chart';

export function layoutTree(root: DocNode, opts: LayoutOptions): LayoutResult {
  const o = normalizeOptions(opts);
  const { box, rawRects } = computeOrgGeometry(root, o);
  return buildResult(rawRects, [], (rectOf) => {
    const branches: BranchPath[] = [];
    const walk = (b: NodeBox): void => {
      for (const c of b.children) {
        const p = rectOf(b.id);
        const r = rectOf(c.id);
        const x1 = p.x + p.width / 2;
        const y1 = p.y + p.height;
        const x2 = r.x + r.width / 2;
        const y2 = r.y;
        const my = (y1 + y2) / 2;
        // 直角折线：下行 → 横移 → 下行接入
        branches.push({
          fromId: b.id,
          toId: c.id,
          d: `M ${num(x1)} ${num(y1)} L ${num(x1)} ${num(my)} L ${num(x2)} ${num(my)} L ${num(x2)} ${num(y2)}`,
        });
        walk(c);
      }
    };
    walk(box);
    return branches;
  });
}
