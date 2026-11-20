// ============================================================================
// MindFlow 桌面应用：主界面 ↔ 编辑器路由（2026-11-20 主界面改造）。
// 主界面：创建空白导图 / 导入本地文件 / 最近文档缩略图（XMind 风格，无账号区）。
// 编辑器：DocumentService（契约 §6）+ mindflow-ui 组件。
// ============================================================================

import {
  useCallback, useEffect, useState, useSyncExternalStore,
} from 'react';
import {
  BUILTIN_THEMES, createDocumentService, getTheme,
} from 'mindflow-core';
import type { DocumentService, MindDoc, NodeId, StorageAdapter, StructureType } from 'mindflow-core';
import {
  Inspector, MindMapCanvas, OutlineView, ThemeGallery, findNode,
} from 'mindflow-ui';
import HomePage from './components/HomePage';
import { createEmptyDoc } from './lib/emptyDoc';
import { parseImportFile } from './lib/importFile';
import { filesToAttachments, openFileDialogForAttachments } from './lib/attachments';
// 注意：编辑器工具栏的「导入」已移除（用户口径：文件拖入 + 回形针替代）；主页导入保留
import { exportMflow, exportMarkdown, exportOpml, exportPng } from './lib/exporters';
import { localStorageAdapter } from './lib/localStorageAdapter';
import { tauriFsAdapter } from './lib/tauriFsAdapter';

const STRUCTURES: Array<{ value: StructureType; label: string }> = [
  { value: 'mindmap', label: '思维导图' },
  { value: 'logic-right', label: '逻辑图（右）' },
  { value: 'org-chart', label: '组织架构' },
  { value: 'fishbone', label: '鱼骨图' },
  { value: 'timeline-h', label: '时间轴（横）' },
  { value: 'timeline-v', label: '时间轴（纵）' },
  { value: 'tree', label: '树形图' },
];

// ---------------------------------------------------------------------------
// 应用根：路由（主界面 / 编辑器）与文档生命周期
// ---------------------------------------------------------------------------

type View = { kind: 'home' } | { kind: 'editor'; service: DocumentService; docId: string };

export function App() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [homeDocs, setHomeDocs] = useState<MindDoc[]>([]);
  /** 运行时探测的存储适配器：初始永远 localStorage（保证按钮可用），Tauri fs 探测成功后升级 */
  const [adapter, setAdapter] = useState<StorageAdapter>(localStorageAdapter);

  // 探测：Tauri 环境下试跑一次 save+list 往返，成功才升级 tauriFsAdapter
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) return;
    const probe = async () => {
      try {
        const test = { formatVersion: 1 as const, id: '__probe__', title: '', structure: 'mindmap' as const, theme: 'classic', root: { id: '__probe_root__', text: '', children: [] }, createdAt: '', updatedAt: '' };
        await tauriFsAdapter.save(test);
        await tauriFsAdapter.delete('__probe__');
        setAdapter(tauriFsAdapter);                         // 真正读写删成功才升级
      } catch { /* 留在 localStorage */ }
    };
    void probe();
  }, []);

  const refreshHome = useCallback(async () => {
    const metas = await adapter.list();
    const docs = await Promise.all(metas.map((m) => adapter.load(m.id)));
    setHomeDocs(docs.filter((d): d is MindDoc => d !== null));
  }, [adapter]);

  useEffect(() => {
    if (view.kind === 'home') void refreshHome();
  }, [view.kind, refreshHome]);

  const openEditor = useCallback((doc: MindDoc) => {
    setView({ kind: 'editor', service: createDocumentService(adapter, doc), docId: doc.id });
  }, []);

  const createBlank = useCallback(async () => {
    const doc = createEmptyDoc();
    await adapter.save(doc);
    openEditor(doc);
  }, [openEditor]);

  const importAtHome = useCallback(async (file: File) => {
    try {
      const imported = await parseImportFile(file);
      await adapter.save(imported);
      openEditor(imported);
    } catch { /* 浏览器模式解析失败静默 */ }
  }, [openEditor, adapter]);

  const importDocAtHome = useCallback(async (doc: MindDoc) => {
    await adapter.save(doc);
    openEditor(doc);
  }, [openEditor, adapter]);

  const openFromHome = useCallback((id: string) => {
    void (async () => {
      const doc = await adapter.load(id);
      if (doc !== null) openEditor(doc);
    })();
  }, [openEditor]);

  const deleteDoc = useCallback(async (id: string) => {
    await adapter.delete(id);
    void refreshHome();
  }, [refreshHome]);

  const exitToHome = useCallback(async (service: DocumentService) => {
    await service.flushSave();                             // 离开前把防抖队列里的变更落盘
    setView({ kind: 'home' });
  }, []);

  const newDocFromEditor = useCallback(async (service: DocumentService) => {
    await service.flushSave();
    const doc = createEmptyDoc();
    await adapter.save(doc);
    openEditor(doc);
  }, [openEditor]);

  if (view.kind === 'home') {
    return (
      <HomePage
        docs={homeDocs}
        onCreateBlank={() => { void createBlank(); }}
        onImportFile={(f) => { void importAtHome(f); }}
        onImportDoc={(d) => { void importDocAtHome(d); }}
        onOpen={openFromHome}
        onDelete={(id) => { void deleteDoc(id); }}
      />
    );
  }

  return (
    <Shell
      key={view.docId}
      service={view.service}
      onExitHome={() => { void exitToHome(view.service); }}
      onNewDoc={() => { void newDocFromEditor(view.service); }}
    />
  );
}

// ---------------------------------------------------------------------------
// 编辑器壳：工具栏 + 画布 + 大纲/检查器/主题面板
// ---------------------------------------------------------------------------

interface ShellProps {
  service: DocumentService;
  onExitHome: () => void;
  onNewDoc: () => void;
}

function Shell({ service, onExitHome, onNewDoc }: ShellProps) {
  // 文档状态：订阅 DocumentService
  const doc = useSyncExternalStore(
    useCallback((cb: () => void) => service.subscribe(() => cb()), [service]),
    useCallback(() => service.getDoc(), [service]),
  );

  const [selectedId, setSelectedId] = useState<NodeId | null>(null);
  const [showOutline, setShowOutline] = useState(true);
  const [showGallery, setShowGallery] = useState(false);

  const theme = getTheme(doc.theme);
  const selectedLoc = selectedId !== null ? findNode(doc.root, selectedId) : null;
  const selectedNode = selectedLoc?.node ?? null;

  // 组件 → 服务：mutator 直连（契约 §7 修订语义）
  const onDocChange = useCallback(
    (mutator: (draft: MindDoc) => void) => service.update(mutator),
    [service],
  );

  // 调试探针（dev-only）：前端遥测 → vite dev server /__mf-debug → 仓库根 mf-debug.log
  const dbg = useCallback((p: Record<string, unknown>) => {
    (window as Window & { __mfSendDebug?: (payload: Record<string, unknown>) => void }).__mfSendDebug?.(p);
  }, []);

  useEffect(() => {
    (window as Window & { __mfSendDebug?: (p: Record<string, unknown>) => void }).__mfSendDebug =
      (p) => {
        void fetch('/__mf-debug', {
          method: 'POST',
          body: JSON.stringify({ ...p, t: new Date().toISOString() }),
          keepalive: true,
        });
      };
    return () => {
      delete (window as Window & { __mfSendDebug?: (payload: Record<string, unknown>) => void }).__mfSendDebug;
    };
  }, []);

  // 页面关闭前立即落盘（防抖队列里可能还有未写盘内容）
  useEffect(() => {
    const handler = () => { void service.flushSave(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [service]);

  const patchNode = useCallback((id: NodeId, patch: Partial<typeof doc.root>) => {
    service.update((d) => {
      const loc = findNode(d.root, id);
      if (loc) Object.assign(loc.node, patch);
    });
  }, [service]);

  const deleteNode = useCallback((id: NodeId) => {
    if (id === doc.root.id) return;
    service.update((d) => {
      const loc = findNode(d.root, id);
      if (loc?.parent) loc.parent.children.splice(loc.index, 1);
    });
    setSelectedId(null);
  }, [doc.root.id, service]);

  const btn = 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed';

  // 导出菜单（下拉）
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportActions: Array<{ label: string; title: string; run: () => void | Promise<void> }> = [
    { label: '.mflow', title: 'MindFlow 原生格式', run: () => exportMflow(doc) },
    { label: '.md', title: 'Markdown（可再编辑）', run: () => exportMarkdown(doc) },
    { label: '.opml', title: 'OPML 大纲格式', run: () => exportOpml(doc) },
    { label: 'PNG 图片', title: '2x 高清 PNG', run: () => { void exportPng(doc); } },
  ];

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* 工具栏 */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3">
        <button type="button" className={btn} onClick={onExitHome} title="返回主界面">‹ 主页</button>
        <span className="mx-1 text-sm font-bold tracking-wide">MindFlow</span>
        <span className="max-w-48 truncate text-sm text-gray-500">{doc.title || '未命名'}</span>
        <button type="button" className={btn} disabled={!service.canUndo()} onClick={() => {
          dbg({ k: 'undo-click', canUndo: service.canUndo() });
          const ok = service.undo();
          dbg({ k: 'undo-result', ok });
        }} title="撤销 (⌘Z)">↶ 撤销</button>
        <button type="button" className={btn} disabled={!service.canRedo()} onClick={() => {
          dbg({ k: 'redo-click', ok: service.redo() });
        }} title="重做 (⇧⌘Z)">↷ 重做</button>
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <select
          className={`${btn} w-36`}
          value={doc.structure}
          onChange={(e) => onDocChange((d) => { d.structure = e.target.value as StructureType; })}
          title="切换结构"
        >
          {STRUCTURES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="button" className={btn} onClick={() => setShowGallery((v) => !v)}>主题</button>
        <button type="button" className={`${btn} ${showOutline ? 'ring-1 ring-blue-400' : ''}`} onClick={() => setShowOutline((v) => !v)}>☰ 大纲</button>
        {/* 导出下拉 */}
        <div className="relative">
          <button type="button" className={btn} onClick={() => setShowExportMenu((v) => !v)} title="导出">导出 ▾</button>
          {showExportMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {exportActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => { a.run(); setShowExportMenu(false); }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="flex-1" />
        <button type="button" className={btn} onClick={onNewDoc} title="新建一张空白导图">＋ 新建</button>
      </header>

      {/* 主体 */}
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          <MindMapCanvas
            doc={doc}
            onDocChange={onDocChange}
            theme={theme}
            selectedId={selectedId}
            onSelectedChange={setSelectedId}
            onDropFiles={(id, files) => {
              void (async () => {
                const newAtts = await filesToAttachments(files);
                onDocChange((d) => {
                  const l = findNode(d.root, id);
                  if (l) l.node.attachments = [...(l.node.attachments ?? []), ...newAtts];
                });
              })();
            }}
            onOpenFileDialog={(id) => {
              void (async () => {
                try {
                  const files = await openFileDialogForAttachments();
                  if (files.length === 0) return;
                  const newAtts = await filesToAttachments(files);
                  onDocChange((d) => {
                    const l = findNode(d.root, id);
                    if (l) l.node.attachments = [...(l.node.attachments ?? []), ...newAtts];
                  });
                } catch (err) {
                  // alert 在 WKWebView 无效 → 用可见错误横幅
                  const msg = document.createElement('div');
                  msg.textContent = `📎 ${err instanceof Error ? err.message : String(err)}`;
                  msg.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;background:#fef2f2;color:#dc2626;padding:10px 20px;border-radius:8px;font-size:13px;border:1px solid #fecaca;max-width:80%;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
                  document.body.appendChild(msg);
                  setTimeout(() => msg.remove(), 5000);
                }
              })();
            }}
          />
        </main>

        {showOutline && (
          <aside className="w-72 shrink-0 overflow-auto border-l border-gray-200 bg-white">
            <OutlineView
              doc={doc}
              onDocChange={onDocChange}
              selectedId={selectedId}
              onSelectedChange={setSelectedId}
            />
          </aside>
        )}

        <aside className="w-72 shrink-0 overflow-auto border-l border-gray-200 bg-white">
          {showGallery && (
            <ThemeGallery
              themes={BUILTIN_THEMES}
              current={doc.theme}
              onSelect={(id) => onDocChange((d) => { d.theme = id; })}
            />
          )}
          <Inspector
            node={selectedNode}
            isRoot={selectedLoc?.parent === null}
            onNodeChange={patchNode}
            onDelete={deleteNode}
            onDropFiles={(id, files) => {
              void (async () => {
                const newAtts = await filesToAttachments(files);
                patchNode(id, { attachments: [...(selectedNode?.attachments ?? []), ...newAtts] });
              })();
            }}
          />
        </aside>
      </div>
    </div>
  );
}
