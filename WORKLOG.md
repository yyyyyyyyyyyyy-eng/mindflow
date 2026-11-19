# 开发工作日志

> 本文件由 code-review-worklog 技能自动维护：记录每次需求澄清的问答、代码变更、Bug 及修复方案、所有需求及其实现状态。请保留全部结构标题与表格，条目按时间顺序追加。

- **日志创建时间**：2026-11-18 19:46:54
- **最近更新**：2026-11-19 11:48:04
- **最新版本**：v0.10.2
---

## 需求跟踪

| ID | 需求描述 | 提出时间 | 状态 | 备注 |
|----|---------|---------|------|------|
| REQ-001 | Phase 0：环境镜像配置 + 双仓库脚手架落地（mindflow / mindflow-web）+ GitHub 远端创建 | 2026-11-18 19:46:54 | 已完成 | 双仓库已推送 github.com/yyyyyyyyyyyyy-eng/{mindflow,mindflow-web}；cargo check 与 pnpm build 双验证通过 |
| REQ-002 | 移动端浏览器适配：网页版 <768px 布局与触控优化（大纲优先/底部抽屉/触控目标44px/pinch缩放） | 2026-11-18 20:03:26 | 待实现 | 分工给网页版对话执行（HANDOFF_PROMPTS.md 已含此要求） |
| REQ-003 | 集成两个分身交付物：算法实验室并入 packages/core（验收→迁移→补 service/themes→测试全绿→推送）；网页版 13 条提交补推远端 | 2026-11-19 11:08:10 | 已完成 | packages/core 集成完毕（119 用例全绿）；两仓库均已推送远端（mindflow 8054a4c / mindflow-web 全部 13 条提交） |
| REQ-004 | Phase 2：packages/ui（React Flow 画布/大纲/检查器/主题库）+ apps/desktop（Vite+React 前端 + Tauri 壳接线），浏览器实测验收 | 2026-11-19 11:35:16 | 已完成 | 画布/大纲/检查器/主题库 + apps/desktop 全部落地；15 单测 + 浏览器全链路冒烟零错误 |

<!--
  状态取值：待实现 / 进行中 / 已完成 / 已取消
  新需求行由脚本（add-req）追加在表格末尾，update-req 修改状态列。
-->

## 澄清记录

<!-- 每完成一轮需求澄清，由脚本（add-clarify）在此节末尾逐条追加问答条目，提问与回答分别列出。格式示例：

  ### CLAR-XXX ｜ 2026-09-05 19:50:00
  - **需求关联**：REQ-XXX
  - **提问**：向用户澄清的问题
  - **回答**：用户的答复
-->

### CLAR-001 ｜ 2026-11-18 19:47:06
- **需求关联**：REQ-001
- **提问**：目标平台？
- **回答**：同时做三端桌面（Win/Mac/Linux）和网页版，用 GitHub 分两个仓库管理

### CLAR-002 ｜ 2026-11-18 19:47:06
- **需求关联**：REQ-001
- **提问**：第一版功能做到什么程度？
- **回答**：对齐 XMind 主功能（大纲视图、多结构、Markdown 双向、主题样式库、多标签页、自动保存）

### CLAR-003 ｜ 2026-11-18 19:47:06
- **需求关联**：REQ-001
- **提问**：导图文件如何存储与同步？
- **回答**：本地 + iCloud 同步

### CLAR-004 ｜ 2026-11-18 19:47:06
- **需求关联**：REQ-001
- **提问**：项目名/仓库可见性/是否开工？
- **回答**：都可以，开始吧（MindFlow 命名、public 仓库、Phase 0 开工均获确认）

### CLAR-005 ｜ 2026-11-18 20:03:26
- **需求关联**：REQ-002
- **提问**：移动端（iOS+Android）用哪条路线？
- **回答**：仅需支持浏览器，但布局等设计需针对移动端优化（不做原生 App）

### CLAR-006 ｜ 2026-11-19 11:35:16
- **需求关联**：REQ-002
- **提问**：网页仓库如何消费 mindflow-core / mindflow-ui？
- **回答**：GitHub tag 依赖（零账号，pnpm add github:...#tag）

## 经验暂存

<!-- 每次判定出可沉淀经验时，由脚本（add-exp）暂存于此，状态=待确认；用户确认功能测试正常后，下一轮对话再去重沉淀到领域 skill（update-exp 更新状态）。格式示例：

  ### EXP-XXX ｜ 2026-09-06 19:00:00
  - **经验内容**：现象 → 根因 → 修法
  - **候选目标**：macos-app-development
  - **来源变更**：CHG-XXX
  - **状态**：待确认
-->

### EXP-001 ｜ 2026-11-18 20:03:26
- **经验内容**：cargo 拉取 rsproxy.cn/crates.io-index 报 git fetch failed → rsproxy 的 git 索引在国内网络不稳 → 改 sparse 协议 sparse+https://rsproxy.cn/index/ 且 git-fetch-with-cli=false 后恢复（实测 2026-11-18, cargo 1.100 macOS）
- **候选目标**：dev-plan-with-mirrors
- **来源变更**：CHG-001
- **状态**：待确认

### EXP-002 ｜ 2026-11-18 20:03:26
- **经验内容**：git push github.com 报 HTTP2 framing layer 错误/443 连接超时（国内网络间歇）→ git config --global http.version HTTP/1.1 + 失败重试循环（间隔8s×5）后推送成功（实测 2026-11-18）
- **候选目标**：dev-plan-with-mirrors
- **来源变更**：CHG-001
- **状态**：待确认

### EXP-003 ｜ 2026-11-19 11:10:44
- **经验内容**：worklog.py 报「日志文件不存在」→ 脚本以调用时工作目录定位 WORKLOG.md，在会话默认目录调用会找错项目 → 一律显式传 workdir=项目根再调用（实测 2026-11-19）
- **候选目标**：code-review-worklog
- **来源变更**：CHG-007
- **状态**：待确认

### EXP-004 ｜ 2026-11-19 11:48:04
- **经验内容**：浏览器验证 React 应用：a11y 快照看不见 React Flow 节点内容（绝对定位不进树），且同一 evaluate/紧邻 rAF 内读 DOM 会早于 React 提交造成『没生效』误判 → 断言要等确定文本变化（browser.wait condition:text）或页内 await setTimeout(400) 再读（实测 2026-11-19, vite dev）
- **候选目标**：browser
- **来源变更**：CHG-012
- **状态**：待确认

## 变更历史

<!-- 每次代码生成 / 修改 / 删除 / 清理后，由脚本（add-change）在此节末尾追加一个条目。格式示例：

  ### CHG-XXX ｜ 2026-09-01 19:45:12 ｜ 修改
  - **文件**：`src/app.py`、`src/config.py`
  - **需求关联**：REQ-XXX
  - **变更摘要**：一句话说明改了什么、为什么改
  - **自查结论**：通过（逻辑 / 规范 / 性能 / 安全 / 可维护性 / 兼容性 / 测试）
-->

### CHG-001 ｜ 2026-11-18 20:03:26 ｜ 修改
- **文件**：`~/.npmrc`、`~/.cargo/config.toml`、`~/.gitconfig`
- **需求关联**：REQ-001
- **变更摘要**：全局镜像与网络基线：npm/pnpm→npmmirror；rustup 走 USTC；cargo 走 rsproxy sparse；git 全局 HTTP/1.1
- **自查结论**：通过（npm config get registry=npmmirror；cargo check Finished 0.70s）

### CHG-002 ｜ 2026-11-18 20:03:26 ｜ 修改
- **文件**：`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`ui/index.html`、`README.md`、`.gitignore`
- **需求关联**：REQ-001
- **变更摘要**：桌面仓库模板落地与命名适配（mindflow / MindFlow / com.yiyi.mindflow + bundle 图标清单）
- **自查结论**：通过（占位符残留 grep 0；tauri.conf.json JSON 校验 OK；cargo check 通过）

### CHG-003 ｜ 2026-11-18 20:03:26 ｜ 修改
- **文件**：`~/CodeBuddy/mindflow-web/package.json`、`~/CodeBuddy/mindflow-web/index.html`、`~/CodeBuddy/mindflow-web/src/App.jsx`、`~/CodeBuddy/mindflow-web/README.md`、`~/CodeBuddy/mindflow-web/.gitignore`
- **需求关联**：REQ-001
- **变更摘要**：网页仓库模板落地与命名适配（mindflow-web）
- **自查结论**：通过（pnpm build ✓ built in 221ms；JSON 校验 OK；已推送远端）

### CHG-004 ｜ 2026-11-18 20:03:26 ｜ 新增
- **文件**：`scripts/make_icon.py`、`src-tauri/icons/`
- **需求关联**：REQ-001
- **变更摘要**：可复现占位图标脚本 + tauri icon 全套（含 §7.1 移动端适配条款前的构建阻塞修复）
- **自查结论**：通过（cargo check 通过；图标全套 ls 验证）

### CHG-005 ｜ 2026-11-18 20:03:26 ｜ 新增
- **文件**：`CONTRACT.md`、`/Users/yiyi/Documents/OpenCode/2026-11-18_19-36-04-605-sdZchc/DEV_PLAN.md`
- **需求关联**：REQ-001
- **变更摘要**：双仓库协作契约 v0.1（类型/布局/序列化/存储/UI出口 + §7.1 移动端适配硬性要求）与开发计划（含分工章节）
- **自查结论**：通过（章节结构自查：§7.1 编号错乱已当轮修复）

### CHG-006 ｜ 2026-11-18 20:10:38 ｜ 新增
- **文件**：`~/.ssh/config`、`~/.ssh/id_ed25519`
- **需求关联**：REQ-001
- **变更摘要**：GitHub 推送备用通道预备：生成 ed25519 密钥 + ssh config 走 ssh.github.com:443；密钥尚未注册到 GitHub（gh 令牌缺 admin:public_key scope，需用户交互授权），HTTPS 恢复后已成功推送
- **自查结论**：通过（nc 验证 443 可达；推送已确认 a90cab6..6a44069）

### CHG-007 ｜ 2026-11-19 11:10:43 ｜ 新增
- **文件**：`packages/core/{src/layout`、`src/io`、`src/types.ts`、`test`、`bench}`、`pnpm-workspace.yaml`、`package.json`
- **需求关联**：REQ-003
- **变更摘要**：算法实验室交付物验收并入 packages/core：7 结构布局 + Markdown/OPML/XMind 序列化 + 109 用例原位全绿；workspace 骨架建立
- **自查结论**：通过（vitest 109 lab 用例在集成位置全绿；tsc --noEmit exit 0）

### CHG-008 ｜ 2026-11-19 11:10:43 ｜ 新增
- **文件**：`packages/core/src/service.ts`、`packages/core/test/service.test.ts`
- **需求关联**：REQ-003
- **变更摘要**：DocumentService 实现（契约 §6）：Immer 双段 produce（无操作不入栈）、undo/redo、title 首行镜像、updatedAt 刷新、2s 防抖自动保存（失败不中断编辑）、flushSave 串行等待在途保存
- **自查结论**：通过（7 用例真实运行全绿；tsc exit 0）

### CHG-009 ｜ 2026-11-19 11:10:44 ｜ 新增
- **文件**：`packages/core/src/themes.ts`、`packages/core/test/themes.test.ts`、`packages/core/src/index.ts`、`packages/core/README.md`
- **需求关联**：REQ-003
- **变更摘要**：内置主题 6 个自 web stub 移植归位（含未知 id 回退）+ 包出口 index.ts + 模块地图 README
- **自查结论**：通过（3 用例全绿；tsc exit 0；包出口经 tsc 编译验证）

### CHG-010 ｜ 2026-11-19 11:10:44 ｜ 修改
- **文件**：`CONTRACT.md`
- **需求关联**：REQ-003
- **变更摘要**：契约 §1 裁决：默认 idGen 由 nanoid 改为 crypto.randomUUID（零依赖等价实现，采纳算法实验室偏离建议）
- **自查结论**：通过（Markdown 文档，豁免门禁；裁决已在文件中注明日期与理由）

### CHG-011 ｜ 2026-11-19 11:48:04 ｜ 新增
- **文件**：`packages/ui/{package.json`、`tsconfig.json`、`vitest.config.ts`、`src/flowModel.ts`、`src/treeOps.ts`、`src/globals.d.ts`、`src/index.ts`、`test/flowModel.test.ts`、`test/treeOps.test.ts}`
- **需求关联**：REQ-004
- **变更摘要**：mindflow-ui 工程骨架 + flowModel 纯投影层（树+布局→RF 节点/边，主题映射）+ treeOps（查找/防环/大纲行收集），15 用例
- **自查结论**：通过（vitest 15 全绿；tsc exit 0）

### CHG-012 ｜ 2026-11-19 11:48:04 ｜ 新增
- **文件**：`packages/ui/src/canvas/{MindMapCanvas.tsx`、`MindNode.tsx`、`BranchEdge.tsx}`、`packages/ui/src/measure.ts`
- **需求关联**：REQ-004
- **变更摘要**：画布组件：布局唯一几何权威、拖拽改父级（防环）/Tab/Enter/Delete 键体系/双击行内编辑/折叠按钮 + 浏览器 canvas 测量注入
- **自查结论**：通过（浏览器实测：Tab 加子 3 节点、行内编辑提交、折叠 1→撤销 3→重做 1、零控制台错误）

### CHG-013 ｜ 2026-11-19 11:48:04 ｜ 新增
- **文件**：`packages/ui/src/outline/OutlineView.tsx`、`packages/ui/src/inspector/Inspector.tsx`、`packages/ui/src/themes/ThemeGallery.tsx`
- **需求关联**：REQ-004
- **变更摘要**：大纲视图（Enter/Tab/Shift+Tab/上下导航/空行删除）、检查器（文本/形状/颜色/加粗/优先级/标签/备注/跟随主题回退）、主题库 6 卡片
- **自查结论**：通过（浏览器实测：大纲 Enter→画布同步；检查器随选中渲染）

### CHG-014 ｜ 2026-11-19 11:48:04 ｜ 新增
- **文件**：`apps/desktop/{package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`、`src/*}`
- **需求关联**：REQ-004
- **变更摘要**：桌面应用壳：DocumentService 直连、工具栏（撤销/重做/7 结构切换/主题/大纲/新建）、localStorage 临时适配（Phase 6 换文件系统）、beforeunload flushSave
- **自查结论**：通过（tsc exit 0；vite build 527ms；浏览器实测结构切换与主题切换后 3 节点保持）

### CHG-015 ｜ 2026-11-19 11:48:04 ｜ 修改
- **文件**：`src-tauri/tauri.conf.json`、`README.md`、`CONTRACT.md`
- **需求关联**：REQ-004
- **变更摘要**：Tauri 接线 apps/desktop（devUrl 5173 + beforeDev/Build 命令）+ 契约 §7 onDocChange 修订为 mutator 语义 + README 目录更新
- **自查结论**：通过（cargo check 1.09s；JSON 校验通过）

### CHG-016 ｜ 2026-11-19 11:48:04 ｜ 清理
- **文件**：`ui/`
- **需求关联**：REQ-004
- **变更摘要**：删除 Phase 0 静态占位前端 ui/（已被 apps/desktop 替代）
- **自查结论**：通过（全库 grep 零活引用，仅剩 WORKLOG 历史条目；cargo check 重新通过）

## Bug 记录

<!-- 每个 Bug 由脚本（add-bug）在此节末尾追加一个条目，无论是否已修复都要记录。格式示例：

  ### BUG-XXX ｜ 2026-09-01 19:50:00
  - **现象**：错误的具体表现
  - **原因**：根因分析
  - **修复方案**：采用的修复方式
  - **关联变更**：CHG-XXX
  - **状态**：已修复
-->

### BUG-001 ｜ 2026-11-18 20:03:26
- **现象**：cargo check 报 failed to fetch rsproxy.cn/crates.io-index（git fetch failed）
- **原因**：rsproxy git 索引 + git-fetch-with-cli=true 在当前网络下 git 协议拉取失败
- **修复方案**：改用 rsproxy 官方 sparse 协议（sparse+https://rsproxy.cn/index/）并置 git-fetch-with-cli=false
- **状态**：已修复

### BUG-002 ｜ 2026-11-18 20:03:26
- **现象**：cargo check 报 failed to open icon src-tauri/icons/icon.png
- **原因**：技能模板资产未携带图标文件，Tauri generate_context 默认要求该文件存在
- **修复方案**：新增可复现脚本 scripts/make_icon.py 生成 1024 占位图标，@tauri-apps/cli icon 生成全套（icns/ico/Android/iOS），bundle.icon 显式列出
- **状态**：已修复

### BUG-003 ｜ 2026-11-19 11:48:04
- **现象**：ui 包 tsc 首轮 7 处错误：MindNode 漏解构 onCommitText/onToggleCollapse、RF 拖拽事件类型应为 DOM MouseEvent/TouchEvent、根样式缺 undefined 兜底（flowModel fill/textColor）、OutlineView 未用变量、CSS side-effect 导入缺声明；另 MindMapCanvas 两次自查发现占位残行（propsRef 未接真实赋值）当轮重写
- **原因**：起草疏漏，未跑 tsc 即写入
- **修复方案**：逐项修复 + globals.d.ts 声明 *.css 模块 + 复跑 tsc 全绿（ui/desktop 均 exit 0）
- **状态**：已修复

