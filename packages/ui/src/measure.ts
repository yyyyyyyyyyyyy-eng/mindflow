// ============================================================================
// 浏览器文本测量（契约 §3 measureText 注入实现）：
// 用离屏 canvas measureText 实测；多行取最长行宽，高度 = 行数 × 行高。
// 警告：字体栈必须与节点 DOM 的 CSS font 完全一致，否则布局与渲染出现尺寸偏差。
// 非 DOM 环境（SSR）退化为确定性估算。
// ============================================================================

import type { TextSize } from 'mindflow-core';

/** 节点与测量共用的字体栈（MindNode 的 CSS 与 canvas.font 均使用此值） */
export const MIND_FONT_FAMILY =
  'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

/** 无 DOM 时的估算：CJK 记 1em，其余记 0.62em（与测试假实现口径一致） */
function estimate(text: string, fontSize: number, bold: boolean, lineHeight: number): TextSize {
  const ratio = bold ? 1.05 : 1;
  const lines = text.split('\n');
  let width = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of line) w += /[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/.test(ch) ? 1 : 0.62;
    width = Math.max(width, w * fontSize * ratio);
  }
  return { width, height: lines.length * fontSize * lineHeight };
}

/**
 * 创建浏览器测量函数（每字号一次性建 canvas，闭包复用 context）。
 * @param fontFace 字体栈（与节点 CSS 一致）
 */
export function createBrowserMeasureText(
  fontFace: string = MIND_FONT_FAMILY,
): (text: string, bold: boolean) => TextSize {
  const fontSize = 14;
  const lineHeight = 1.4;
  let ctx: CanvasRenderingContext2D | null = null;

  return (text: string, bold: boolean): TextSize => {
    if (typeof document === 'undefined') {
      return estimate(text, fontSize, bold, lineHeight);    // SSR/测试兜底
    }
    if (ctx === null) {
      const el = document.createElement('canvas');
      ctx = el.getContext('2d');
      if (ctx === null) return estimate(text, fontSize, bold, lineHeight);
    }
    ctx.font = `${bold ? '700 ' : ''}${fontSize}px ${fontFace}`;
    const lines = text.split('\n');
    let width = 0;
    for (const line of lines) {
      const m = ctx.measureText(line.length > 0 ? line : ' ');
      width = Math.max(width, m.width);
    }
    return { width, height: lines.length * fontSize * lineHeight };
  };
}
