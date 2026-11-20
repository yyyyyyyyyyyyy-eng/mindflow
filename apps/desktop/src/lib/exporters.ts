// ============================================================================
// 导出器全家桶：.mflow / .md / .opml / PNG
// PNG 走布局引擎 → SVG（text/rect/path）→ canvas 2x → PNG blob，零依赖。
// ============================================================================

import {
  DEFAULT_LAYOUT_OPTIONS, docToMarkdown, docToOpml, getTheme,
  layout, normalizeOptions,
} from 'mindflow-core';
import type { DocNode, MindDoc, NodeId } from 'mindflow-core';
import {
  MIND_FONT_FAMILY, applyPosOffsets, colorByLevel, createBrowserMeasureText,
} from 'mindflow-ui';

/** 通用 blob 下载 */
function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// —— .mflow ——
export function exportMflow(doc: MindDoc): void {
  download(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), `MindFlow-${doc.title || '未命名'}.mflow`);
}

// —— Markdown ——
export function exportMarkdown(doc: MindDoc): void {
  download(new Blob([docToMarkdown(doc)], { type: 'text/markdown' }), `MindFlow-${doc.title || '未命名'}.md`);
}

// —— OPML ——
export function exportOpml(doc: MindDoc): void {
  download(new Blob([docToOpml(doc)], { type: 'text/x-opml' }), `MindFlow-${doc.title || '未命名'}.opml`);
}

// —— PNG ——
/** XML 转义（SVG text 内容安全） */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 构建层级表（id → level） */
function buildLevels(root: DocNode): Map<NodeId, number> {
  const map = new Map<NodeId, number>();
  const walk = (n: DocNode, level: number) => {
    map.set(n.id, level);
    for (const c of n.children) walk(c, level + 1);
  };
  walk(root, 0);
  return map;
}

/** 构建完整导出 SVG（含节点矩形 + 文字 + 连线 + 背景色） */
function buildExportSvg(doc: MindDoc): string {
  const theme = getTheme(doc.theme);
  const measure = createBrowserMeasureText(MIND_FONT_FAMILY);
  const res = layout(doc.root, doc.structure, normalizeOptions({
    ...DEFAULT_LAYOUT_OPTIONS,
    fontFace: MIND_FONT_FAMILY,
    measureText: measure,
  }));
  const geo = applyPosOffsets(doc, res);
  const levels = buildLevels(doc.root);

  const pad = 60;
  const w = geo.bounds.width + pad * 2;
  const h = geo.bounds.height + pad * 2;

  const parts: string[] = [];
  // SVG font-family 用单引号包字体名（双引号会破坏 XML 属性）
  const svgFont = MIND_FONT_FAMILY.replace(/"/g, "'");
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${-pad} ${-pad} ${w} ${h}" font-family="${svgFont}">`);
  parts.push(`<rect x="${-pad}" y="${-pad}" width="${w}" height="${h}" fill="${theme.background}"/>`);

  // 连线（先画，在节点下层）
  for (const b of geo.branches) {
    const targetLevel = levels.get(b.toId) ?? 1;
    const stroke = colorByLevel(theme.branchColorByLevel, targetLevel);
    parts.push(`<path d="${b.d}" fill="none" stroke="${stroke}" stroke-width="2"/>`);
  }

  // 节点矩形 + 文字
  for (const [id, r] of geo.nodeRects) {
    const level = levels.get(id) ?? 0;
    const isRoot = level === 0;
    const fill = isRoot ? theme.rootStyle.fill ?? '#4f7cf7' : colorByLevel(theme.nodeFillByLevel, level);
    const textColor = isRoot ? theme.rootStyle.textColor ?? '#fff' : theme.textColor;
    const bold = isRoot || (doc.root.style?.fontWeight === 'bold');

    // 节点文字（从 doc 中找 text）
    let text = '';
    const walk = (n: DocNode): boolean => {
      if (n.id === id) { text = n.text; return true; }
      return n.children.some(walk);
    };
    walk(doc.root);

    parts.push(`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="10" fill="${fill}"/>`);

    // 多行文字：tspan 垂直居中
    const lines = text.split('\n');
    const fontSize = 14;
    const lineHeight = fontSize * 1.4;
    const totalH = lines.length * lineHeight;
    const startY = r.y + r.height / 2 - totalH / 2 + fontSize * 0.85;
    for (let i = 0; i < lines.length; i++) {
      parts.push(`<text x="${r.x + r.width / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-size="${fontSize}" fill="${textColor}" ${bold ? 'font-weight="bold"' : ''}>${esc(lines[i] || ' ')}</text>`);
    }
  }

  parts.push('</svg>');
  return parts.join('\n');
}

/** SVG → PNG blob（2x 分辨率） */
async function svgToPngBlob(svg: string, scale: number): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG 加载失败（PNG 导出）'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2D 上下文不可用');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob 失败'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportPng(doc: MindDoc): Promise<void> {
  const svg = buildExportSvg(doc);
  const blob = await svgToPngBlob(svg, 2);                // 2x 分辨率
  download(blob, `MindFlow-${doc.title || '未命名'}.png`);
}
