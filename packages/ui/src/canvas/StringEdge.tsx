// ============================================================================
// StringEdge（type: 'branch'）：钉到钉的直线绳。
//
// 2026-11-21 重写：移除 Verlet 物理引擎，改为纯直线连接。
// - 几何源：data.anchorA/anchorB（父子几何自适应锚点）
// - 渲染：M x y L x y 直线 + appearance.rope.layers 多层描边
// - 拖动跟随：React Flow 逐帧更新 sourceX/Y → 直线实时重画，零延迟零闪烁
// - 主轴/主脊（data.axis）：同样直线，多层描边
// ============================================================================

import { BaseEdge } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { AppearanceConfig } from '../appearance';
import type { MindFlowEdge } from '../flowModel';

export interface StringEdgeProps extends EdgeProps<MindFlowEdge> {
  appearance?: AppearanceConfig;
}

/** 绳层 → SVG path style */
function layerStyle(
  layer: { stroke: string | ((c: string) => string); width: number; dash?: string; linecap?: string; opacity?: number },
  themeColor: string,
): React.SVGProps<SVGPathElement> {
  return {
    stroke: typeof layer.stroke === 'function' ? layer.stroke(themeColor) : layer.stroke,
    strokeWidth: layer.width,
    strokeDasharray: layer.dash,
    strokeLinecap: (layer.linecap ?? 'round') as 'round' | 'butt' | 'square',
    opacity: layer.opacity,
    fill: 'none',
    pointerEvents: 'none',
  };
}

export function StringEdge({ id, data, sourceX, sourceY, targetX, targetY, appearance }: StringEdgeProps) {
  const fallbackD = data?.d;
  const color = data?.color ?? '#4f7cf7';
  const rs = appearance?.rope;

  // 绳层（从 appearance.rope.layers 或默认值）
  const layers = rs?.layers ?? [
    { stroke: 'rgba(16,24,40,0.20)' as const, width: 3.5, linecap: 'round' as const },
    { stroke: (c: string) => c, width: 2, linecap: 'round' as const },
    { stroke: 'rgba(255,255,255,0.5)' as const, width: 0.9, dash: '2 3', linecap: 'round' as const },
  ];

  // 实时锚点：静态锚 + 手柄增量（拖动时逐帧跟随）
  const dAX = typeof sourceX === 'number' && typeof data?.pinA?.x === 'number' ? sourceX - data.pinA.x : 0;
  const dAY = typeof sourceY === 'number' && typeof data?.pinA?.y === 'number' ? sourceY - data.pinA.y : 0;
  const dBX = typeof targetX === 'number' && typeof data?.pinB?.x === 'number' ? targetX - data.pinB.x : 0;
  const dBY = typeof targetY === 'number' && typeof data?.pinB?.y === 'number' ? targetY - data.pinB.y : 0;
  const aX = data?.anchorA !== undefined ? data.anchorA.x + dAX : sourceX;
  const aY = data?.anchorA !== undefined ? data.anchorA.y + dAY : (typeof sourceY === 'number' ? sourceY - 3 : undefined);
  const bX = data?.anchorB !== undefined ? data.anchorB.x + dBX : targetX;
  const bY = data?.anchorB !== undefined ? data.anchorB.y + dBY : (typeof targetY === 'number' ? targetY - 3 : undefined);

  // 防御：钉点缺失 → 回退
  if (aX === undefined || aY === undefined || bX === undefined || bY === undefined) {
    return typeof fallbackD === 'string'
      ? <BaseEdge id={id} path={fallbackD} style={{ stroke: color, strokeWidth: 2, fill: 'none' }} />
      : null;
  }

  // 直线
  const d = `M ${aX} ${aY} L ${bX} ${bY}`;

  return (
    <g>
      {layers.map((l, i) => (
        <path key={i} d={d} stroke={layerStyle(l, color).stroke} strokeWidth={layerStyle(l, color).strokeWidth} strokeDasharray={layerStyle(l, color).strokeDasharray} strokeLinecap={layerStyle(l, color).strokeLinecap} opacity={layerStyle(l, color).opacity} fill="none" pointerEvents="none" />
      ))}
    </g>
  );
}
