// ============================================================================
// localStorage 临时存储适配器（契约 §6 StorageAdapter）。
// TODO(Phase 6)：换成 Tauri 文件系统实现（默认目录 = iCloud Drive/MindFlow），
// 当前用于桌面应用开发期的持久化冒烟。
// ============================================================================

import type { DocMeta, MindDoc, StorageAdapter } from 'mindflow-core';

const KEY = 'mindflow-dev-doc';

function loadRaw(): MindDoc | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw) as MindDoc;
    if (doc?.formatVersion === 1 && doc?.root?.id) return doc;
    return null;                                          // 坏数据防御：当不存在处理
  } catch {
    return null;
  }
}

function nodeCount(node: MindDoc['root']): number {
  return 1 + node.children.reduce((acc, c) => acc + nodeCount(c), 0);
}

export const localStorageAdapter: StorageAdapter = {
  async list(): Promise<DocMeta[]> {
    const doc = loadRaw();
    if (!doc) return [];
    return [{
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      nodeCount: nodeCount(doc.root),
    }];
  },
  async load(_id: string): Promise<MindDoc | null> {
    return loadRaw();
  },
  async save(doc: MindDoc): Promise<void> {
    localStorage.setItem(KEY, JSON.stringify(doc));
  },
  async delete(_id: string): Promise<void> {
    localStorage.removeItem(KEY);
  },
};
