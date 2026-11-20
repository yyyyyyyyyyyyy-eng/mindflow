// ============================================================================
// MindFlow 契约类型 —— 自 CONTRACT.md §2–§5 逐字复制（签名一字不改）。
// 权威源：mindflow 桌面仓库的 CONTRACT.md；冲突时以契约为准，勿在此就地修改。
// ============================================================================

// —— §2 文档模型（.mflow 格式 v1）——

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

export interface PosOffset {
  /** 相对布局原位的水平偏移（px，画布坐标） */
  dx: number;
  /** 相对布局原位的垂直偏移（px，画布坐标） */
  dy: number;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string;
  isImage: boolean;
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
  pos?: PosOffset;                     // 自定义位置：相对布局原位的偏移，仅作用于该节点本身
  image?: string;                      // 节点图片（base64 data URI，≤500KB）
  attachments?: Attachment[];         // 文件附件（多文件/多类型）
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

// —— §3 布局引擎接口 ——

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

// —— §5 主题 ——

export interface Theme {
  id: string;
  name: string;                    // 中文显示名
  background: string;
  nodeFillByLevel: string[];       // 逐级节点填充色，层级超出取末位
  branchColorByLevel: string[];    // 逐级连线色
  textColor: string;
  rootStyle: NodeStyle;            // 根节点强制样式
}
