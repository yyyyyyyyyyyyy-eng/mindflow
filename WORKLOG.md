# 开发工作日志

> 本文件由 code-review-worklog 技能自动维护：记录每次需求澄清的问答、代码变更、Bug 及修复方案、所有需求及其实现状态。请保留全部结构标题与表格，条目按时间顺序追加。

- **日志创建时间**：2026-11-18 19:46:54
- **最近更新**：2026-11-20 20:22:26
- **最新版本**：v0.11.6
---

## 需求跟踪

| ID | 需求描述 | 提出时间 | 状态 | 备注 |
|----|---------|---------|------|------|
| REQ-001 | Phase 0：环境镜像配置 + 双仓库脚手架落地（mindflow / mindflow-web）+ GitHub 远端创建 | 2026-11-18 19:46:54 | 已完成 | 双仓库已推送 github.com/yyyyyyyyyyyyy-eng/{mindflow,mindflow-web}；cargo check 与 pnpm build 双验证通过 |
| REQ-002 | 移动端浏览器适配：网页版 <768px 布局与触控优化（大纲优先/底部抽屉/触控目标44px/pinch缩放） | 2026-11-18 20:03:26 | 待实现 | 分工给网页版对话执行（HANDOFF_PROMPTS.md 已含此要求） |
| REQ-003 | 集成两个分身交付物：算法实验室并入 packages/core（验收→迁移→补 service/themes→测试全绿→推送）；网页版 13 条提交补推远端 | 2026-11-19 11:08:10 | 已完成 | packages/core 集成完毕（119 用例全绿）；两仓库均已推送远端（mindflow 8054a4c / mindflow-web 全部 13 条提交） |
| REQ-004 | Phase 2：packages/ui（React Flow 画布/大纲/检查器/主题库）+ apps/desktop（Vite+React 前端 + Tauri 壳接线），浏览器实测验收 | 2026-11-19 11:35:16 | 已完成 | 画布/大纲/检查器/主题库 + apps/desktop 全部落地；15 单测 + 浏览器全链路冒烟零错误 |
| REQ-005 | 编辑体验优化：①节点自定义位置（顶上十字手柄拖拽，子树整体随动）②节点右侧加号=加子层级（减号镜像到左侧）③大纲 Enter 任何层级一律创建子层级 ④工具栏主题按钮去 emoji | 2026-11-20 19:14:20 | 已完成 | 四项全部浏览器实测通过；已提交推送 a47442b |
| REQ-006 | 实体感升级：①移动手柄→金属钉 ②节点→卡片 ③连线→钉间细绳（三层质感描边）④绳物理（Verlet 悬垂+鼠标悬停扰动晃动）⑤兼容 XMind：工具栏导入 .xmind/.mflow + 导出 .mflow | 2026-11-20 19:40:09 | 进行中 |  |
| REQ-007 | 修复手柄拖拽瞬移 Bug：双拖拽竞争（React 合成 stopPropagation 拦不住 RF/d3 原生监听）+ 位移未按 zoom 校正 | 2026-11-20 19:51:31 | 已完成 | 瞬移根因消除（dragHandle 隔离 + zoom 校正）+ 修复中引入的回归一并修复；代码已推送 490b9d4；body 拖拽改父级路径未改动、待用户真实鼠标复验 |
| REQ-008 | 统一 Bug 终修：卡片本体拖拽后节点消失且撤销无法回原位（用户澄清：此前所有'瞬移/消失'描述均为本 Bug）+ 全面排查三类缺陷 | 2026-11-20 20:13:31 | 已完成 | 根因修复；HMR 已热更进用户正在使用的窗口，待用户复验：拖到空处应立即弹回原位 |
| REQ-009 | 全面重写拖动体系：✥ 改纯装饰占位（钉子预留），删除其全部拖动机制；卡片本体=唯一拖动入口（自由定位+挂靠），顺带修 tauri CLI 秒退（改直跑二进制） | 2026-11-20 20:21:22 | 已完成 | 交互模型按用户澄清重写完成；启动改直跑方案绕开 CLI 秒退；待用户复验 |

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

### CLAR-007 ｜ 2026-11-20 19:55:49
- **需求关联**：REQ-007
- **提问**：APP 版瞬移是否仍在？用什么窗口测的？
- **回答**：旧窗口（HMR 热更新残留）中拖手柄仍瞬移——HMR 不重建 RF 节点对象，dragHandle 未进入旧会话的节点状态；已拉全新进程窗口待复验

### CLAR-008 ｜ 2026-11-20 20:13:31
- **需求关联**：REQ-008
- **提问**：『瞬移』和『消失』是什么关系？
- **回答**：是同一个 bug：一拖动方块就消失，撤销也回不到原位（用户明确澄清）

### CLAR-009 ｜ 2026-11-20 20:21:22
- **需求关联**：REQ-009
- **提问**：顶上按钮的作用是什么？
- **回答**：仅是后续钉子装饰的预留位，不承担任何拖动功能；所有拖动全部由卡片本体完成（拖空白=就地定位、拖节点上=挂靠），要求全面重写

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

### EXP-005 ｜ 2026-11-20 19:17:08
- **经验内容**：合成 PointerEvent 上 setPointerCapture 会因 untrusted pointerId 抛 NotFoundError → 手柄拖拽实现先记录拖拽状态再 try/catch 捕获，捕获失败时按钮监听器兜底（自动化测试与真实用户两不误）（实测 2026-11-20, Chromium）
- **候选目标**：browser
- **来源变更**：CHG-019
- **状态**：待确认

### EXP-006 ｜ 2026-11-20 19:51:31
- **经验内容**：React Flow v12 节点拖拽是 d3-drag 原生监听（挂节点 DOM，先于 React 根委托），React 合成 stopPropagation 拦不住 → 自定义手柄要么用官方 node.dragHandle 选择器隔离，要么挂原生监听；且合成 PointerEvent（isTrusted=false）驱动不了 d3 手势，d3 路径 e2e 只能靠真实输入验证（实测 2026-11-20, @xyflow/react v12, Chromium）
- **候选目标**：browser
- **来源变更**：CHG-022
- **状态**：待确认

### EXP-007 ｜ 2026-11-20 20:22:26
- **经验内容**：tauri dev CLI 包装层在本机间歇秒退（vite 起来、二进制启动后进程树即退，ELIFECYCLE），直跑 target/debug/mindflow + 独立 vite 完全稳定（25s timeout 实测存活）→ 开发期用『先 vite 后直跑二进制』拉窗口，绕开 CLI 层（2026-11-20 实测）
- **候选目标**：macos-app-development
- **来源变更**：CHG-024
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

### CHG-017 ｜ 2026-11-20 19:17:08 ｜ 修改
- **文件**：`CONTRACT.md`、`packages/core/src/types.ts`
- **需求关联**：REQ-005
- **变更摘要**：文档模型增补 pos?: PosOffset（自定义位置：相对布局原位偏移，子树整体随动）——契约 §2 与 core 类型同步修订
- **自查结论**：通过（core tsc exit 0；core 119 用例回归不受影响）

### CHG-018 ｜ 2026-11-20 19:17:08 ｜ 新增
- **文件**：`packages/ui/src/flowModel.ts`、`packages/ui/test/flowModel.test.ts`
- **需求关联**：REQ-005
- **变更摘要**：applyPosOffsets 纯函数：累计偏移子树随动、未动连线保留引擎曲线/动过连线锚定贝塞尔重生成、bounds 重算、无 pos 快速路径；5 个新用例（共 20）
- **自查结论**：通过（vitest 20 全绿；tsc exit 0）

### CHG-019 ｜ 2026-11-20 19:17:08 ｜ 修改
- **文件**：`packages/ui/src/canvas/MindNode.tsx`、`packages/ui/src/canvas/MindMapCanvas.tsx`
- **需求关联**：REQ-005
- **变更摘要**：节点三控件：− 折叠钮移到左侧、＋ 加子层级钮在右侧（互为镜像）、顶部 ✥ 十字手柄拖拽=自定义位置（PointerCapture 容错，预览走本地投影、松手一次提交保撤销粒度）
- **自查结论**：通过（浏览器实测：拖拽预览 +60/+40 → 提交保持 → 撤销精确回原位 → 检查器出现清除按钮；折叠 10→1→10；零控制台错误）

### CHG-020 ｜ 2026-11-20 19:17:08 ｜ 修改
- **文件**：`packages/ui/src/outline/OutlineView.tsx`
- **需求关联**：REQ-005
- **变更摘要**：大纲 Enter 语义统一：任何层级一律创建子层级（原二级起创建同级的不一致已消除；同级需求经 Enter+Shift+Tab 达成）
- **自查结论**：通过（浏览器实测：2 级行 Enter → 新行缩进 44→66 即 3 级子行）

### CHG-021 ｜ 2026-11-20 19:17:08 ｜ 修改
- **文件**：`packages/ui/src/inspector/Inspector.tsx`、`apps/desktop/src/App.tsx`
- **需求关联**：REQ-005
- **变更摘要**：检查器增「清除自定义位置」按钮（含当前偏移量显示）；工具栏主题按钮去调色盘 emoji
- **自查结论**：通过（浏览器实测：拖拽重做并选中后按钮出现；header 文案=「主题」）

### CHG-022 ｜ 2026-11-20 19:51:31 ｜ 修改
- **文件**：`packages/ui/src/flowModel.ts`、`packages/ui/src/canvas/MindNode.tsx`、`packages/ui/test/flowModel.test.ts`
- **需求关联**：REQ-007
- **变更摘要**：手柄拖拽瞬移修复：flowModel 节点声明 dragHandle（d3 拖拽只从 .mf-node-body 发起）+ MindNode 位移按 viewport zoom 校正 + onHandleUp 先算后清 + 测试断言 dragHandle
- **自查结论**：通过（zoom=0.15/0.394 两组实测：指针 96px→节点精确 96/zoom flow px、6 采样无抖动、撤销恢复 380.394/40、重做恢复、控制台零错误）

### CHG-023 ｜ 2026-11-20 20:13:31 ｜ 修改
- **文件**：`packages/ui/src/canvas/MindMapCanvas.tsx`
- **需求关联**：REQ-008
- **变更摘要**：resetProjection 重建引用复位（根治 bail-out 消失+撤销失效）+ reparent 查找顺序防御 + rf-dragstop 探针增强（记录 reparent 目标）
- **自查结论**：通过（tsc 双包 0 错误；ui 20 用例全绿；vite build 535ms；三类缺陷全库扫描：bail-out 类 3 处调用点仅 1 处问题已修、splice 顺序 8 处核查仅 reparent 有隐患已修、撤销栈 core 119 用例回归通过）

### CHG-024 ｜ 2026-11-20 20:22:26 ｜ 修改
- **文件**：`packages/ui/src/canvas/MindNode.tsx`、`packages/ui/src/canvas/MindMapCanvas.tsx`
- **需求关联**：REQ-009
- **变更摘要**：拖动体系全面重写（用户澄清交互模型）：✥ 改纯装饰占位（钉子+细绳预留，pointer-events:none）删除全部拖动机制（getBasePos/onPosPreview/onPosCommit/posDrag 等零引用清除）；卡片本体=唯一拖动入口（拖空白=就地定位提交 pos，拖节点=挂靠，先查目标再摘源）；本体 cursor:grab；探针保留（pd/rf-dragstart/rf-dragstop/free-commit/undo）
- **自查结论**：通过（死代码全库 grep 零引用；ui/desktop tsc 0 错误；ui 20 用例全绿；vite build 518ms）

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

### BUG-004 ｜ 2026-11-20 19:51:31
- **现象**：按住顶上手柄拖动到中途节点瞬移到远处（用户实测报告）
- **原因**：①React Flow v12 节点拖拽由 d3 原生监听驱动（挂节点 DOM，先于 React 根委托），React 合成事件 stopPropagation 对其无效 → 同一手势双拖拽竞争互写节点位置 ②d3 位移按 屏幕距离/zoom 计算，fitView 后 zoom≈0.3~0.6 时位移被放大 1/zoom 倍，节点视觉上被甩飞
- **修复方案**：①节点声明 dragHandle:'.mf-node-body'（RF 官方机制隔离）②手柄位移除以 getViewport().zoom，任何缩放 1:1 跟随
- **关联变更**：CHG-019
- **状态**：已修复

### BUG-005 ｜ 2026-11-20 19:51:31
- **现象**：修复过程中引入回归：onHandleUp 先置 posDrag.current=null 再经 dragPosFrom 取值 → TypeError(null.base)，提交静默不入文档
- **原因**：重构 dragPosFrom 辅助函数时改变了取值与置空的顺序
- **修复方案**：先 const pos = dragPosFrom(e) 再清空状态；浏览器复测 commitReallyInDoc=true + 零控制台错误
- **状态**：已修复

### BUG-006 ｜ 2026-11-20 20:13:31
- **现象**：卡片本体拖拽松手后节点消失（视觉上飞出视野），且撤销无效
- **原因**：onNodeDragStop 未命中目标时 setNodes(graphRef.current.nodes) 传入同一数组引用 → React Object.is bail-out 跳过渲染 → 节点滞留 d3 拖放点；d3 位移按屏幕距离/zoom 放大，小 zoom 下节点飞出视野=消失；文档未变更 → 撤销栈无该步 → 撤销必然无效
- **修复方案**：resetProjection()：map 重建全新节点/位置引用再 setNodes/setEdges；复位即时可见，无需撤销
- **关联变更**：CHG-022
- **状态**：已修复

### BUG-007 ｜ 2026-11-20 20:13:31
- **现象**：reparent 变更器先 splice 摘除源节点再查找目标，目标查找失败时节点从文档永久丢失（潜伏缺陷，全面排查发现）
- **原因**：变更器内查找顺序错误：loc 先删、to 后查，to 为 null 时 return 已无法挽回
- **修复方案**：防御顺序反转：先 findNode(target) 确认存在，再摘除源节点
- **关联变更**：CHG-022
- **状态**：已修复

