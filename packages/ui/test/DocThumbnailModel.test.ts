// ============================================================================
// thumbnailModel 单测（纯函数，node 环境）：等比缩放、主题配色、折叠、pos 偏移。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { getTheme } from 'mindflow-core';
import type { MindDoc } from 'mindflow-core';
import { thumbnailModel } from '../src/thumb/DocThumbnailModel';

function doc(): MindDoc {
  return {
    formatVersion: 1,
    id: 'd1',
    title: '中心主题',
    structure: 'mindmap',
    theme: 'classic',
    root: {
      id: 'r',
      text: '中心主题',
      children: [
        { id: 'a', text: '分支甲', children: [{ id: 'a1', text: '要点', children: [] }] },
        { id: 'b', text: '分支乙', children: [] },
      ],
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('thumbnailModel', () => {
  const theme = getTheme('classic');

  it('全部可见节点出现在缩略图中，含根', () => {
    const m = thumbnailModel(doc(), 224, 150, theme);
    expect(m.nodes.length).toBe(4);
    expect(m.nodes.find((n) => n.id === 'r')).toBeDefined();
    expect(m.branches.length).toBe(3);
  });

  it('等比缩放进目标框：viewBox 不超过 maxW×maxH', () => {
    const m = thumbnailModel(doc(), 224, 150, theme);
    expect(m.viewBox.w).toBeLessThanOrEqual(224);
    expect(m.viewBox.h).toBeLessThanOrEqual(150);
    expect(m.viewBox.w).toBeGreaterThan(0);
  });

  it('主题配色：根用 rootStyle.fill，子级用逐级色', () => {
    const m = thumbnailModel(doc(), 224, 150, theme);
    expect(m.nodes.find((n) => n.id === 'r')!.fill).toBe(theme.rootStyle.fill);
    expect(m.nodes.find((n) => n.id === 'a')!.fill).toBe(theme.nodeFillByLevel[1]);
  });

  it('折叠子树不出现在缩略图中', () => {
    const d = doc();
    d.root.children[0]!.collapsed = true;
    const m = thumbnailModel(d, 224, 150, theme);
    expect(m.nodes.find((n) => n.id === 'a1')).toBeUndefined();
    expect(m.branches.length).toBe(2);
  });

  it('pos 偏移生效：带 pos 的节点矩形位置平移', () => {
    const d = doc();
    const natural = thumbnailModel(d, 500, 500, theme);
    d.root.children[0]!.pos = { dx: 40, dy: 30 };
    const moved = thumbnailModel(d, 500, 500, theme);
    const aNat = natural.nodes.find((n) => n.id === 'a')!;
    const aMov = moved.nodes.find((n) => n.id === 'a')!;
    expect(aMov.x).toBeGreaterThan(aNat.x);
    expect(aMov.y).toBeGreaterThan(aNat.y);
  });

  it('确定性：同输入两次结果一致', () => {
    expect(thumbnailModel(doc(), 224, 150, theme)).toEqual(thumbnailModel(doc(), 224, 150, theme));
  });
});
