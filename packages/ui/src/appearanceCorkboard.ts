// ============================================================================
// 木板 + 明信片风格外观预设。
// 背景 = 软木板（木纹 CSS 渐变）；卡片 = 牛皮纸明信片；绳 = 麻绳。
// 用法：<MindMapCanvas appearance={CORKBOARD_APPEARANCE} theme={theme} ... />
// ============================================================================

import type { AppearanceConfig } from './appearance';

export const CORKBOARD_APPEARANCE: AppearanceConfig = {
  card: {
    borderRadius: 6,
    // 明信片：暖色底 + 轻柔投影
    shadow: '0 4px 12px rgba(101,67,33,0.25), 0 2px 4px rgba(101,67,33,0.15)',
    border: '1px solid rgba(139,90,43,0.3)',
    pin: {
      size: 9,
      // 红头图钉（弱化：半透明、缩小）
      gradient: 'radial-gradient(circle at 35% 30%, rgba(255,158,128,0.5) 0%, rgba(229,57,53,0.4) 40%, rgba(183,28,28,0.3) 100%)',
      borderColor: 'rgba(139,0,0,0.3)',
      needle: 'linear-gradient(rgba(176,190,197,0.4), rgba(120,144,156,0.3))',
    },
    buttons: {
      size: 20,
      borderColor: '#a1887f',
      background: '#fff8e1',
      color: '#4e342e',
      fontSize: 14,
    },
    clip: {
      size: 20,
      borderColor: '#a1887f',
      background: '#fff8e1',
      color: '#4e342e',
      fontSize: 11,
    },
  },
  rope: {
    // 麻绳：粗底影 + 棕色绳身 + 浅色纤维纹
    layers: [
      { stroke: 'rgba(62,39,35,0.35)', width: 4.5, linecap: 'round' },
      { stroke: '#8d6e63', width: 3, linecap: 'round' },
      { stroke: 'rgba(255,243,224,0.6)', width: 1.2, dash: '3 4', linecap: 'round' },
    ],
    hitWidth: 14,
    // 主轴/脊：粗麻绳
    axisLayers: [
      { stroke: 'rgba(62,39,35,0.4)', width: 5, linecap: 'round' },
      { stroke: '#795548', width: 3.5, linecap: 'round' },
      { stroke: 'rgba(255,243,224,0.5)', width: 1.2, dash: '4 5', linecap: 'round' },
    ],
  },
  background: {
    // 软木板底色
    pattern: 'none',  // 不用 RF 的 dots/cross，画布容器放木纹 CSS
    color: '#c8a882',
    gap: 30,
  },
};

// —— 搭配的明信片主题（覆盖契约 §5 的颜色，与木质背景和谐） ——
// 用法：onDocChange(d => { d.theme = 'corkboard' }) 或在 ThemeGallery 里加进去

export const CORKBOARD_NODE_COLORS = {
  // 逐级：牛皮纸 → 浅棕 → 深棕 → 深咖啡
  nodeFillByLevel: ['#f5e6c8', '#e8cfa8', '#d4b896', '#b89968'],
  branchColorByLevel: ['#8d6e63', '#8d6e63', '#795548', '#6d4c41'],
  textColor: '#3e2723',
  rootStyle: {
    fill: '#d7ccc8',
    textColor: '#3e2723',
    shape: 'rounded-rect' as const,
    fontWeight: 'bold' as const,
  },
  background: '#c8a882', // 画布容器背景（配合 pattern='none'）
};
