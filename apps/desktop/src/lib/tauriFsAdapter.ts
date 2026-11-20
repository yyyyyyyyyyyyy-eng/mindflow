// ============================================================================
// TauriFsAdapter：原生文件系统适配器（契约 §6 StorageAdapter）。
// 2026-11-20 主界面改造：从 localStorage 升级为磁盘 .mflow 文件 + iCloud 默认目录。
//
// - 存储目录：~/Library/Mobile Documents/com~apple~CloudDocs/MindFlow/
//   （iCloud Drive 下的 MindFlow 子目录，Windows/Linux 降级为 ~/Documents/MindFlow/）
// - 每个文档 = 一个 .mflow 文件
// - list() 扫描目录内全部 .mflow 文件并解析元信息
// ============================================================================

import type { DocMeta, MindDoc, StorageAdapter } from 'mindflow-core';
import { readDir, readTextFile, writeTextFile, remove, exists, mkdir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';

const DIR_NAME = 'MindFlow';
const EXT = '.mflow';

function nodeCount(node: MindDoc['root']): number {
  return 1 + node.children.reduce((acc, c) => acc + nodeCount(c), 0);
}

function valid(d: unknown): d is MindDoc {
  const v = d as MindDoc;
  return v?.formatVersion === 1 && typeof v?.root?.id === 'string';
}

/** iCloud Drive 路径（macOS）；非 macOS 降级 ~/Documents */
async function docsDir(): Promise<string> {
  const home = await homeDir();
  const isMac = navigator.userAgent.includes('Macintosh') || navigator.platform.includes('Mac');
  if (isMac) {
    // iCloud Drive: ~/Library/Mobile Documents/com~apple~CloudDocs/MindFlow/
    return await join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', DIR_NAME);
  }
  return await join(home, 'Documents', DIR_NAME);
}

async function ensureDir(): Promise<string> {
  const dir = await docsDir();
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true }).catch(() => {});
  }
  return dir;
}

function fileNameFor(doc: MindDoc): string {
  const safe = (doc.title || '未命名')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  return `${safe}${EXT}`;
}

function docIdFromFileName(name: string): string {
  return name.replace(EXT, '').replace(/_/g, ' ');
}

export const tauriFsAdapter: StorageAdapter = {
  async list(): Promise<DocMeta[]> {
    const dir = await ensureDir().catch(() => null);
    if (dir === null) return [];
    try {
      const entries = await readDir(dir);
      const metas: DocMeta[] = [];
      for (const entry of entries) {
        if (!entry.name?.endsWith(EXT) || !entry.isFile) continue;
        try {
          const path = await join(dir, entry.name);
          const raw = await readTextFile(path);
          const doc = JSON.parse(raw) as MindDoc;
          if (!valid(doc)) continue;
          metas.push({
            id: doc.id,
            title: doc.title || docIdFromFileName(entry.name),
            updatedAt: doc.updatedAt,
            nodeCount: nodeCount(doc.root),
          });
        } catch { /* 坏文件跳过 */ }
      }
      return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch { return []; }
  },

  async load(id: string): Promise<MindDoc | null> {
    const dir = await ensureDir().catch(() => null);
    if (dir === null) return null;
    try {
      const entries = await readDir(dir);
      for (const entry of entries) {
        if (!entry.name?.endsWith(EXT) || !entry.isFile) continue;
        const path = await join(dir, entry.name);
        const raw = await readTextFile(path);
        const doc = JSON.parse(raw) as MindDoc;
        if (valid(doc) && doc.id === id) return doc;
      }
      return null;
    } catch { return null; }
  },

  async save(doc: MindDoc): Promise<void> {
    const dir = await ensureDir();
    const name = fileNameFor(doc);
    const path = await join(dir, name);
    await writeTextFile(path, JSON.stringify(doc, null, 2));
  },

  async delete(id: string): Promise<void> {
    const dir = await ensureDir().catch(() => null);
    if (dir === null) return;
    try {
      const entries = await readDir(dir);
      for (const entry of entries) {
        if (!entry.name?.endsWith(EXT) || !entry.isFile) continue;
        const path = await join(dir, entry.name);
        const raw = await readTextFile(path);
        const doc = JSON.parse(raw) as MindDoc;
        if (valid(doc) && doc.id === id) {
          await remove(path);
          return;
        }
      }
    } catch { /* 目录不存在或无权限 */ }
  },
};
