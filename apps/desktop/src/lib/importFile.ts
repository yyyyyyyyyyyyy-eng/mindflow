// ============================================================================
// 导入文件解析（主界面与编辑页共用）：
// .xmind → core xmindToDoc（解压 + content.json 防御式解析）
// .mflow → JSON 校验（formatVersion/root 必须合法）
// ============================================================================

import { xmindToDoc } from 'mindflow-core';
import type { MindDoc } from 'mindflow-core';

export async function parseImportFile(file: File): Promise<MindDoc> {
  if (file.name.toLowerCase().endsWith('.xmind')) {
    return xmindToDoc(await file.arrayBuffer());
  }
  const parsed = JSON.parse(await file.text()) as MindDoc;
  if (parsed?.formatVersion !== 1 || typeof parsed?.root?.id !== 'string') {
    throw new Error('不是有效的 .mflow 文档（缺少 formatVersion/root）');
  }
  return parsed;
}
