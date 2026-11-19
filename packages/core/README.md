# mindflow-core

MindFlow 共享引擎（纯 TypeScript，零 DOM 依赖，浏览器 / Node / Tauri 通用）。

## 模块地图

| 模块 | 内容 | 出处 |
|---|---|---|
| `src/types.ts` | 契约类型（`CONTRACT.md` §2–§5 逐字复制） | 契约 |
| `src/layout/` | 7 种结构布局 + 统一入口 `layout()`（1000 节点 <1ms 实测） | 算法实验室交付（2026-11-19 验收集成） |
| `src/io/` | Markdown / OPML 双向、XMind `.xmind` 导入、默认 id 生成 | 算法实验室交付 |
| `src/themes.ts` | 内置主题 6 个（契约 §5） | 自 mindflow-web stub 移植归位 |
| `src/service.ts` | `createDocumentService`：undo/redo + 防抖自动保存 + 订阅（契约 §6） | 主对话实现 |

## 命令

```bash
pnpm test         # vitest 全量
pnpm typecheck    # tsc --noEmit
pnpm bench        # 布局性能基准（1000/3000 节点）
```

> 布局与序列化的开发历史、Bug 修复记录见 `~/CodeBuddy/mindflow-algo-lab/WORKLOG.md`（实验室档案）。
