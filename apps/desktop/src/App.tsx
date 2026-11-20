// ============================================================================
// MindFlow 桌面应用壳：工具栏 + 画布 + 大纲/检查器/主题面板。
// 状态源 = DocumentService（契约 §6）；画布/大纲/检查器 = mindflow-ui 组件。
// ============================================================================

import {
  useCallback, useEffect, useState, useSyncExternalStore,
} from 'react';
import {
  BUILTIN_THEMES, createDocumentService, getTheme,
} from 'mindflow-core';
import type { DocumentService, MindDoc, NodeId, StructureType } from 'mindflow-core';
import {
  Inspector, MindMapCanvas, OutlineView, ThemeGallery, findNode,
} from 'mindflow-ui';
import { createEmptyDoc } from './lib/emptyDoc';
import { localStorageAdapter } from './lib/localStorageAdapter';

const STRUCTURES: Array<{ value: StructureType; label: string }> = [
  { value: 'mindmap', label: '思维导图' },
  { value: 'logic-right', label: '逻辑图（右）' },
  { value: 'org-chart', label: '组织架构' },
  { value: 'fishbone', label: '鱼骨图' },
  { value: 'timeline-h', label: '时间轴（横）' },
  { value: 'timeline-v', label: '时间轴（纵）' },
  { value: 'tree', label: '树形图' },
];

/** 应用根：异步加载初始文档后创建服务（加载失败/无数据 → 空文档） */
export function App() {
  const [service, setService] = useState<DocumentService | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const doc = (await localStorageAdapter.load('mindflow-dev-doc')) ?? createEmptyDoc();
      if (!cancelled) setService(createDocumentService(localStorageAdapter, doc));
    })();
    return () => { cancelled = true; };
  }, []);

  if (service === null) {
    return <div className="p-6 text-sm text-gray-500">正在打开文档…</div>;
  }
  return <Shell service={service} />;
}

function Shell({ service }: { service: DocumentService }) {
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
      delete (window as Window & { __mfSendDebug?: (p: Record<string, unknown>) => void }).__mfSendDebug;
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

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* 工具栏 */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3">
        <span className="mr-1 text-sm font-bold tracking-wide">MindFlow</span>
        <button type="button" className={btn} disabled={!service.canUndo()} onClick={() => service.undo()} title="撤销 (⌘Z)">↶ 撤销</button>
        <button type="button" className={btn} disabled={!service.canRedo()} onClick={() => service.redo()} title="重做 (⇧⌘Z)">↷ 重做</button>
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
        <span className="flex-1" />
        <button
          type="button"
          className={btn}
          onClick={() => {
            service.update((d) => { Object.assign(d, createEmptyDoc()); });
            setSelectedId(null);
          }}
          title="新建并替换当前文档"
        >
          ＋ 新建
        </button>
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
          />
        </aside>
      </div>
    </div>
  );
}
