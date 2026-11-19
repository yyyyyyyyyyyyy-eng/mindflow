# MindFlow（桌面版仓库）

开源思维导图软件，目标：**平替 XMind 主功能**。桌面三端（macOS / Windows / Linux）+ 网页版双仓库之一，本仓库为**权威源**，包含共享引擎与共享 UI 组件。

## 技术栈

- 壳：Tauri 2（Rust，系统 WebView）
- 前端：Vite + React 19 + TypeScript（Phase 2 起替换 `ui/` 静态占位）
- 画布：@xyflow/react（React Flow）v12
- 引擎：`packages/core`（文档模型 / 布局算法 / undo·redo / 导入导出，纯 TS）

## 目录

```
├─ packages/core/     # 共享引擎：布局算法 / 序列化 / 主题 / DocumentService（119 用例）
├─ packages/ui/       # 共享 UI 组件：React Flow 画布 / 大纲 / 检查器 / 主题库
├─ apps/desktop/      # 桌面应用（Vite + React + Tailwind）
├─ src-tauri/         # Rust 壳：窗口、文件系统、iCloud 目录
└─ CONTRACT.md        # 双仓库协作契约（类型 / 接口 / 命名约定）
```

## 开发

```bash
# 前置：Rust stable + cargo（镜像见开发计划）
cd src-tauri
cargo tauri dev     # 开发模式
cargo tauri build   # 产物：target/release/bundle/
```

## 相关文档

- 总体开发计划：`/Users/yiyi/Documents/OpenCode/2026-11-18_19-36-04-605-sdZchc/DEV_PLAN.md`
- 协作契约：本仓库 `CONTRACT.md`（网页版仓库据此对接）
- 网页版仓库：`mindflow-web`
