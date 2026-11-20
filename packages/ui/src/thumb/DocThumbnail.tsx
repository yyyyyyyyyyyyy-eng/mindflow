// ============================================================================
// DocThumbnail：把 thumbnailModel 输出渲染成 SVG 缩略图（主界面最近文档卡片）。
// ============================================================================

import type { MindDoc } from 'mindflow-core';
import { getTheme } from 'mindflow-core';
import { thumbnailModel } from './DocThumbnailModel';

export interface DocThumbnailProps {
  doc: MindDoc;
  /** 画布最大宽（px） */
  width?: number;
  /** 画布最大高（px） */
  height?: number;
}

export function DocThumbnail({ doc, width = 224, height = 150 }: DocThumbnailProps) {
  const theme = getTheme(doc.theme);
  const model = thumbnailModel(doc, width - 12, height - 12, theme);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      aria-label={`导图「${doc.title}」缩略图`}
    >
      <rect x={0} y={0} width={width} height={height} fill={theme.background} rx={8} />
      <g transform={`translate(${(width - model.viewBox.w) / 2}, ${(height - model.viewBox.h) / 2})`}>
        {model.branches.map((b, i) => (
          <line
            key={`b${i}`}
            x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
            stroke={b.color} strokeWidth={1} opacity={0.55}
          />
        ))}
        {model.nodes.map((n) => (
          <rect
            key={n.id}
            x={n.x} y={n.y} width={n.w} height={n.h}
            fill={n.fill}
            rx={Math.min(3, n.h / 2)}
          />
        ))}
      </g>
    </svg>
  );
}
