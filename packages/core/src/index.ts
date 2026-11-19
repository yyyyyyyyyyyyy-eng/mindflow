// ============================================================================
// mindflow-core 包出口：契约 §2–§6 的全部公开面。
// 消费方（桌面 apps/desktop、网页 mindflow-web）只允许从这里导入。
// ============================================================================

// 布局入口（layout/index 已 re-export 契约类型 §2–§5 与 7 个引擎）
export * from './layout/index';

// 序列化（§4）
export { docToMarkdown, markdownToDoc } from './io/markdown';
export { docToOpml, opmlToDoc } from './io/opml';
export { xmindToDoc, NotSupportedXmindError } from './io/xmind';
export { defaultIdGen } from './io/id';

// 主题（§5）
export { BUILTIN_THEMES, getTheme } from './themes';

// 文档服务（§6）
export { createDocumentService } from './service';
export type { StorageAdapter, DocumentService, DocumentServiceOptions } from './service';
