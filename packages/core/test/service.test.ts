// ============================================================================
// DocumentService 单测（契约 §6）：
// update/undo/redo、无操作不入栈、title 镜像、updatedAt 刷新、
// 防抖自动保存、flushSave、订阅与退订。
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentService } from '../src/service';
import type { StorageAdapter } from '../src/service';
import type { MindDoc } from '../src/types';

/** 构造最小合法文档（契约 §2 规范：空白文档） */
function makeDoc(text = '中心主题'): MindDoc {
  return {
    formatVersion: 1,
    id: 'doc-1',
    title: text,
    structure: 'mindmap',
    theme: 'classic',
    root: { id: 'root', text, children: [] },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** 内存假适配器：记录每次 save 的文档快照 */
function memoryAdapter(): StorageAdapter & { saves: MindDoc[] } {
  const saves: MindDoc[] = [];
  return {
    saves,
    list: async () => [],
    load: async () => null,
    save: async (doc) => { saves.push(doc); },
    delete: async () => {},
  };
}

describe('DocumentService', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('update 修改文本：doc 变化 + title 镜像首行 + updatedAt 刷新 + 入 undo 栈', () => {
    const svc = createDocumentService(memoryAdapter(), makeDoc());
    expect(svc.canUndo()).toBe(false);

    svc.update((d) => { d.root.text = '新主题\n第二行'; });

    expect(svc.getDoc().root.text).toBe('新主题\n第二行');
    expect(svc.getDoc().title).toBe('新主题');           // 首行镜像
    expect(svc.getDoc().updatedAt > '2026-01-01').toBe(true);
    expect(svc.canUndo()).toBe(true);
  });

  it('无实际改动的 update：不入 undo 栈、文档引用不变', () => {
    const svc = createDocumentService(memoryAdapter(), makeDoc());
    const before = svc.getDoc();
    svc.update((d) => { void d; });                       // 什么都没改
    expect(svc.getDoc()).toBe(before);                   // 引用全等
    expect(svc.canUndo()).toBe(false);
  });

  it('undo/redo 往返：恢复旧值；新 update 清空 redo 栈', () => {
    const svc = createDocumentService(memoryAdapter(), makeDoc());
    svc.update((d) => { d.root.text = 'A'; });
    svc.update((d) => { d.root.text = 'B'; });
    expect(svc.getDoc().root.text).toBe('B');

    expect(svc.undo()).toBe(true);
    expect(svc.getDoc().root.text).toBe('A');
    expect(svc.redo()).toBe(true);
    expect(svc.getDoc().root.text).toBe('B');

    svc.undo();
    svc.update((d) => { d.root.text = 'C'; });           // 编辑后 redo 不可用
    expect(svc.canRedo()).toBe(false);
    expect(svc.getDoc().root.text).toBe('C');
  });

  it('空栈时 undo/redo 返回 false 且不改变文档', () => {
    const svc = createDocumentService(memoryAdapter(), makeDoc());
    const before = svc.getDoc();
    expect(svc.undo()).toBe(false);
    expect(svc.redo()).toBe(false);
    expect(svc.getDoc()).toBe(before);
  });

  it('root.text 空串回退「中心主题」；多行取首行', () => {
    const svc = createDocumentService(memoryAdapter(), makeDoc());
    svc.update((d) => { d.root.text = ''; });
    expect(svc.getDoc().title).toBe('中心主题');
    svc.update((d) => { d.root.text = '\n忽略空首行'; });
    expect(svc.getDoc().title).toBe('中心主题');          // 首行 trim 后为空
  });

  it('订阅收到每次变更；退订后不再收', () => {
    const svc = createDocumentService(memoryAdapter(), makeDoc());
    const seen: string[] = [];
    const un = svc.subscribe((d) => { seen.push(d.root.text); });

    svc.update((d) => { d.root.text = 'A'; });
    svc.undo();
    un();                                                 // 退订
    svc.update((d) => { d.root.text = 'C'; });

    expect(seen).toEqual(['A', '中心主题']);              // 'C' 不再推送
  });

  it('防抖自动保存：2s 后落盘一次；flushSave 立即落盘且取消待触发', async () => {
    const adapter = memoryAdapter();
    const svc = createDocumentService(adapter, makeDoc());
    svc.update((d) => { d.root.text = 'A'; });

    expect(adapter.saves.length).toBe(0);                // 未到 2s 不保存
    vi.advanceTimersByTime(1999);
    expect(adapter.saves.length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(adapter.saves.length).toBe(1);
    expect(adapter.saves[0]!.root.text).toBe('A');

    svc.update((d) => { d.root.text = 'B'; });
    await svc.flushSave();                                // 立即保存
    expect(adapter.saves.length).toBe(2);
    expect(adapter.saves[1]!.root.text).toBe('B');
    vi.advanceTimersByTime(5000);                        // 待触发已被取消
    expect(adapter.saves.length).toBe(2);
  });
});
