// ============================================================================
// 文档服务（契约 §6）：undo/redo 栈 + 防抖自动保存 + 变更订阅。
//
// 设计要点：
// - update() 一律走 Immer 不可变产生；历史栈只保留结构共享引用，不深拷贝；
// - mutator 无实际改动时 produce 返回原引用，不入 undo 栈（避免空编辑污染历史）；
// - title 镜像：root.text 首行（契约 §2「保存时同步」），空文本回退「中心主题」；
// - 防抖自动保存默认 2000ms；保存失败仅记日志不抛出（不中断编辑流程），
//   flushSave() 的立即保存则让错误传播给调用方显式处理。
// ============================================================================

import { produce } from 'immer';
import type { DocMeta, MindDoc } from './types';

/** 存储适配器（契约 §6）：网页版 = IndexedDB 实现，桌面版 = 文件系统实现 */
export interface StorageAdapter {
  list(): Promise<DocMeta[]>;
  load(id: string): Promise<MindDoc | null>;
  save(doc: MindDoc): Promise<void>;           // 防抖由上层（本服务）负责
  delete(id: string): Promise<void>;
}

/** 文档服务（契约 §6）：组合 undo/redo + 自动保存 + 订阅 */
export interface DocumentService {
  getDoc(): MindDoc;
  update(mutator: (draft: MindDoc) => void): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  subscribe(listener: (doc: MindDoc) => void): () => void;  // 返回退订函数
  flushSave(): Promise<void>;                                // 切 tab / 关闭前调用
}

/** 服务选项 */
export interface DocumentServiceOptions {
  /** 防抖自动保存间隔，默认 2000ms */
  autosaveDebounceMs?: number;
}

/**
 * 创建文档服务。
 * @param adapter  存储适配器（IndexedDB / 文件系统等）
 * @param initial  初始文档（调用方先经 adapter.load 或空白构造获得）
 * @param opts     可选：防抖间隔
 */
export function createDocumentService(
  adapter: StorageAdapter,
  initial: MindDoc,
  opts: DocumentServiceOptions = {},
): DocumentService {
  let doc = initial;
  let undoStack: MindDoc[] = [];
  let redoStack: MindDoc[] = [];
  const listeners = new Set<(doc: MindDoc) => void>();
  const debounceMs = opts.autosaveDebounceMs ?? 2000;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflightSave: Promise<void> = Promise.resolve();

  const notify = () => {
    for (const listener of listeners) listener(doc);
  };

  // 防抖落盘：失败只记日志（编辑流程不中断）；flushSave 会串行等待在途保存
  const scheduleSave = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      inflightSave = adapter.save(doc).catch((err: unknown) => {
        console.error('[MindFlow] 自动保存失败：', err);
      });
    }, debounceMs);
  };

  /** 新状态入历史：压 undo 栈、清 redo 栈、通知订阅、计划保存 */
  const commit = (next: MindDoc) => {
    undoStack.push(doc);
    redoStack = [];
    doc = next;
    notify();
    scheduleSave();
  };

  return {
    getDoc: () => doc,

    update(mutator) {
      // 第一段 produce：只跑用户改动；引用不变则确属无操作，直接返回
      const changed = produce(doc, mutator);
      if (changed === doc) return;
      // 第二段 produce：盖 title/updatedAt 元数据戳
      const next = produce(changed, (draft) => {
        draft.title = draft.root.text.split('\n')[0]?.trim() || '中心主题';
        draft.updatedAt = new Date().toISOString();
      });
      commit(next);
    },

    undo() {
      const prev = undoStack.pop();
      if (prev === undefined) return false;
      redoStack.push(doc);
      doc = prev;
      notify();
      scheduleSave();
      return true;
    },

    redo() {
      const next = redoStack.pop();
      if (next === undefined) return false;
      undoStack.push(doc);
      doc = next;
      notify();
      scheduleSave();
      return true;
    },

    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async flushSave() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      // 先等在途防抖保存完成再立即保存，保证写入顺序不乱
      await inflightSave;
      await adapter.save(doc);
    },
  };
}
