// ============================================================================
// HomePage：主界面（XMind 风格，2026-11-20）。
// 顶部品牌区（无账号）→ 创建空白导图大按钮 + 导入本地文件 → 最近文档缩略图网格。
// ============================================================================

import { useRef } from 'react';
import type { MindDoc } from 'mindflow-core';
import { DocThumbnail } from 'mindflow-ui';

export interface HomePageProps {
  docs: MindDoc[];
  onCreateBlank: () => void;
  onImportFile: (file: File) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN', { hour12: false });
}

export default function HomePage({ docs, onCreateBlank, onImportFile, onOpen, onDelete }: HomePageProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* 品牌区（无账号） */}
      <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="text-base font-bold tracking-wide text-gray-900">MindFlow</span>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 py-10">
        {/* 创建 / 导入 */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreateBlank}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            ＋ 创建空白导图
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            导入文件（.xmind / .md / .opml / .mflow）
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xmind,.mflow,.md,.opml,.markdown,.txt,.xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) onImportFile(f);
            }}
          />
        </div>

        {/* 最近文档 */}
        <h2 className="mt-12 text-sm font-semibold text-gray-700">最近文档</h2>
        {docs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-12 text-center text-sm text-gray-400">
            暂无导图
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => (
              <div
                key={d.id}
                className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-blue-400 hover:shadow-md"
                onClick={() => onOpen(d.id)}
              >
                <DocThumbnail doc={d} width={288} height={168} />
                <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2.5">
                  <span className="truncate text-sm font-medium text-gray-800">{d.title || '未命名'}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-gray-400">{fmtTime(d.updatedAt)}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
