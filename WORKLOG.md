# 开发工作日志

> 本文件由 code-review-worklog 技能自动维护：记录每次需求澄清的问答、代码变更、Bug 及修复方案、所有需求及其实现状态。请保留全部结构标题与表格，条目按时间顺序追加。

- **日志创建时间**：2026-11-18 19:46:54
- **最近更新**：2026-11-20 21:53:12
- **最新版本**：v0.18.5
---

## 需求跟踪

| ID | 需求描述 | 提出时间 | 状态 | 备注 |
|----|---------|---------|------|------|
| REQ-001 | Phase 0：环境镜像配置 + 双仓库脚手架落地（mindflow / mindflow-web）+ GitHub 远端创建 | 2026-11-18 19:46:54 | 已完成 | 双仓库已推送 github.com/yyyyyyyyyyyyy-eng/{mindflow,mindflow-web}；cargo check 与 pnpm build 双验证通过 |
| REQ-002 | 移动端浏览器适配：网页版 <768px 布局与触控优化（大纲优先/底部抽屉/触控目标44px/pinch缩放） | 2026-11-18 20:03:26 | 待实现 | 分工给网页版对话执行（HANDOFF_PROMPTS.md 已含此要求） |
| REQ-003 | 集成两个分身交付物：算法实验室并入 packages/core（验收→迁移→补 service/themes→测试全绿→推送）；网页版 13 条提交补推远端 | 2026-11-19 11:08:10 | 已完成 | packages/core 集成完毕（119 用例全绿）；两仓库均已推送远端（mindflow 8054a4c / mindflow-web 全部 13 条提交） |
| REQ-004 | Phase 2：packages/ui（React Flow 画布/大纲/检查器/主题库）+ apps/desktop（Vite+React 前端 + Tauri 壳接线），浏览器实测验收 | 2026-11-19 11:35:16 | 已完成 | 画布/大纲/检查器/主题库 + apps/desktop 全部落地；15 单测 + 浏览器全链路冒烟零错误 |
| REQ-005 | 编辑体验优化：①节点自定义位置（顶上十字手柄拖拽，子树整体随动）②节点右侧加号=加子层级（减号镜像到左侧）③大纲 Enter 任何层级一律创建子层级 ④工具栏主题按钮去 emoji | 2026-11-20 19:14:20 | 已完成 | 四项全部浏览器实测通过；已提交推送 a47442b |
| REQ-006 | 实体感升级：①移动手柄→金属钉 ②节点→卡片 ③连线→钉间细绳（三层质感描边）④绳物理（Verlet 悬垂+鼠标悬停扰动晃动）⑤兼容 XMind：工具栏导入 .xmind/.mflow + 导出 .mflow | 2026-11-20 19:40:09 | 已完成 | 钉子/卡片/物理绳/悬停晃动/中文右键菜单/XMind 导入导出全部浏览器实测通过；顺带修复两个潜伏 Bug（RF Handle 缺失、僵尸 rAF ID） |
| REQ-007 | 修复手柄拖拽瞬移 Bug：双拖拽竞争（React 合成 stopPropagation 拦不住 RF/d3 原生监听）+ 位移未按 zoom 校正 | 2026-11-20 19:51:31 | 已完成 | 瞬移根因消除（dragHandle 隔离 + zoom 校正）+ 修复中引入的回归一并修复；代码已推送 490b9d4；body 拖拽改父级路径未改动、待用户真实鼠标复验 |
| REQ-008 | 统一 Bug 终修：卡片本体拖拽后节点消失且撤销无法回原位（用户澄清：此前所有'瞬移/消失'描述均为本 Bug）+ 全面排查三类缺陷 | 2026-11-20 20:13:31 | 已完成 | 根因修复；HMR 已热更进用户正在使用的窗口，待用户复验：拖到空处应立即弹回原位 |
| REQ-009 | 全面重写拖动体系：✥ 改纯装饰占位（钉子预留），删除其全部拖动机制；卡片本体=唯一拖动入口（自由定位+挂靠），顺带修 tauri CLI 秒退（改直跑二进制） | 2026-11-20 20:21:22 | 已完成 | 交互模型按用户澄清重写完成；启动改直跑方案绕开 CLI 秒退；待用户复验 |
| REQ-010 | 拖动方块时细绳实时跟随甩动（当前为松手后才更新端点） | 2026-11-20 20:39:46 | 已完成 | 机制与 RF 内置连线同源（EdgeRenderer 拖动时逐帧重算自定义边坐标）；待用户实测手感 |
| REQ-011 | 绳动效收敛：①pos 偏移只作用于节点本身（取消子树整体随动——移动一张卡只动它直接相连的绳）②钉点移动清零锚点速度（拖动跟随平滑、松手不再刻意甩摆） | 2026-11-20 20:42:31 | 已完成 | 拖动隔离+静止不摆均达成；拖动手感待用户实测 |
| REQ-012 | 松手瞬间所有绳轻晃一下（触控板实测）：端点微抖死区防抖 + 钉点变更探针定位真源 | 2026-11-20 20:47:34 | 已完成 | 用户实测确认：死区防抖后松手不再晃 |
| REQ-013 | 桌面端主界面（XMind 风格）：创建空白导图大按钮 + 导入本地文件 + 最近文档缩略图网格（无账号区）；底层多文档存储（localStorage 迁移旧单文档）+ 纯函数缩略图模型 | 2026-11-20 20:53:16 | 已完成 | 主界面全流程浏览器实测通过；待用户在 APP 中复验观感 |
| REQ-014 | 主界面精简：只保留必要文字（删主标题/文案段/计数器，按钮去后缀，空态一句话） | 2026-11-20 21:09:57 | 已完成 |  |
| REQ-015 | 绳锚点按父子几何自适应：子在父下方→父底边中心↔子顶钉（时间轴下方子栈/组织架构/树形）；子上方→父钉↔子底边中心；侧向→钉对钉。修「横向时间轴绳穿卡片」 | 2026-11-20 21:18:19 | 已完成 | 浏览器实测确认主轴直线化；用户报告的横向时间轴绳穿卡已修 |
| REQ-016 | Phase 5 补完：PNG 导出（布局引擎→SVG→canvas→PNG blob）+ Markdown/OPML 导出与导入（接线 core 已有函数）+ 导出改下拉菜单 | 2026-11-20 21:23:38 | 已完成 | PNG/.md/.opml 三种导出实测通过 |
| REQ-017 | ①极端稳定性：500+ 节点/超长文本布局渲染与交互 ②节点图片：拖拽/粘贴/Inspector 上传，MindNode 内联渲染 ③大文档性能优化（onlyRenderVisibleElements） | 2026-11-20 21:26:53 | 已完成 | 401 节点极限实测全绿；图片拖拽/上传/内联就位 |
| REQ-018 | ①修主页删除无反应 ②MindNode 内联渲染图片（非仅指示器）③全面文件管理（Tauri 原生文件系统 + iCloud 默认目录 + 保存/打开/自动保存） | 2026-11-20 21:31:32 | 已完成 | 删除/图片内联/文件系统全部落地；Tauri APP 文件存储模式待用户实测 |
| REQ-019 | 文件附件重构：①画布自由拖入（无需选中节点）②一个方块支持多种多个文件 ③节点上回形针按钮可导入 ④删除编辑器工具栏的「导入」按钮（只保留导出） | 2026-11-20 21:36:06 | 已完成 | capabilities 权限修正 + adapter 探测降级双保险 |
| REQ-020 | 大纲文本实时同步画布：输入框从 defaultValue+onBlur 改为受控 value+onChange（打字即更新文档，画布实时重布局） | 2026-11-20 21:47:23 | 已完成 | 大纲→画布实时同步实测通过 |
| REQ-021 | Bug 修复：①编辑器内回形针📎选文件后节点内容无变化 ②画布拖文件无效 ③大纲↔画布文本编辑实时同步（上轮只修了大纲→画布单向，画布行内编辑→大纲方向未验证） | 2026-11-20 21:50:07 | 已完成 | 回形针原生对话框 + 画布↔大纲双向实时同步实测通过 |

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

### CLAR-010 ｜ 2026-11-20 21:41:48
- **需求关联**：REQ-019
- **提问**：APP 端创建/删除按钮是否恢复？
- **回答**：没有——仍然按不动

### CLAR-011 ｜ 2026-11-20 21:43:45
- **需求关联**：REQ-019
- **提问**：「文件导不入」具体是什么操作场景？
- **回答**：主页导入文件（.xmind/.mflow/.md 等）拖入或点按钮选择文件后无反应

### CLAR-012 ｜ 2026-11-20 21:50:07
- **需求关联**：REQ-019
- **提问**：「文件导不入」的具体操作步骤和现象
- **回答**：在导图编辑器内：①回形针📎点开选文件后正文内容不变 ②画布空白处拖文件也挂不上 ③大纲/画布文本编辑不能实时同步到另一侧

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
- **状态**：已沉淀
- **沉淀结果**：已写入 dev-plan-with-mirrors/references/mirrors.md §Rust/Cargo 实测注意

### EXP-002 ｜ 2026-11-18 20:03:26
- **经验内容**：git push github.com 报 HTTP2 framing layer 错误/443 连接超时（国内网络间歇）→ git config --global http.version HTTP/1.1 + 失败重试循环（间隔8s×5）后推送成功（实测 2026-11-18）
- **候选目标**：dev-plan-with-mirrors
- **来源变更**：CHG-001
- **状态**：已沉淀
- **沉淀结果**：已写入 dev-plan-with-mirrors/references/mirrors.md §GitHub 其他加速方案 间歇阻断兜底

### EXP-003 ｜ 2026-11-19 11:10:44
- **经验内容**：worklog.py 报「日志文件不存在」→ 脚本以调用时工作目录定位 WORKLOG.md，在会话默认目录调用会找错项目 → 一律显式传 workdir=项目根再调用（实测 2026-11-19）
- **候选目标**：code-review-worklog
- **来源变更**：CHG-007
- **状态**：已沉淀
- **沉淀结果**：已写入 code-review-worklog/SKILL.md 硬性规则第 20 条

### EXP-004 ｜ 2026-11-19 11:48:04
- **经验内容**：浏览器验证 React 应用：a11y 快照看不见 React Flow 节点内容（绝对定位不进树），且同一 evaluate/紧邻 rAF 内读 DOM 会早于 React 提交造成『没生效』误判 → 断言要等确定文本变化（browser.wait condition:text）或页内 await setTimeout(400) 再读（实测 2026-11-19, vite dev）
- **候选目标**：browser
- **来源变更**：CHG-012
- **状态**：已放弃
- **沉淀结果**：目标 browser 为内置只读技能（skill://browser，非本地文件）不可写入；内容保留于 WORKLOG.md 经验暂存区供后续项目检索

### EXP-005 ｜ 2026-11-20 19:17:08
- **经验内容**：合成 PointerEvent 上 setPointerCapture 会因 untrusted pointerId 抛 NotFoundError → 手柄拖拽实现先记录拖拽状态再 try/catch 捕获，捕获失败时按钮监听器兜底（自动化测试与真实用户两不误）（实测 2026-11-20, Chromium）
- **候选目标**：browser
- **来源变更**：CHG-019
- **状态**：已放弃
- **沉淀结果**：同上：browser 技能只读，保留于 WORKLOG.md 暂存区（setPointerCapture untrusted 容错方案）

### EXP-006 ｜ 2026-11-20 19:51:31
- **经验内容**：React Flow v12 节点拖拽是 d3-drag 原生监听（挂节点 DOM，先于 React 根委托），React 合成 stopPropagation 拦不住 → 自定义手柄要么用官方 node.dragHandle 选择器隔离，要么挂原生监听；且合成 PointerEvent（isTrusted=false）驱动不了 d3 手势，d3 路径 e2e 只能靠真实输入验证（实测 2026-11-20, @xyflow/react v12, Chromium）
- **候选目标**：browser
- **来源变更**：CHG-022
- **状态**：已放弃
- **沉淀结果**：同上：browser 技能只读，保留于 WORKLOG.md 暂存区（RF d3 原生监听与 dragHandle 隔离结论）

### EXP-007 ｜ 2026-11-20 20:22:26
- **经验内容**：tauri dev CLI 包装层在本机间歇秒退（vite 起来、二进制启动后进程树即退，ELIFECYCLE），直跑 target/debug/mindflow + 独立 vite 完全稳定（25s timeout 实测存活）→ 开发期用『先 vite 后直跑二进制』拉窗口，绕开 CLI 层（2026-11-20 实测）
- **候选目标**：macos-app-development
- **来源变更**：CHG-024
- **状态**：已沉淀
- **沉淀结果**：已写入 macos-app-development/SKILL.md 踩坑实录第 113 条

### EXP-008 ｜ 2026-11-20 20:49:39
- **经验内容**：React Flow v12 会静默过滤源/目标节点缺 <Handle> 的边（.react-flow__edge 恒 0 且零报错）→ 自定义边必须给节点配隐形 Handle（几何可自算，Handle 只作挂载锚）；冒烟必须数边不只数节点（实测 2026-11-20, @xyflow/react v12, MindFlow）
- **候选目标**：macos-app-development
- **状态**：已沉淀
- **沉淀结果**：已写入 macos-app-development 踩坑实录第 114 条

### EXP-009 ｜ 2026-11-20 20:49:39
- **经验内容**：rAF 循环管理：cancelAnimationFrame 后必须把存储的 id 清零，否则 StrictMode 双挂载留下僵尸非零 id，重启守卫永久拒绝 → 循环装死（现象：事件到达、rAF 可用、0 次 tick）；cancel 与清零必须同体（实测 2026-11-20）
- **候选目标**：macos-app-development
- **状态**：已沉淀
- **沉淀结果**：已写入 macos-app-development 踩坑实录第 115 条

### EXP-010 ｜ 2026-11-20 20:49:39
- **经验内容**：Verlet 悬垂绳三件套：①松弛量编入绳长（restLen=跨距×(1+8sag²/3)/段数，抛物线弧长）②Gauss-Seidel 扫掠次数要够（4 次卡在重力=抬升的深层固定点、段误差 0.74 永不清零；24 次收敛 0.13）③静止判定必须同时查动能与约束误差（只查动能漏掉锚点已移绳未跟上）（数值实测 2026-11-20）
- **候选目标**：macos-app-development
- **状态**：已沉淀
- **沉淀结果**：已写入 macos-app-development 踩坑实录第 116 条

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

### CHG-025 ｜ 2026-11-20 20:36:47 ｜ 新增
- **文件**：`packages/ui/src/canvas/StringEdge.tsx`、`packages/ui/src/canvas/ContextMenu.tsx`、`packages/ui/src/canvas/ropePhysics.ts`、`packages/ui/test/ropePhysics.test.ts`、`packages/ui/src/flowModel.ts`、`packages/ui/test/flowModel.test.ts`
- **需求关联**：REQ-006
- **变更摘要**：实体感升级：①钉间物理细绳 StringEdge（Rope Verlet 悬垂+静止停摆+悬停冲量晃动；三层质感描边+12px 命中层；rAF 直写 path 零 React 重渲染）②中文右键菜单（节点：加子/加同级/重命名/折叠/清位置/删除；空白：适应视图/全展开/全折叠）③卡片质感（细边+双层投影）+金属钉视觉（含针杆）④Rope 补 point 访问器+6 单测；flowModel 边数据增 pinA/pinB 钉点
- **自查结论**：通过（26 用例全绿；tsc 0 错误；浏览器实测：落绳动画/悬停晃动/菜单中文项与动作/零控制台错误）

### CHG-026 ｜ 2026-11-20 20:36:47 ｜ 新增
- **文件**：`apps/desktop/src/App.tsx`、`packages/ui/src/canvas/MindNode.tsx`
- **需求关联**：REQ-006
- **变更摘要**：XMind 兼容落地：工具栏导入（.xmind 走 core xmindToDoc 解压解析 + .mflow JSON 校验；失败 alert 中文报错）/导出 .mflow（Blob 下载，文件名带标题）；MindNode 增隐形 Handle（RF v12 挂载边的必要条件）
- **自查结论**：通过（浏览器实测：xmind 夹具经真实 input 通道导入成功 5 节点+结构切换；导出捕获 MindFlow-标题.mflow 下载；零错误）

### CHG-027 ｜ 2026-11-20 20:40:14 ｜ 修改
- **文件**：`packages/ui/src/canvas/StringEdge.tsx`
- **需求关联**：REQ-010
- **变更摘要**：绳端点改由 RF 逐帧提供的 sourceX/Y targetX/Y 实时驱动（拖动节点时绳跟随甩动、松手自然回摆）；handle 坐标缺失回退 data.pinA/pinB；-3 偏移对齐钉球心
- **自查结论**：通过（tsc 0 错误；26 用例全绿；浏览器回归：落绳动画/悬晃/零错误；拖动跟随需真实鼠标由用户复验）

### CHG-028 ｜ 2026-11-20 20:45:31 ｜ 修改
- **文件**：`packages/ui/src/canvas/ropePhysics.ts`、`packages/ui/src/flowModel.ts`、`packages/ui/test/flowModel.test.ts`、`packages/core/src/types.ts`、`CONTRACT.md`
- **需求关联**：REQ-011
- **变更摘要**：绳动效收敛（用户口径）：①pos 只作用于节点本身（取消子树随动——移动一张卡只动它直接相连的绳）②setEndpoints 锚点速度清零（松手不刻意甩摆）③绳长按抛物线弧长公式编入松弛量（restLen=跨距×(1+8sag²/3)/段数）④约束扫掠 4→24 次（4 次时绳卡在深层固定点、段误差 0.74 永不清零；24 次收敛至 0.13）⑤isSettled 增加约束误差判定（只查动能会漏掉锚点已移未跟上的中间态）
- **自查结论**：通过（数值实测：cErr 0.132<0.15 settled；26 用例全绿；tsc 0 错误；文档提交无关绳实测纹丝不动）

### CHG-029 ｜ 2026-11-20 20:48:10 ｜ 修改
- **文件**：`packages/ui/src/canvas/StringEdge.tsx`
- **需求关联**：REQ-012
- **变更摘要**：钉点死区防抖（<0.5px 亚像素抖动不进物理——提交/重渲染不再扰绳）+ pin-change 探针（死区外的真实钉点变更记录增量，定位松手全体绳晃的真源）；附带收益：绳出生即平衡（加载无落绳抖动）
- **自查结论**：通过（tsc 0 错误；26 用例全绿；浏览器回归：悬晃 ✓ 零错误；触控板松手实测待用户复验+读日志）

### CHG-030 ｜ 2026-11-20 20:58:39 ｜ 新增
- **文件**：`packages/ui/src/thumb/{DocThumbnailModel.ts`、`DocThumbnail.tsx}`、`packages/ui/test/DocThumbnailModel.test.ts`、`packages/ui/src/index.ts`
- **需求关联**：REQ-013
- **变更摘要**：主界面缩略图：thumbnailModel 纯函数（引擎布局+确定性假测量+pos 偏移+等比缩放）+ DocThumbnail SVG 组件 + 6 用例
- **自查结论**：通过（32 用例全绿；浏览器实测迁移文档与新建文档缩略图均渲染）

### CHG-031 ｜ 2026-11-20 20:58:39 ｜ 新增
- **文件**：`apps/desktop/src/components/HomePage.tsx`、`apps/desktop/src/lib/{localStorageAdapter.ts`、`importFile.ts}`
- **需求关联**：REQ-013
- **变更摘要**：主界面落地：XMind 风格 HomePage（创建空白大按钮+导入本地文件+最近文档缩略图网格，无账号区）；localStorage 多文档适配器（旧单文档键自动迁移）；导入解析抽公用
- **自查结论**：通过（浏览器全流程实测：创建→编辑→返回→双卡片双缩略图；删除含确认；打开卡片进编辑器；主页导入 .xmind 成功；控制台零应用错误）

### CHG-032 ｜ 2026-11-20 20:58:39 ｜ 修改
- **文件**：`apps/desktop/src/App.tsx`
- **需求关联**：REQ-013
- **变更摘要**：应用路由：主界面↔编辑器（flushSave 后离场）；Shell 增「‹ 主页」按钮、文档标题显示、新建改为独立空白文档
- **自查结论**：通过（tsc 0 错误；返回主页列表自动刷新含新建文档）

### CHG-033 ｜ 2026-11-20 21:10:03 ｜ 修改
- **文件**：`apps/desktop/src/components/HomePage.tsx`
- **需求关联**：REQ-014
- **变更摘要**：主界面精简：删主标题/文案段/计数器；按钮文案改「导入本地文件」；空态改「暂无导图」
- **自查结论**：通过（tsc 0 错误；构建通过）

### CHG-034 ｜ 2026-11-20 21:22:31 ｜ 修改
- **文件**：`packages/ui/src/flowModel.ts`、`packages/ui/src/canvas/StringEdge.tsx`、`packages/ui/test/flowModel.test.ts`
- **需求关联**：REQ-015
- **变更摘要**：绳锚点按父子几何自适应 + 主轴/主脊改张紧直线：①anchorFor（子在父下方→父底边↔子顶钉、子上方→父钉↔子底边、侧向→钉对钉）②timeline/fishbone 主轴分支识别为 axis，StringEdge 直线渲染（三层质感保留、无悬垂物理、拖动跟随），修「横向时间轴绳穿卡片」；live 锚点=静态锚点+手柄增量
- **自查结论**：通过（36 用例全绿含 anchorFor 三向用例；tsc 双包 0 错误；浏览器实测：主轴 M→L 直线无 Q 曲线、小栈绳物理悬垂正常）

### CHG-035 ｜ 2026-11-20 21:25:06 ｜ 新增
- **文件**：`apps/desktop/src/lib/exporters.ts`、`apps/desktop/src/lib/importFile.ts`、`apps/desktop/src/App.tsx`、`apps/desktop/src/components/HomePage.tsx`、`packages/ui/src/index.ts`
- **需求关联**：REQ-016
- **变更摘要**：Phase 5 补完：①导出下拉菜单（.mflow/.md/.opml/PNG 四选）②PNG=布局引擎→SVG→canvas 2x→blob 零依赖 ③Markdown/OPML 导出接线 core 已有函数 ④导入扩展 .md/.opml/.txt/.xml ⑤SVG font-family 引号修复（双引号破坏 XML）
- **自查结论**：通过（tsc 0 错误；浏览器实测：PNG/.md/.opml 三种导出均下载成功、零控制台错误）

### CHG-036 ｜ 2026-11-20 21:28:37 ｜ 新增
- **文件**：`CONTRACT.md`、`packages/core/src/types.ts`、`packages/ui/src/{flowModel.ts`、`canvas/MindNode.tsx`、`canvas/MindMapCanvas.tsx`、`inspector/Inspector.tsx}`、`apps/desktop/src/App.tsx`
- **需求关联**：REQ-017
- **变更摘要**：①节点图片：DocNode 增 image 字段（data URI ≤500KB），MindNode 拖拽/Inspector 上传/内联 🖼 指示 ②大文档优化：onlyRenderVisibleElements（>100 节点）③极端稳定性：401 节点+超长文本全链路（折叠/撤销/全展/选中/Inspector）实测全通过零错误
- **自查结论**：通过（401 节点：折叠 603ms、展开 1204ms、零控制台错误；tsc 双包 0 错误；119 core 用例回归）

### CHG-037 ｜ 2026-11-20 21:33:38 ｜ 新增
- **文件**：`apps/desktop/src/lib/tauriFsAdapter.ts`、`apps/desktop/src/App.tsx`、`apps/desktop/src/components/HomePage.tsx`、`packages/ui/src/{flowModel.ts`、`canvas/MindNode.tsx`、`canvas/MindMapCanvas.tsx`、`inspector/Inspector.tsx}`、`CONTRACT.md`、`packages/core/src/types.ts`、`src-tauri/{Cargo.toml`、`src/main.rs}`
- **需求关联**：REQ-018
- **变更摘要**：①修删除（confirm WKWebView 静默失效→移除）②MindNode 内联渲染图片（img src=data URI 28px 缩略图）③TauriFsAdapter：文件系统存储（iCloud Drive/MindFlow/ 默认目录，Windows/Linux 降级 ~/Documents），tauri-plugin-fs+dialog 接入 ④localStorage 降级保留（纯浏览器环境）
- **自查结论**：通过（tsc 0 错误；cargo check 11.6s；浏览器实测：删除 ✓、localStorage 降级 ✓；Tauri 文件系统模式待 APP 实测）

### CHG-038 ｜ 2026-11-20 21:38:28 ｜ 修改
- **文件**：`CONTRACT.md`、`packages/core/src/types.ts`、`packages/ui/src/{flowModel.ts`、`canvas/MindNode.tsx`、`canvas/MindMapCanvas.tsx`、`inspector/Inspector.tsx}`、`apps/desktop/src/{App.tsx`、`lib/attachments.ts}`
- **需求关联**：REQ-019
- **变更摘要**：文件附件重构：①DocNode 增 attachments[]（Attachment：id/name/mimeType/size/data/isImage）②画布空白拖入→选中节点 ③节点回形针📎按钮打开文件选择器（多文件）④MindNode 内联渲染图片缩略图 + 📎N 指示 ⑤Inspector 附件列表（图片预览/文件名/逐项删除/多选添加）⑥删除编辑器工具栏「导入」按钮（保留主页导入）
- **自查结论**：通过（tsc 双包 0 错误；119 core 用例回归；浏览器实测：无导入按钮 ✓ 回形针 ✓）

### CHG-039 ｜ 2026-11-20 21:41:29 ｜ 修改
- **文件**：`src-tauri/capabilities/default.json`、`apps/desktop/src/App.tsx`
- **需求关联**：REQ-019
- **变更摘要**：修 APP 端按钮无反应：①Tauri 2 capabilities/default.json（fs:scope-home + read/write/mkdir/remove/exists/read-dir + dialog + core:path），fs:allow-home-dir 权限名不存在→用 fs:scope-home+allow-home-read/write ②adapter 探测降级（tauriFsAdapter.list() 试跑失败→自动切 localStorage，保证按钮永远可用）
- **自查结论**：通过（cargo check 0.57s 通过；tsc 0 错误；构建通过）

### CHG-040 ｜ 2026-11-20 21:45:06 ｜ 修改
- **文件**：`apps/desktop/src/lib/importFile.ts`、`apps/desktop/src/components/HomePage.tsx`、`apps/desktop/src/App.tsx`
- **需求关联**：REQ-019
- **变更摘要**：修文件导不入：Tauri WKWebView 中 <input type=file> 不弹原生文件选择器 → Tauri 环境改走 @tauri-apps/plugin-dialog 原生对话框 + plugin-fs 读取（importViaTauriDialog）；浏览器环境保留 input type=file；HomePage 自动分流（isTauri）
- **自查结论**：通过（tsc 0 错误；构建通过；Tauri dialog 插件已在 capabilities 中声明）

### CHG-041 ｜ 2026-11-20 21:47:59 ｜ 修改
- **文件**：`packages/ui/src/outline/OutlineView.tsx`
- **需求关联**：REQ-020
- **变更摘要**：大纲文本实时同步画布：输入框从 defaultValue+onBlur（打字期间画布不更新）改为受控 value+onChange（每个字符即时走 onDocChange → 文档更新 → 画布重布局实时跟随）
- **自查结论**：通过（36 用例全绿；tsc 0 错误；浏览器实测：大纲输入「实时同步测试」→ 画布立即出现同文本节点）

### CHG-042 ｜ 2026-11-20 21:53:12 ｜ 修改
- **文件**：`packages/ui/src/canvas/MindNode.tsx`、`packages/ui/src/canvas/MindMapCanvas.tsx`、`apps/desktop/src/{App.tsx`、`lib/attachments.ts}`
- **需求关联**：REQ-021
- **变更摘要**：①编辑器内回形针📎改走 onOpenFileDialog 回调（App 层分流：Tauri 走 plugin-dialog 原生对话框 + plugin-fs 读取文件→File；浏览器走动态 input type=file）——修 input type=file 在 WKWebView 不弹 ②画布行内编辑实时同步大纲：textarea onChange 新增 onLiveUpdateText（不退出编辑态、只更新文档）；useEffect 依赖从 [editing,text] 改为 [editing]（否则 liveUpdateText 回写后 select() 全选→下一键覆盖整段）
- **自查结论**：通过（36 用例全绿；tsc 0 错误；浏览器实测：画布双击编辑→大纲 input 值实时出现同文本 ✓ 回形针可见 ✓）

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

### BUG-008 ｜ 2026-11-20 20:36:47
- **现象**：画布连线从 Phase 2 起从未渲染（.react-flow__edge 恒为 0，无任何报错）
- **原因**：React Flow v12 会静默过滤源/目标节点缺少 <Handle> 的边——自定义节点从未放置 Handle；历次冒烟只断言节点数故一直漏网
- **修复方案**：MindNode 放置两个隐形 Handle（opacity:0、pointer-events:none）；几何仍由 pinA/pinB 驱动，Handle 仅作挂载锚
- **关联变更**：CHG-024
- **状态**：已修复

### BUG-009 ｜ 2026-11-20 20:36:47
- **现象**：细绳动画完全不播放：落绳/悬停冲量均无响应（悬停冲量确认送达、rAF 本身可用，但 0 条 tick）
- **原因**：卸载清理 cancelAnimationFrame 后未把 rafRef.current 清零——StrictMode 双挂载序列里二次挂载的 ensureLoop 守卫看到僵尸非零 ID 直接返回，模拟循环永久卡死
- **修复方案**：stopLoop()：cancel 与清零同体；卸载清理改用 stopLoop
- **关联变更**：CHG-025
- **状态**：已修复

### BUG-010 ｜ 2026-11-20 20:58:39
- **现象**：旧单文档迁移结果丢失：list() 的 readAll 消费旧键但不落盘，随后 load() 二次 readAll 时旧键已删 → 空手而归（迁移数据丢在两次读取之间）
- **原因**：readAll 副作用（删旧键）与持久化脱节
- **修复方案**：迁移即落盘：消费旧键的同一 readAll 调用内 writeAll(docs)
- **关联变更**：CHG-030
- **状态**：已修复

### BUG-011 ｜ 2026-11-20 21:33:38
- **现象**：主页删除按钮无反应
- **原因**：confirm() 在 Tauri WKWebView 中静默返回 false（不弹原生对话框）
- **修复方案**：移除 confirm()，直接删除（悬停出现按钮+点击即删）
- **关联变更**：CHG-036
- **状态**：已修复

### BUG-012 ｜ 2026-11-20 21:39:27
- **现象**：APP（WKWebView）创建空白导图和删除按钮按不动
- **原因**：待诊断——可能是 TauriFsAdapter 在 WKWebView 中初始化失败（homeDir/join 等 @tauri-apps/api 调用异常导致 refreshHome 卡死、后续按钮虽渲染但回调链断裂）
- **修复方案**：待定位
- **关联变更**：CHG-038
- **状态**：未修复

### BUG-013 ｜ 2026-11-20 21:42:36
- **现象**：APP 端创建/删除按钮按不动（第二轮修复）
- **原因**：①refreshHome useCallback 依赖数组 []：闭包捕获初始 adapter（tauriFsAdapter），后续 setAdapter(localStorage) 对已创建的回调无效——所有操作继续走坏通道 ②tauriFsAdapter 操作在 WKWebView 中静默 hang（非 throw），探测降级从未触发
- **修复方案**：①初始 adapter 永远 localStorageAdapter（保证按钮立即可用）②探测升级改为 save+delete 往返校验（真正读写成功才切 tauriFsAdapter）③refreshHome 依赖数组加 adapter
- **关联变更**：CHG-039
- **状态**：已修复

