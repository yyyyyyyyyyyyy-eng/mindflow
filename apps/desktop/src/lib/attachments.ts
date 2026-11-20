// ============================================================================
// 附件工具：File → Attachment 转换 + 文件对话框（Tauri 原生 / 浏览器标准）。
// ============================================================================

import type { Attachment } from 'mindflow-core';

const MAX_INLINE = 500 * 1024; // 500KB

export const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

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

/** 根据 MIME 类型推断 */
function guessMime(name: string): string {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
    zip: 'application/zip', json: 'application/json',
  };
  return map[ext] ?? 'application/octet-stream';
}

/**
 * 打开文件选择对话框（多文件）：
 * - Tauri：@tauri-apps/plugin-dialog 原生对话框 + plugin-fs 读取
 * - 浏览器：动态 <input type="file" multiple> + FileReader
 */
export async function openFileDialogForAttachments(): Promise<File[]> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const result = await open({
      multiple: true,
      // 不设 filter：允许选择所有文件类型
    });
    if (!result) return [];
    const paths = Array.isArray(result) ? result : [result];
    const files: File[] = [];
    const errors: string[] = [];
    for (const p of paths) {
      try {
        const buf = await readFile(p);
        const name = p.split('/').pop() ?? 'file';
        files.push(new File([buf], name, { type: guessMime(name) }));
      } catch (err) {
        errors.push(`${(p.split('/').pop() ?? 'file')}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (files.length === 0 && errors.length > 0) {
      throw new Error(`文件读取失败（${errors.length} 个）：${errors[0]}`);
    }
    return files;
  }
  // 浏览器
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => { resolve(Array.from(input.files ?? [])); };
    input.click();
  });
}
