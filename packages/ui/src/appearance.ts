// ============================================================================
// AppearanceConfig：卡片/绳子/背景 全外观参数化接口。
// 传入 MindMapCanvas 的 appearance prop 即可整体换肤，不传用 DEFAULT_APPEARANCE。
// ============================================================================

// —— 卡片 ——
export interface PinStyle {
  /** 钉球直径 px */
  size: number;
  /** 钉球 CSS background（radial-gradient 等） */
  gradient: string;
  /** 钉球描边色 */
  borderColor: string;
  /** 针杆 CSS background */
  needle: string;
}

export interface CardButtonStyle {
  /** 折叠/加号/回形针圆钮直径 px */
  size: number;
  borderColor: string;
  background: string;
  color: string;
  fontSize: number;
}

export interface CardStyle {
  /** 卡片默认圆角 */
  borderRadius: number;
  /** 卡片投影 box-shadow */
  shadow: string;
  /** 卡片边框（选中时自动替换为蓝色 2px） */
  border: string;
  /** 自定义卡片背景图（data URI；设置后覆盖主题填充色） */
  backgroundImage?: string;
  /** 钉子 */
  pin: PinStyle;
  /** 左右圆钮 */
  buttons: CardButtonStyle;
  /** 回形针按钮 */
  clip: CardButtonStyle;
}

// —— 绳子 ——
export interface RopeLayer {
  /** 描边色：色值字符串或 (themeColor) => 色值函数（themeColor = 该层主题色） */
  stroke: string | ((themeColor: string) => string);
  /** 描边宽度 px */
  width: number;
  /** 虚线 "2 3" 等（可选） */
  dash?: string;
  /** 不透明度（可选） */
  opacity?: number;
  /** 线端形状 */
  linecap?: 'round' | 'butt' | 'square';
}

export interface RopeStyle {
  /** 绳的描边层（数组序=绘制序，底层在前） */
  layers: RopeLayer[];
  /** 命中检测层宽度 px */
  hitWidth: number;
  /** 主轴/主脊层（可选，缺省用 layers） */
  axisLayers?: RopeLayer[];
}

// —— 背景 ——
export interface BackgroundStyle {
  /** 网格图案 */
  pattern: 'dots' | 'cross' | 'none';
  /** 图案色 */
  color: string;
  /** 间距 px */
  gap: number;
  /** 点/线大小 px */
  size?: number;
  /** 自定义画布背景图（data URI；设置后覆盖 pattern） */
  image?: string;
}

// —— 整体 ——
export interface AppearanceConfig {
  card: CardStyle;
  rope: RopeStyle;
  background: BackgroundStyle;
}

// ============================================================================
// 默认外观（即当前视觉，不传 appearance 时完全一致）
// ============================================================================
export const DEFAULT_APPEARANCE: AppearanceConfig = {
  card: {
    borderRadius: 10,
    shadow: '0 3px 8px rgba(16,24,40,0.16), 0 1px 2px rgba(16,24,40,0.10)',
    border: '1px solid rgba(16,24,40,0.08)',
    pin: {
      size: 8,
      gradient: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.6) 0%, rgba(200,205,210,0.4) 50%, rgba(140,148,160,0.3) 100%)',
      borderColor: 'rgba(140,148,160,0.3)',
      needle: 'linear-gradient(rgba(160,168,180,0.4), rgba(120,128,140,0.3))',
    },
    buttons: {
      size: 18,
      borderColor: '#d0d5dd',
      background: '#fff',
      color: '#475467',
      fontSize: 13,
    },
    clip: {
      size: 18,
      borderColor: '#d0d5dd',
      background: '#fff',
      color: '#475467',
      fontSize: 10,
    },
  },
  rope: {
    layers: [
      { stroke: 'rgba(16,24,40,0.20)', width: 3.5, linecap: 'round' },
      { stroke: (c) => c, width: 2, linecap: 'round' },
      { stroke: 'rgba(255,255,255,0.5)', width: 0.9, dash: '2 3', linecap: 'round' },
    ],
    hitWidth: 12,
  },
  background: {
    pattern: 'dots',
    color: '#e4e7ec',
    gap: 24,
  },
};

/** 合并（浅覆盖各子对象字段，缺省取默认） */
export function mergeAppearance(
  base: AppearanceConfig,
  overrides?: Partial<AppearanceConfig>,
): AppearanceConfig {
  if (!overrides) return base;
  return {
    card: { ...base.card, ...overrides.card, pin: { ...base.card.pin, ...overrides.card?.pin }, buttons: { ...base.card.buttons, ...overrides.card?.buttons }, clip: { ...base.card.clip, ...overrides.card?.clip } },
    rope: { ...base.rope, ...overrides.rope },
    background: { ...base.background, ...overrides.background },
  };
}
