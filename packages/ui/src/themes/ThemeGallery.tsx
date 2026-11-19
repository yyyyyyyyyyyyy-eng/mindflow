// ============================================================================
// ThemeGallery（契约 §7）：内置主题选择。卡片展示背景色 + 前三级节点色样，
// 当前主题高亮描边；点击 onSelect(themeId)。
// ============================================================================

import type { Theme } from 'mindflow-core';

export interface ThemeGalleryProps {
  themes: Theme[];
  current: string;
  onSelect: (themeId: string) => void;
}

export function ThemeGallery({ themes, current, onSelect }: ThemeGalleryProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: 12 }}>
      {themes.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            style={{
              textAlign: 'left', cursor: 'pointer', borderRadius: 10,
              border: active ? '2px solid #4f7cf7' : '1px solid #e4e7ec',
              background: t.background, padding: 10, display: 'flex',
              flexDirection: 'column', gap: 8,
            }}
            title={`切换到「${t.name}」`}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textColor }}>{t.name}</span>
            <span style={{ display: 'flex', gap: 4 }}>
              {t.nodeFillByLevel.slice(0, 3).map((c) => (
                <span key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
