// ============================================================================
// 布局统一入口（契约 §3）：
//   export function layout(root: DocNode, structure: StructureType, opts: LayoutOptions): LayoutResult
// 按 structure 分发到 7 个引擎；未知结构抛错（防御 JS 调用方）。
// 本文件同时作为包出口：re-export 全部引擎、契约类型与默认参数。
// ============================================================================

import type { DocNode, LayoutOptions, LayoutResult, StructureType } from '../types';
import { layoutLogicRight } from './logic-right';
import { layoutMindmap } from './mindmap';
import { layoutOrgChart } from './org-chart';
import { layoutFishbone } from './fishbone';
import { layoutTimelineH, layoutTimelineV } from './timeline';
import { layoutTree } from './tree';

// 统一入口（算法实验室 src/layout/index.ts）
export function layout(root: DocNode, structure: StructureType, opts: LayoutOptions): LayoutResult {
  switch (structure) {
    case 'logic-right': return layoutLogicRight(root, opts);
    case 'mindmap': return layoutMindmap(root, opts);
    case 'org-chart': return layoutOrgChart(root, opts);
    case 'fishbone': return layoutFishbone(root, opts);
    case 'timeline-h': return layoutTimelineH(root, opts);
    case 'timeline-v': return layoutTimelineV(root, opts);
    case 'tree': return layoutTree(root, opts);
    default:
      // 穷举防御：TS 侧不可达，JS 调用方传非法值时给出明确错误
      throw new Error(`layout(): 未知的结构类型 ${String(structure)}`);
  }
}

// —— 包出口：契约类型、默认参数与各引擎（供直接调用与集成）——
export * from '../types';
export { DEFAULT_LAYOUT_OPTIONS, normalizeOptions } from './common';
export { layoutLogicRight } from './logic-right';
export { layoutMindmap } from './mindmap';
export { layoutOrgChart, computeOrgGeometry } from './org-chart';
export { layoutFishbone } from './fishbone';
export { layoutTimelineH, layoutTimelineV } from './timeline';
export { layoutTree } from './tree';
