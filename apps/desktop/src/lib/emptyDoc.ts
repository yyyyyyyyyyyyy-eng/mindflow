// ============================================================================
// 空文档工厂（契约 §2「新建空文档」规范）。
// id 用 core 的 defaultIdGen（crypto.randomUUID，见契约 §1 裁决）。
// ============================================================================

import { defaultIdGen } from 'mindflow-core';
import type { MindDoc } from 'mindflow-core';

export function createEmptyDoc(): MindDoc {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    id: defaultIdGen(),
    title: '中心主题',
    structure: 'mindmap',
    theme: 'classic',
    root: { id: defaultIdGen(), text: '中心主题', children: [] },
    createdAt: now,
    updatedAt: now,
  };
}
