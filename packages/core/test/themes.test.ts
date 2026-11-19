// ============================================================================
// 内置主题单测（契约 §5）：6 个 id 齐全、字段完备、未知 id 回退。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { BUILTIN_THEMES, getTheme } from '../src/themes';

const CONTRACT_IDS = ['classic', 'snow-ink', 'sunset', 'forest', 'ocean', 'mono-dark'];

describe('内置主题', () => {
  it('数量与 id 与契约 §5 完全一致', () => {
    expect(BUILTIN_THEMES.map((t) => t.id)).toEqual(CONTRACT_IDS);
  });

  it('每个主题字段完备：4 级配色、根样式有填充色', () => {
    for (const t of BUILTIN_THEMES) {
      expect(t.background).toMatch(/^#/);
      expect(t.nodeFillByLevel.length).toBe(4);
      expect(t.branchColorByLevel.length).toBe(4);
      expect(t.rootStyle.fill).toMatch(/^#/);
      expect(t.name.length).toBeGreaterThan(0);
    }
  });

  it('getTheme 命中返回对应主题；未知 id 回退经典', () => {
    expect(getTheme('sunset').id).toBe('sunset');
    expect(getTheme('不存在的主题').id).toBe('classic');
  });
});
