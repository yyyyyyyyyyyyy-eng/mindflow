// ============================================================================
// 附件工具：File → Attachment 转换 + 文件对话框（Tauri 原生 / 浏览器标准）。
// ============================================================================

import type { Attachment } from 'mindflow-core';

export const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

/** 压缩图片：canvas 重绘为 ≤400px JPEG（质量 0.8），500KB PNG → ~50KB JPEG */
async function compressImage(file: File): Promise<string> {
  // 从 File 创建 Image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    image.src = url;
  });

  // 等比缩放至最大 400px
  const maxDim = 400;
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2D 上下文不可用');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.8);
}

/** File[] → Attachment[]（图片压缩至 400px JPEG 内联；非图片仅存元数据引用） */
export async function filesToAttachments(files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files) {
    const isImage = f.type.startsWith('image/');
    let data = '';
    if (isImage) {
      try {
        data = await compressImage(f);              // 压缩后的 data URI（远小于原始文件）
      } catch { /* 压缩失败则不内联 */ }
    }
    out.push({
      id: crypto.randomUUID(),
      name: f.name,
      mimeType: f.type || 'application/octet-stream',
      size: f.size,
      data,
      isImage: data.length > 0,
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
