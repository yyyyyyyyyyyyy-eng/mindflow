# MindFlow 双仓库协作契约 v0.1

> **权威源**：`mindflow` 桌面仓库（本文件所在仓库）。
> 网页版仓库（`mindflow-web`）与算法实验室（`mindflow-algo-lab`，独立目录）**只依赖本契约的类型与接口签名**，不得复制引擎实现，不得擅改本文件定义。
> 与契约冲突或有疑问 → 写入交付摘要，由主对话统一裁决后再改契约。

---

## 1. 包与代码约定

| 项 | 约定 |
|---|---|
| 引擎包 | `mindflow-core`（纯 TS、零 DOM 依赖），桌面仓库 `packages/core` 为实现源 |
| UI 组件包 | `mindflow-ui`（React），桌面仓库 `packages/ui` 为实现源 |
| 语言规范 | TypeScript `strict`、ESM、2 空格缩进、禁用 `any`（确需处注释说明） |
| 注释 | 英文标识符 + **中文注释** |
| 测试 | vitest；布局/序列化用快照 + 往返全等断言 |
| id 生成 | 注入式 `idGen?: () => string`（默认 nanoid；测试用计数器保证确定性） |

---

## 2. 文档模型（`.mflow` 格式 v1）

文件 = 下述 `MindDoc` 的 `JSON.stringify(doc, null, 2)`，扩展名 `.mflow`。

```ts
export type NodeId = string;

export type StructureType =
  | 'logic-right'   // 逻辑图（右向）
  | 'mindmap'       // 思维导图（左右发散）
  | 'org-chart'     // 组织架构（上下）
  | 'fishbone'      // 鱼骨图
  | 'timeline-h'    // 时间轴（横向）
  | 'timeline-v'    // 时间轴（纵向）
  | 'tree';         // 树形图（向下直角连线）

export interface NodeStyle {
  fill?: string;                       // '#RRGGBB[AA]'
  textColor?: string;
  border?: { color?: string; width?: number };
  shape?: 'rounded-rect' | 'rect' | 'ellipse' | 'underline' | 'diamond';
  fontWeight?: 'normal' | 'bold';
  fontSize?: number;
}

export interface DocNode {
  id: NodeId;
  text: string;                        // 节点文字，可含 \n（不自动换行，宽度=最长行）
  note?: string;                       // 备注
  children: DocNode[];                 // 嵌套树；所有更新走不可变（Immer 或手写结构共享）
  collapsed?: boolean;                 // true 时布局/渲染跳过整个子树
  style?: NodeStyle;                   // 缺省继承主题
  icons?: string[];                    // 图标 id，如 'priority-1' 'star'
  labels?: string[];                   // 文字标签
}

export interface MindDoc {
  formatVersion: 1;
  id: string;                          // 文档 id
  title: string;                       // 列表页显示名（= root.text 镜像，保存时同步）
  structure: StructureType;
  theme: string;                       // 主题 id，见 §5
  root: DocNode;                       // 根节点 = 中心主题
  createdAt: string;                   // ISO 8601
  updatedAt: string;
}

export interface DocMeta {
  id: string; title: string; updatedAt: string; nodeCount: number;
}
```

**新建空文档**：`title` 与 `root.text` = `"中心主题"`，structure = `'mindmap'`，theme = `'classic'`。

---

## 3. 布局引擎接口（算法实验室主战场）

```ts
export interface Rect { x: number; y: number; width: number; height: number; }

export interface BranchPath {
  fromId: NodeId;        // 父节点
  toId: NodeId;          // 子节点
  d: string;             // SVG path 'd' 属性（贝塞尔/折线），全局画布坐标
}

export interface LayoutResult {
  nodeRects: Map<NodeId, Rect>;        // 仅「可见」节点（collapsed 子树不出现）
  branches: BranchPath[];             // 仅可见连线
  bounds: { width: number; height: number };  // 内容包围盒，供 fitView
}

export interface TextSize { width: number; height: number; }  // height 已含行数 × 行高

export interface LayoutOptions {
  nodePadding: number;   // 文本→边框内边距，默认 12
  levelGap: number;     // 层级间距（水平或径向），默认 60
  siblingGap: number;   // 同层兄弟间距，默认 16
  fontFace: string;
  fontSize: number;     // 默认 14
  boldRatio: number;    // 粗体宽度系数，默认 1.05
  lineHeight: number;   // 行高系数，默认 1.4
  measureText: (text: string, bold: boolean) => TextSize;  // 注入实现，引擎零 DOM
}

export type LayoutEngine = (root: DocNode, opts: LayoutOptions) => LayoutResult;

// 统一入口（算法实验室 src/layout/index.ts）
export function layout(root: DocNode, structure: StructureType, opts: LayoutOptions): LayoutResult;
```

**各结构布局规则**（确定性输出，禁 `Math.random` / `Date.now`）：

| 结构 | 规则 |
|---|---|
| `logic-right` | 经典 tidy tree（Reingold–Tilford + 左右轮廓合并），根在左，子树向右 |
| `mindmap` | 根居中；子树按「左右两侧总高度差最小」分配（平局归右侧），每侧内部同 `logic-right` |
| `org-chart` | 同 tidy tree 但方向自上而下，连线垂直居中下接 |
| `fishbone` | 根（主题框）在左；主脊水平向右贯穿画布；一级子节点为 60° 斜肋、沿脊交替上下；二级及以下沿各肋线性排布 |
| `timeline-h` | 深度 1 节点沿水平主轴等距排布（间距=levelGap）；深度 ≥2 在其父节点上方/下方交替成纵向小栈 |
| `timeline-v` | 同上旋转 90°（主轴垂直） |
| `tree` | 同 `org-chart`，但连线为直角折线 |

**性能要求**：1000 节点单次 `layout()` < 16ms（附 bench 脚本与真实输出）。

---

## 4. 序列化接口（算法实验室）

```ts
// Markdown 双向（H1 = 根；H2..H6 递降；深度 >6 转无序列表续接）
export function docToMarkdown(doc: MindDoc): string;
export function markdownToDoc(md: string, idGen?: () => NodeId): MindDoc;

// OPML 双向
export function docToOpml(doc: MindDoc): string;
export function opmlToDoc(opmlXml: string, idGen?: () => NodeId): MindDoc;

// XMind 导入（.xmind = zip 包含 content.json；仅新格式，旧 XML 格式抛错）
export class NotSupportedXmindError extends Error {}
export function xmindToDoc(buf: ArrayBuffer, idGen?: () => NodeId): Promise<MindDoc>;
```

**Markdown 元数据无损约定**：导出时在节点行尾追加 HTML 注释
`<!-- icons:priority-1|star labels:A|B note:备注文本 -->`（缺省字段省略）；导入时回读还原。往返用例要求：roundtrip 后两棵树（含 icons/labels/note/collapsed/style）全等。

**XMind content.json 结构骨架**（以真实文件为准、防御式解析，勿臆造字段）：
`content.json` 为 sheet 数组，取 `sheets[0]`；每个 sheet 含 `rootTopic`（`title`、`children.attached[]` 递归）、`structureClass`（映射到 StructureType，无对应映射时默认 `'mindmap'`）。样式字段能映射则映射到 `NodeStyle`，映射不了忽略。

---

## 5. 主题

```ts
export interface Theme {
  id: string;
  name: string;                    // 中文显示名
  background: string;
  nodeFillByLevel: string[];       // 逐级节点填充色，层级超出取末位
  branchColorByLevel: string[];    // 逐级连线色
  textColor: string;
  rootStyle: NodeStyle;            // 根节点强制样式
}
```

内置主题 id（首批 6 个）：`classic`、`snow-ink`（墨雪）、`sunset`、`forest`、`ocean`、`mono-dark`。

---

## 6. 存储与文档服务

```ts
export interface StorageAdapter {              // 网页版 = IndexedDB 实现；桌面 = 文件系统实现
  list(): Promise<DocMeta[]>;
  load(id: string): Promise<MindDoc | null>;
  save(doc: MindDoc): Promise<void>;           // 防抖由上层负责
  delete(id: string): Promise<void>;
}

export interface DocumentService {
  getDoc(): MindDoc;
  update(mutator: (draft: MindDoc) => void): void;   // Immer 产生新文档 → 入 undo 栈 → 触发订阅 → 计划自动保存
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean; canRedo(): boolean;
  subscribe(listener: (doc: MindDoc) => void): () => void;  // 返回退订函数
  flushSave(): Promise<void>;                   // 立即落盘（切 tab / 关闭前调用）
}

export function createDocumentService(
  adapter: StorageAdapter,
  initial: MindDoc,
  opts?: { autosaveDebounceMs?: number }       // 默认 2000
): DocumentService;
```

`createDocumentService` 属于 `mindflow-core`；网页仓库在 core 包发布前可按本签名做**临时本地实现**（打 TODO 标记），后续替换为 core 导入。

---

## 7. UI 组件包出口（`mindflow-ui`，主对话实现，网页版消费）

```tsx
<MindMapCanvas doc={MindDoc} onDocChange={(next: MindDoc) => void} />
<OutlineView    doc={MindDoc} onDocChange={(next: MindDoc) => void} />
<Inspector     node={DocNode} onNodeChange={(patch: Partial<DocNode>) => void} />
<ThemeGallery  themes={Theme[]} current={string} onSelect={(themeId: string) => void} />
```

网页仓库在组件包就绪前，用**同 props 签名的 stub 组件**顶位，保证后续替换零改动。

---

### 7.1 移动端浏览器适配硬性要求（<768px，网页版与共享组件共同遵守）

- 画布触摸：pinch 缩放、双指平移、长按唤出节点操作菜单；
- **大纲视图为小屏主编辑入口**（触屏文字输入优先于画布行内编辑）；
- 检查器 / 主题库 / 文件列表在小屏折叠为底部抽屉（bottom sheet）；
- 所有可点元素触控目标 ≥ 44×44px；遵守 iOS 安全区 `env(safe-area-inset-*)`；
- `mindflow-ui` 组件不得依赖 hover 语义。

---

## 8. 交付协议（网页版 / 算法实验室共同遵守）

1. 完成后输出**交付摘要**：做了什么 / 实现的接口清单 / 测试与验证的真实命令输出 / 遗留问题 / 对契约的疑问建议。用户将摘要带回主对话做集成。
2. 类型定义一律从本契约 §2–§5 **逐字复制**到自己的 `src/types.ts`，签名冲突时以本契约为准并在摘要中报告。
3. 不修改对方仓库与本契约；不越界实现他人分工的模块。
4. 所有验证必须真实执行并粘贴输出，禁止臆测结果。
