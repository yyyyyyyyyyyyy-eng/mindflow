// ============================================================================
// 序列化公共助手：元数据值转义 / 列表拆分 / NodeStyle 规范化 JSON。
// markdown 与 opml 共用（opml 的 _icons/_labels 同样用 | 连接）。
//
// 转义方案（封闭四字符集，单向无歧义）：
//   '\' → '\\'   LF → '\n'   '|' → '\|'   '>' → '\g'
// 转义后 '\' 只可能出现在这四字符前，因此还原可用单遍正则完成；
// '>' 转义用于保护 HTML 注释不被提前终止（'-->' → '--\g'）。
// ============================================================================

import type { NodeStyle } from '../types';

const UNESCAPE_MAP: Record<string, string> = { '\\': '\\', n: '\n', '|': '|', g: '>' };

/** 元数据值转义 */
export function escapeMetaValue(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\|/g, '\\|').replace(/>/g, '\\g');
}

/** 元数据值还原（仅识别四字符转义，其余原样） */
export function unescapeMetaValue(s: string): string {
  return s.replace(/\\([\\n|g])/g, (whole, c: string) => UNESCAPE_MAP[c] ?? whole);
}

/** 按未转义的 '|' 拆分列表（转义过的 '\|' 不拆） */
export function splitUnescaped(s: string): string[] {
  return s.split(/(?<!\\)\|/g);
}

/** NodeStyle → 固定键序 JSON（fill→textColor→border{color,width}→shape→fontWeight→fontSize） */
export function canonicalStyleJson(style: NodeStyle): string {
  const top: string[] = [];
  if (style.fill !== undefined) top.push(`"fill":${JSON.stringify(style.fill)}`);
  if (style.textColor !== undefined) top.push(`"textColor":${JSON.stringify(style.textColor)}`);
  if (style.border !== undefined) {
    const inner: string[] = [];
    if (style.border.color !== undefined) inner.push(`"color":${JSON.stringify(style.border.color)}`);
    if (style.border.width !== undefined) inner.push(`"width":${JSON.stringify(style.border.width)}`);
    top.push(`"border":{${inner.join(',')}}`);
  }
  if (style.shape !== undefined) top.push(`"shape":${JSON.stringify(style.shape)}`);
  if (style.fontWeight !== undefined) top.push(`"fontWeight":${JSON.stringify(style.fontWeight)}`);
  if (style.fontSize !== undefined) top.push(`"fontSize":${JSON.stringify(style.fontSize)}`);
  return `{${top.join(',')}}`;
}

const SHAPES = new Set(['rounded-rect', 'rect', 'ellipse', 'underline', 'diamond']);

/** 防御式解析 style JSON：仅保留类型合法的已知字段，解析失败返回 undefined */
export function parseStyleJson(raw: string): NodeStyle | undefined {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return undefined;
  const src = obj as Record<string, unknown>;
  const out: NodeStyle = {};
  if (typeof src.fill === 'string') out.fill = src.fill;
  if (typeof src.textColor === 'string') out.textColor = src.textColor;
  if (typeof src.border === 'object' && src.border !== null && !Array.isArray(src.border)) {
    const b = src.border as Record<string, unknown>;
    const border: { color?: string; width?: number } = {};
    if (typeof b.color === 'string') border.color = b.color;
    if (typeof b.width === 'number' && Number.isFinite(b.width)) border.width = b.width;
    if (border.color !== undefined || border.width !== undefined) out.border = border;
  }
  if (typeof src.shape === 'string' && SHAPES.has(src.shape)) {
    out.shape = src.shape as NodeStyle['shape'];
  }
  if (src.fontWeight === 'normal' || src.fontWeight === 'bold') out.fontWeight = src.fontWeight;
  if (typeof src.fontSize === 'number' && Number.isFinite(src.fontSize)) out.fontSize = src.fontSize;
  return Object.keys(out).length > 0 ? out : undefined;
}
