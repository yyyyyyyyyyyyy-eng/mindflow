// ============================================================================
// Markdown 双向序列化（契约 §4）：
//   export function docToMarkdown(doc: MindDoc): string;
//   export function markdownToDoc(md: string, idGen?: () => NodeId): MindDoc;
//
// 结构约定：H1 = 根；H2..H6 对应深度 1..5；深度 > 6 转无序列表续接
//（缩进 2 × (depth - 6) 空格）。
//
// 元数据约定（契约 §4）：节点行尾追加 HTML 注释
//   <!-- icons:priority-1|star labels:A|B note:备注文本 -->
// 缺省字段省略；为实现「往返后树全等（含 icons/labels/note/collapsed/style）」，
// 在契约示例三字段之外扩展 collapsed:1 与 style:{...}（见交付摘要疑问清单）。
//
// 转义与续行规则（往返无损的关键，均为本实现约定）：
// - 元数据值用四字符封闭转义（见 io/escape.ts），note 可含换行/竖线/'-->'；
// - 多行文本：首行随结构行，其余行为「续行」；续行行首为 '\' '#' '-' '*' 时
//   加一个 '\' 前缀，空行记为 <!--blank-->；
// - 导入仅在「尾注释内容可解析为合法字段序列」时才剥离该注释，
//   用户文本自带的 <!-- y --> 不会被误删。
//
// 导入默认值（契约未指定，文档化）：structure='mindmap'、theme='classic'、
// title=root.text 镜像、createdAt/updatedAt=当前 ISO 时间；首个标题为根
//（层级按相对深度挂接、跳级时挂最近浅父），后续 H1 视为根的孩子；
// 纯列表/空文档生成默认根「中心主题」；\r\n 统一归一为 \n；Tab 记 2 空格。
// ============================================================================

import type { DocNode, MindDoc, NodeId, NodeStyle } from '../types';
import { defaultIdGen } from './id';
import {
  canonicalStyleJson, escapeMetaValue, parseStyleJson, splitUnescaped, unescapeMetaValue,
} from './escape';

// —— 导出 ——

/** 构造节点行尾的元数据注释（缺省字段省略；无任何字段返回空串） */
function metaComment(n: DocNode): string {
  const parts: string[] = [];
  if (n.icons && n.icons.length > 0) parts.push(`icons:${n.icons.map(escapeMetaValue).join('|')}`);
  if (n.labels && n.labels.length > 0) parts.push(`labels:${n.labels.map(escapeMetaValue).join('|')}`);
  if (n.note !== undefined && n.note !== '') parts.push(`note:${escapeMetaValue(n.note)}`);
  if (n.collapsed === true) parts.push('collapsed:1');
  if (n.style !== undefined) {
    const json = canonicalStyleJson(n.style);
    if (json !== '{}') parts.push(`style:${escapeMetaValue(json)}`);
  }
  if (parts.length === 0) return '';
  return ` <!-- ${parts.join(' ')} -->`;
}

/** 续行结构逃逸：空行 → <!--blank-->；行首为 \ # - * 时加 '\' 前缀 */
function escapeContinuation(line: string): string {
  if (line === '') return '<!--blank-->';
  if (/^[\\#*-]/.test(line)) return `\\${line}`;
  return line;
}

export function docToMarkdown(doc: MindDoc): string {
  const lines: string[] = [];
  const emit = (n: DocNode, depth: number): void => {
    const textLines = (n.text ?? '').split('\n');
    const first = textLines[0] ?? '';
    const meta = metaComment(n);
    if (depth === 0) lines.push(`# ${first}${meta}`);
    else if (depth <= 5) lines.push(`${'#'.repeat(depth + 1)} ${first}${meta}`);
    else lines.push(`${'  '.repeat(depth - 6)}- ${first}${meta}`);
    for (let i = 1; i < textLines.length; i++) {
      lines.push(escapeContinuation(textLines[i] ?? ''));
    }
    for (const c of n.children ?? []) emit(c, depth + 1);
  };
  emit(doc.root, 0);
  return `${lines.join('\n')}\n`;
}

// —— 导入 ——

/** 元数据字段集（固定扫描次序） */
const FIELD_ORDER = ['icons', 'labels', 'note', 'collapsed', 'style'] as const;
type FieldKey = (typeof FIELD_ORDER)[number];

interface MetaFields {
  icons?: string[];
  labels?: string[];
  note?: string;
  collapsed?: boolean;
  style?: NodeStyle;
}

/** 解析注释内容为字段表：必须以合法字段开头、字段按固定次序出现，否则返回 null */
function parseMetaFields(meta: string): MetaFields | null {
  if (!/^(icons|labels|note|collapsed|style):/.test(meta)) return null;
  // spans[i]: keyStart = 该字段匹配起点（上一字段值的终点）；valueStart = 'key:' 之后
  const spans: Array<{ key: FieldKey; keyStart: number; valueStart: number }> = [];
  let searchFrom = 0;
  for (const key of FIELD_ORDER) {
    const m = new RegExp(`(?:^|\\s)${key}:`).exec(meta.slice(searchFrom));
    if (!m) continue;
    const keyStart = searchFrom + m.index;
    spans.push({ key, keyStart, valueStart: keyStart + m[0].length });
    searchFrom = keyStart + m[0].length;
  }
  const out: MetaFields = {};
  spans.forEach((s, i) => {
    // 值 = 本字段 valueStart 到下一字段 keyStart（分隔空格归下一字段，值不裁剪）
    const end = i + 1 < spans.length ? spans[i + 1]!.keyStart : meta.length;
    const raw = meta.slice(s.valueStart, end);
    if (s.key === 'icons' || s.key === 'labels') {
      if (raw === '') return;
      out[s.key] = splitUnescaped(raw).map(unescapeMetaValue);
    } else if (s.key === 'note') {
      out.note = unescapeMetaValue(raw);
    } else if (s.key === 'collapsed') {
      out.collapsed = raw === '1';
    } else if (s.key === 'style') {
      const parsed = parseStyleJson(unescapeMetaValue(raw));
      if (parsed !== undefined) out.style = parsed;
    }
  });
  return out;
}

/** 剥离行尾元数据注释：内容可解析为合法字段才剥，否则整行视为纯文本 */
function splitMeta(line: string): { text: string; fields: MetaFields | null } {
  const m = /\s?<!--\s*(.*?)\s*-->\s*$/.exec(line);
  if (m) {
    const fields = parseMetaFields(m[1] ?? '');
    if (fields !== null) {
      let text = line.slice(0, m.index);
      if (text.endsWith(' ')) text = text.slice(0, -1); // 导出分隔符恰一个空格
      return { text, fields };
    }
  }
  return { text: line, fields: null };
}

/** 把解析出的元数据挂到节点 */
function applyMeta(n: DocNode, fields: MetaFields | null): void {
  if (!fields) return;
  if (fields.icons !== undefined) n.icons = fields.icons;
  if (fields.labels !== undefined) n.labels = fields.labels;
  if (fields.note !== undefined) n.note = fields.note;
  if (fields.collapsed !== undefined) n.collapsed = fields.collapsed;
  if (fields.style !== undefined) n.style = fields.style;
}

export function markdownToDoc(md: string, idGen: () => NodeId = defaultIdGen): MindDoc {
  const lines = md
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\t/g, '  '));

  let root: DocNode | null = null;
  let stack: Array<{ node: DocNode; level: number; depth: number }> = [];
  let bullets: Array<{ node: DocNode; indent: number; parent: DocNode; depth: number }> = [];
  let cur: DocNode | null = null; // 当前接收续行的节点

  const mk = (text: string): DocNode => ({ id: idGen(), text, children: [] });
  const ensureRoot = (): void => {
    if (root) return;
    root = mk('中心主题'); // 纯列表/空文档的默认根（契约 §2 空文档规范）
    stack = [{ node: root, level: 1, depth: 0 }];
  };

  const attachHeading = (text: string, level: number): void => {
    if (!root) {
      root = mk(text);
      stack = [{ node: root, level, depth: 0 }];
      cur = root;
      return;
    }
    // 弹到首个层级更浅的标题下；深度恒为父深度 + 1（跳级时挂最近浅父）
    while (stack.length > 1 && stack[stack.length - 1]!.level >= level) stack.pop();
    const parent = stack[stack.length - 1]!;
    const child = mk(text);
    parent.node.children.push(child);
    stack.push({ node: child, level, depth: parent.depth + 1 });
    cur = child;
    bullets = [];
  };

  const attachBullet = (text: string, indent: number): DocNode => {
    ensureRoot();
    while (bullets.length > 0 && bullets[bullets.length - 1]!.indent > indent) bullets.pop();
    let parent: DocNode;
    let depth: number;
    if (bullets.length === 0) {
      const heading = stack[stack.length - 1]!;
      parent = heading.node;
      depth = heading.depth + 1;
    } else {
      const top = bullets[bullets.length - 1]!;
      if (top.indent === indent) {
        parent = top.parent;
        depth = top.depth;
      } else {
        parent = top.node;
        depth = top.depth + 1;
      }
    }
    const child = mk(text);
    parent.children.push(child);
    bullets.push({ node: child, indent, parent, depth });
    return child;
  };

  for (const line of lines) {
    // 空行：结束续行收集
    if (line === '') {
      cur = null;
      continue;
    }
    const heading = /^(#{1,6}) (.*)$/.exec(line);
    if (heading) {
      const level = (heading[1] ?? '').length;
      const { text, fields } = splitMeta(heading[2] ?? '');
      attachHeading(text, level);
      applyMeta(cur!, fields);
      continue;
    }
    const bullet = /^(\s*)([-*]) (.*)$/.exec(line);
    if (bullet) {
      const indent = (bullet[1] ?? '').length;
      const { text, fields } = splitMeta(bullet[3] ?? '');
      cur = attachBullet(text, indent);
      applyMeta(cur, fields);
      continue;
    }
    // 续行：追加到当前节点文本（首个结构行之前的游离行忽略）
    if (cur) {
      let piece: string;
      if (line === '<!--blank-->') piece = '';
      else if (line.startsWith('\\')) piece = line.slice(1);
      else piece = line;
      cur.text = `${cur.text}\n${piece}`;
    }
  }

  ensureRoot();
  // root 由 ensureRoot/attachHeading 在闭包内赋值，TS 无法跨闭包收窄，此处必非空
  const rootNode = root!;
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    id: idGen(),
    title: rootNode.text,
    structure: 'mindmap',
    theme: 'classic',
    root: rootNode,
    createdAt: now,
    updatedAt: now,
  };
}
