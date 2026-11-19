// ============================================================================
// OPML 双向序列化（契约 §4）：
//   export function docToOpml(doc: MindDoc): string;
//   export function opmlToDoc(opmlXml: string, idGen?: () => NodeId): MindDoc;
//
// 导出：OPML 2.0，head 含 title / dateCreated / dateModified；body 为根的
// outline 递归。除标准 text 属性外，用 `_` 前缀自定义属性承载其余字段：
//   _note（备注）、_icons / _labels（`|` 连接，单项用封闭转义防竖线歧义）、
//   _collapsed="true"、_style（规范化 JSON，仅 XML 属性转义）。
//
// 导入（防御式）：根必须是 <opml> 且含 <body>，否则抛错；多个顶层 outline
// 时第一个为根、其余并入根的孩子（文档化约定）；空 body 生成默认根
//「中心主题」；text 缺省回退 title 属性。
// OPML 无法承载 structure/theme —— 导入默认 structure='mindmap'、
// theme='classic'（见交付摘要疑问清单）。
// ============================================================================

import type { DocNode, MindDoc, NodeId } from '../types';
import { defaultIdGen } from './id';
import {
  canonicalStyleJson, escapeMetaValue, parseStyleJson, splitUnescaped, unescapeMetaValue,
} from './escape';
import { escapeXmlAttr, escapeXmlText, parseXml, type XmlElement } from './xml';

// —— 导出 ——

export function docToOpml(doc: MindDoc): string {
  const outline = (n: DocNode, indent: string): string => {
    const attrs: string[] = [`text="${escapeXmlAttr(n.text ?? '')}"`];
    if (n.note !== undefined && n.note !== '') attrs.push(`_note="${escapeXmlAttr(n.note)}"`);
    if (n.icons && n.icons.length > 0) {
      attrs.push(`_icons="${escapeXmlAttr(n.icons.map(escapeMetaValue).join('|'))}"`);
    }
    if (n.labels && n.labels.length > 0) {
      attrs.push(`_labels="${escapeXmlAttr(n.labels.map(escapeMetaValue).join('|'))}"`);
    }
    if (n.collapsed === true) attrs.push('_collapsed="true"');
    if (n.style !== undefined) {
      const json = canonicalStyleJson(n.style);
      if (json !== '{}') attrs.push(`_style="${escapeXmlAttr(json)}"`);
    }
    const children = (n.children ?? []).map((c) => outline(c, `${indent}  `)).join('\n');
    if (children === '') return `${indent}<outline ${attrs.join(' ')}/>`;
    return `${indent}<outline ${attrs.join(' ')}>\n${children}\n${indent}</outline>`;
  };
  const head = [
    '  <head>',
    `    <title>${escapeXmlText(doc.title)}</title>`,
    `    <dateCreated>${escapeXmlText(doc.createdAt)}</dateCreated>`,
    `    <dateModified>${escapeXmlText(doc.updatedAt)}</dateModified>`,
    '  </head>',
  ].join('\n');
  const body = outline(doc.root, '    ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n${head}\n  <body>\n${body}\n  </body>\n</opml>\n`;
}

// —— 导入 ——

/** outline 元素 → DocNode */
function outlineToNode(el: XmlElement, idGen: () => NodeId): DocNode {
  const node: DocNode = {
    id: idGen(),
    text: el.attrs.text ?? el.attrs.title ?? '',
    children: [],
  };
  const note = el.attrs._note;
  if (note !== undefined) node.note = note;
  const icons = el.attrs._icons;
  if (icons !== undefined && icons !== '') node.icons = splitUnescaped(icons).map(unescapeMetaValue);
  const labels = el.attrs._labels;
  if (labels !== undefined && labels !== '') node.labels = splitUnescaped(labels).map(unescapeMetaValue);
  if (el.attrs._collapsed === 'true') node.collapsed = true;
  const styleRaw = el.attrs._style;
  if (styleRaw !== undefined) {
    const parsed = parseStyleJson(styleRaw);
    if (parsed !== undefined) node.style = parsed;
  }
  node.children = el.children
    .filter((c) => c.name === 'outline')
    .map((c) => outlineToNode(c, idGen));
  return node;
}

export function opmlToDoc(opmlXml: string, idGen: () => NodeId = defaultIdGen): MindDoc {
  const root = parseXml(opmlXml);
  if (root.name !== 'opml') throw new Error('opmlToDoc: 根元素不是 <opml>');
  const body = root.children.find((c) => c.name === 'body');
  if (!body) throw new Error('opmlToDoc: 缺少 <body> 元素');
  const outlines = body.children.filter((c) => c.name === 'outline');

  let rootNode: DocNode;
  if (outlines.length === 0) {
    rootNode = { id: idGen(), text: '中心主题', children: [] };
  } else {
    rootNode = outlineToNode(outlines[0]!, idGen);
    // 多个顶层 outline：第一个为根，其余并入根的孩子（文档化约定）
    for (const extra of outlines.slice(1)) rootNode.children.push(outlineToNode(extra, idGen));
  }
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
