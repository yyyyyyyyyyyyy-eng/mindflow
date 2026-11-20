// ============================================================================
// 导入文件解析（主界面与编辑页共用）：
// .xmind → core xmindToDoc；.mflow → JSON 校验；.md → core markdownToDoc；
// .opml → core opmlToDoc
// Tauri 环境：plugin-dialog 原生文件对话框 + plugin-fs 读取
// 浏览器环境：标准 <input type="file"> + FileReader
// ============================================================================

import { markdownToDoc, opmlToDoc, xmindToDoc } from 'mindflow-core';
import type { MindDoc } from 'mindflow-core';

/** 是否运行在 Tauri 环境 */
export const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

export async function parseImportFile(file: File): Promise<MindDoc> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xmind')) {
    return xmindToDoc(await file.arrayBuffer());
  }
  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) {
    return markdownToDoc(await file.text());
  }
  if (name.endsWith('.opml') || name.endsWith('.xml')) {
    return opmlToDoc(await file.text());
  }
  const parsed = JSON.parse(await file.text()) as MindDoc;
  if (parsed?.formatVersion !== 1 || typeof parsed?.root?.id !== 'string') {
    throw new Error('不支持的文件格式（支持 .xmind / .mflow / .md / .opml）');
  }
  return parsed;
}

/** Tauri 原生文件对话框 → 解析 → 返回 MindDoc（用户取消返回 null） */
export async function importViaTauriDialog(): Promise<MindDoc | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const { readTextFile, readFile } = await import('@tauri-apps/plugin-fs');
  const path = await open({
    multiple: false,
    filters: [
      { name: '导图文件', extensions: ['xmind', 'mflow', 'md', 'opml', 'markdown', 'txt', 'xml'] },
    ],
  });
  if (typeof path !== 'string') return null;
  const ext = path.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xmind') {
    const buf = await readFile(path);
    return xmindToDoc(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  const text = await readTextFile(path);
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') return markdownToDoc(text);
  if (ext === 'opml' || ext === 'xml') return opmlToDoc(text);
  const parsed = JSON.parse(text) as MindDoc;
  if (parsed?.formatVersion !== 1 || typeof parsed?.root?.id !== 'string') {
    throw new Error('不支持的文件格式');
  }
  return parsed;
}
