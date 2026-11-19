// ============================================================================
// 自定义边组件（type: 'branch'）：直接渲染布局产出的贝塞尔 path（data.d），
// 不使用 React Flow 的边几何计算——连线颜色按子节点层级由 flowModel 决定。
// ============================================================================

import { BaseEdge } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { MindFlowEdge } from '../flowModel';

export function BranchEdge({ id, data }: EdgeProps<MindFlowEdge>) {
  const d = data?.d;
  if (typeof d !== 'string') return null;                 // 防御：布局缺失时不渲染
  return (
    <BaseEdge
      id={id}
      path={d}
      style={{ stroke: data?.color ?? '#4f7cf7', strokeWidth: 2, fill: 'none' }}
    />
  );
}
