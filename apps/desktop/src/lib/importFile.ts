// ============================================================================
// 导入文件解析（主界面与编辑页共用）：
// .xmind → core xmindToDoc；.mflow → JSON 校验；.md → core markdownToDoc；
// .opml → core opmlToDoc
// ============================================================================

import { markdownToDoc, opmlToDoc, xmindToDoc } from 'mindflow-core';
import type { MindDoc } from 'mindflow-core';

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
  // .mflow / 其他 JSON
  const parsed = JSON.parse(await file.text()) as MindDoc;
  if (parsed?.formatVersion !== 1 || typeof parsed?.root?.id !== 'string') {
    throw new Error('不支持的文件格式（支持 .xmind / .mflow / .md / .opml）');
  }
  return parsed;
}
