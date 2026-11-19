// ============================================================================
// XMind 导入（契约 §4）：
//   export class NotSupportedXmindError extends Error {}
//   export function xmindToDoc(buf: ArrayBuffer, idGen?: () => NodeId): Promise<MindDoc>;
//
// .xmind = zip；新格式包内 content.json（sheet 数组，取 sheets[0]）。
// 防御式解析：全部按 unknown + 类型守卫读取，字段形态以真实文件为准，
// 映射不了的样式键直接忽略。旧 XML 格式（content.xml）抛
// NotSupportedXmindError。
//
// structureClass 映射：先精确查表，再前缀渐进兜底；无对应映射默认 'mindmap'
//（契约 §4）。logic.left 归入 logic-right（StructureType 枚举无左向）。
// children.detached（游离主题）不进入树（XMind 中其不挂在主树上）。
// ============================================================================

import { strFromU8, unzipSync } from 'fflate';
import type { DocNode, MindDoc, NodeId, NodeStyle, StructureType } from '../types';
import { defaultIdGen } from './id';

export class NotSupportedXmindError extends Error {}

// —— 防御式取值助手 ——

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : null;
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

// ——

const XMIND_STRUCTURE_MAP: Record<string, StructureType> = {
  'org.xmind.ui.logic.right': 'logic-right',
  'org.xmind.ui.logic.left': 'logic-right',      // 枚举无左向逻辑图，归入右向
  'org.xmind.ui.map.clockwise': 'mindmap',
  'org.xmind.ui.map.anticlockwise': 'mindmap',
  'org.xmind.ui.org-chart.down': 'org-chart',
  'org.xmind.ui.org-chart.up': 'org-chart',     // 枚举无向上组织图，归入向下
  'org.xmind.ui.tree.down': 'tree',
  'org.xmind.ui.fishbone.lane': 'fishbone',
  'org.xmind.ui.timeline.horizontal': 'timeline-h',
  'org.xmind.ui.timeline.vertical': 'timeline-v',
};

/** structureClass → StructureType：精确表 → 前缀渐进兜底 → 默认 mindmap */
function mapStructure(cls: string | undefined): StructureType {
  if (!cls) return 'mindmap';
  const exact = XMIND_STRUCTURE_MAP[cls];
  if (exact !== undefined) return exact;
  const c = cls.toLowerCase();
  if (c.includes('fishbone')) return 'fishbone';
  if (c.includes('timeline') && c.includes('vert')) return 'timeline-v';
  if (c.includes('timeline')) return 'timeline-h';
  if (c.includes('org-chart')) return 'org-chart';
  if (c.includes('tree') && c.includes('down')) return 'tree';
  if (c.includes('logic') && c.includes('left')) return 'logic-right';
  if (c.includes('logic')) return 'logic-right';
  if (c.includes('map')) return 'mindmap';
  return 'mindmap';
}

/** XMind topic.style.properties → NodeStyle（能映射则映射，映射不了忽略） */
function mapStyle(styleRec: Record<string, unknown> | null): NodeStyle | undefined {
  if (styleRec === null) return undefined;
  const p = asRecord(styleRec.properties) ?? {};
  const out: NodeStyle = {};
  const fill = asString(p['svg:fill']);
  if (fill !== undefined) out.fill = fill;
  const textColor = asString(p['fo:color']) ?? asString(p['color']);
  if (textColor !== undefined) out.textColor = textColor;
  if (asString(p['svg:font-weight']) === 'bold') out.fontWeight = 'bold';
  const fontSizeRaw = p['svg:font-size'] ?? p['font-size'];
  if (typeof fontSizeRaw === 'number' && Number.isFinite(fontSizeRaw)) out.fontSize = fontSizeRaw;
  else if (typeof fontSizeRaw === 'string') {
    const n = Number.parseFloat(fontSizeRaw);
    if (Number.isFinite(n) && n > 0) out.fontSize = n;
  }
  const borderColor = asString(p['border-line-color']);
  const borderWidthRaw = p['border-line-width'];
  const borderWidth = typeof borderWidthRaw === 'number'
    ? borderWidthRaw
    : typeof borderWidthRaw === 'string' ? Number.parseFloat(borderWidthRaw) : undefined;
  if (borderColor !== undefined || (borderWidth !== undefined && Number.isFinite(borderWidth))) {
    const border: { color?: string; width?: number } = {};
    if (borderColor !== undefined) border.color = borderColor;
    if (borderWidth !== undefined && Number.isFinite(borderWidth)) border.width = borderWidth;
    out.border = border;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** XMind topic（rootTopic / children.attached 元素）→ DocNode */
function topicToNode(t: unknown, idGen: () => NodeId): DocNode {
  const rec = asRecord(t) ?? {};
  const node: DocNode = { id: idGen(), text: asString(rec.title) ?? '', children: [] };
  // notes：多路径防御（新版 plain.content，个别版本 plain.text）
  const plain = asRecord(asRecord(rec.notes)?.['plain']);
  const note = asString(plain?.['content']) ?? asString(plain?.['text']);
  if (note !== undefined) node.note = note;
  // markers → icons（对象 markerId / marker-id，或纯字符串）
  const icons: string[] = [];
  for (const m of asArray(rec.markers)) {
    if (typeof m === 'string') {
      icons.push(m);
      continue;
    }
    const id = asString(asRecord(m)?.['markerId']) ?? asString(asRecord(m)?.['marker-id']);
    if (id !== undefined) icons.push(id);
  }
  if (icons.length > 0) node.icons = icons;
  // labels（字符串数组）
  const labels = asArray(rec.labels).filter((l): l is string => typeof l === 'string');
  if (labels.length > 0) node.labels = labels;
  // style
  const style = mapStyle(asRecord(rec.style));
  if (style !== undefined) node.style = style;
  // children：attached 进树；detached（游离主题）忽略
  const attached = asArray(asRecord(rec.children)?.['attached']);
  node.children = attached.map((c) => topicToNode(c, idGen));
  return node;
}

export async function xmindToDoc(
  buf: ArrayBuffer,
  idGen: () => NodeId = defaultIdGen,
): Promise<MindDoc> {
  const files = unzipSync(new Uint8Array(buf));
  // 定位 content.json：精确键 → 任意路径尾匹配
  const keys = Object.keys(files);
  let contentKey: string | undefined = keys.find((k) => k === 'content.json');
  if (contentKey === undefined) contentKey = keys.find((k) => k.endsWith('/content.json'));

  if (contentKey === undefined) {
    // 旧 XML 格式判定
    if (keys.some((k) => k === 'content.xml' || k.endsWith('/content.xml'))) {
      const err = new NotSupportedXmindError(
        '检测到旧版 XMind 文件（content.xml，XML 格式），当前仅支持新格式（content.json）',
      );
      err.name = 'NotSupportedXmindError';
      throw err;
    }
    throw new Error('xmindToDoc: .xmind 包内未找到 content.json');
  }

  const text = strFromU8(files[contentKey]!).replace(/^\uFEFF/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`xmindToDoc: content.json 解析失败（${(e as Error).message}）`);
  }
  const sheets = Array.isArray(parsed) ? parsed : [parsed]; // 对象形态包一层（防御）
  const sheet = asRecord(sheets[0]);
  if (sheet === null) throw new Error('xmindToDoc: content.json 不是有效的 sheet 结构');
  const rootTopic = asRecord(sheet.rootTopic);
  if (rootTopic === null) throw new Error('xmindToDoc: sheet 缺少 rootTopic');

  const rootNode = topicToNode(rootTopic, idGen);
  const structure = mapStructure(asString(sheet.structureClass) ?? asString(rootTopic.structureClass));
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    id: idGen(),
    title: rootNode.text,
    structure,
    theme: 'classic',
    root: rootNode,
    createdAt: now,
    updatedAt: now,
  };
}
