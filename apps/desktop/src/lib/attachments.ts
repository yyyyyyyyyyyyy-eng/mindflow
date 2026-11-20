// ============================================================================
// 附件工具：File → Attachment 转换（图片内联 base64，非图片仅存元数据）。
// ============================================================================

import type { Attachment } from 'mindflow-core';

const MAX_INLINE = 500 * 1024; // 500KB

/** File[] → Attachment[]（图片≤500KB 转 base64 内联；非图片仅存元数据引用） */
export async function filesToAttachments(files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files) {
    const isImage = f.type.startsWith('image/');
    let data = '';
    if (isImage && f.size <= MAX_INLINE) {
      data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => { resolve(typeof reader.result === 'string' ? reader.result : ''); };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(f);
      });
    }
    out.push({
      id: crypto.randomUUID(),
      name: f.name,
      mimeType: f.type || 'application/octet-stream',
      size: f.size,
      data,
      isImage: isImage && data.length > 0,
    });
  }
  return out;
}
