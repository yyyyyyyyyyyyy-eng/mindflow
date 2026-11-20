// ============================================================================
// localStorage 多文档存储适配器（契约 §6 StorageAdapter）。
// 2026-11-20 主界面改造：从单文档升级为文档库；首次运行自动迁移旧单文档键。
// TODO(Phase 6)：换成 Tauri 文件系统实现（默认目录 = iCloud Drive/MindFlow）。
// ============================================================================

import type { DocMeta, MindDoc, StorageAdapter } from 'mindflow-core';

const KEY = 'mindflow-docs-v1';
const LEGACY_KEY = 'mindflow-dev-doc';

function nodeCount(node: MindDoc['root']): number {
  return 1 + node.children.reduce((acc, c) => acc + nodeCount(c), 0);
}

function valid(d: unknown): d is MindDoc {
  const v = d as MindDoc;
  return v?.formatVersion === 1 && typeof v?.root?.id === 'string';
}

/** 读取全部文档（含旧单文档一次性迁移） */
function readAll(): MindDoc[] {
  let docs: MindDoc[] = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MindDoc[];
      if (Array.isArray(parsed)) docs = parsed.filter(valid);
    }
  } catch { docs = []; }

  // 旧单文档迁移（Phase 2/5 时代的存储格式）：
  // 消费旧键后必须立即落盘——list()/load() 各自独立调 readAll，
  // 若不回写，第一次读取消费旧键、第二次读取已无旧键可迁，结果丢失在两次读取之间。
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy !== null) {
    try {
      const d = JSON.parse(legacy) as MindDoc;
      if (valid(d) && !docs.some((x) => x.id === d.id)) docs.push(d);
    } catch { /* 坏数据当不存在 */ }
    localStorage.removeItem(LEGACY_KEY);
    writeAll(docs);
  }
  return docs;
}

function writeAll(docs: MindDoc[]): void {
  localStorage.setItem(KEY, JSON.stringify(docs));
}

export const localStorageAdapter: StorageAdapter = {
  async list(): Promise<DocMeta[]> {
    return readAll()
      .map((d) => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
        nodeCount: nodeCount(d.root),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async load(id: string): Promise<MindDoc | null> {
    return readAll().find((d) => d.id === id) ?? null;
  },

  async save(doc: MindDoc): Promise<void> {
    const docs = readAll();
    const i = docs.findIndex((d) => d.id === doc.id);
    if (i >= 0) docs[i] = doc;
    else docs.push(doc);
    writeAll(docs);
  },

  async delete(id: string): Promise<void> {
    writeAll(readAll().filter((d) => d.id !== id));
  },
};
