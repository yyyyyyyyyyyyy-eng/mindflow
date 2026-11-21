// ============================================================================
// MindMapCanvas（契约 §7）：React Flow 画布。
//
// 架构不变式：布局是唯一几何权威。
// - 节点坐标/尺寸全部来自 layout()；拖拽只是手势，松手时要么改父级成功（文档变更
//   → 重布局 → 自然落位），要么失败（强制回写 graph.nodes 复位原位）；
// - 键盘体系：Tab=加子节点，Enter=加兄弟，Delete/Backspace=删除；双击行内编辑。
// ============================================================================

import '@xyflow/react/dist/style.css';

import {
  Background, BackgroundVariant, ReactFlow, ReactFlowProvider,
  useEdgesState, useNodesState, useReactFlow,
} from '@xyflow/react';
import type { EdgeProps, EdgeTypes, NodeProps, NodeTypes, OnNodesChange } from '@xyflow/react';
import type { NodeChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LAYOUT_OPTIONS, defaultIdGen, layout, normalizeOptions,
} from 'mindflow-core';
import type { DocNode, MindDoc, NodeId, TextSize, Theme } from 'mindflow-core';
import { buildFlowGraph } from '../flowModel';
import type { MindFlowEdge, MindFlowNode } from '../flowModel';
import { MIND_FONT_FAMILY, createBrowserMeasureText } from '../measure';
import { DEFAULT_APPEARANCE, mergeAppearance } from '../appearance';
import type { AppearanceConfig } from '../appearance';
import { StringEdge } from './StringEdge';
import { MindNode } from './MindNode';
import { ContextMenu } from './ContextMenu';
import { findNode, inSubtree } from '../treeOps';

export interface MindMapCanvasProps {
  doc: MindDoc;
  /** 文档变更（契约 §7 修订：mutator 语义，直连 DocumentService.update） */
  onDocChange: (mutator: (draft: MindDoc) => void) => void;
  theme: Theme;
  /** 文本测量注入（缺省用浏览器 canvas 实现） */
  measureText?: (text: string, bold: boolean) => TextSize;
  /** 选中态：外部受控优先；不传则内部维持 */
  selectedId?: NodeId | null;
  onSelectedChange?: (id: NodeId | null) => void;
  /** 节点文件拖入（多文件/多类型） */
  onDropFiles?: (id: NodeId, files: File[]) => void;
  /** 外观配置（卡片/绳子/背景参数化；缺省 DEFAULT_APPEARANCE） */
  appearance?: Partial<AppearanceConfig>;
}

/** 调试探针（dev-only）：App 侧注入 window.__mfSendDebug，未注入时零开销 */
type MfDebug = (payload: Record<string, unknown>) => void;
function sendDebug(p: Record<string, unknown>): void {
  const w = window as Window & { __mfSendDebug?: MfDebug };
  w.__mfSendDebug?.(p);
}

function CanvasInner({ doc, onDocChange, theme, measureText, selectedId, onSelectedChange, onDropFiles, appearance }: MindMapCanvasProps) {
  // 合并外观：缺省字段取默认
  const app = mergeAppearance(DEFAULT_APPEARANCE, appearance);
  // —— 测量与布局（文档投影的唯一几何来源） ——
  const measure = useMemo(
    () => measureText ?? createBrowserMeasureText(MIND_FONT_FAMILY),
    [measureText],
  );
  const layoutOpts = useMemo(
    () => normalizeOptions({ ...DEFAULT_LAYOUT_OPTIONS, fontFace: MIND_FONT_FAMILY, measureText: measure }),
    [measure],
  );
  const layoutResult = useMemo(
    () => layout(doc.root, doc.structure, layoutOpts),
    [doc, layoutOpts],
  );

  // —— 选中态 ——
  const [internalSel, setInternalSel] = useState<NodeId | null>(null);
  /** 右键菜单：屏幕坐标 + 命中节点（null = 画布空白） */
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: NodeId | null } | null>(null);
  /** 有效选中：外部受控优先（App 侧驱动 Inspector），否则用内部状态 */
  const effectiveSel = selectedId !== undefined ? selectedId : internalSel;

  const onSelectedChangeRef = useRef<MindMapCanvasProps['onSelectedChange']>(undefined);
  onSelectedChangeRef.current = onSelectedChange;        // 每次渲染同步最新回调（stable select 依赖 ref）
  const select = useCallback((id: NodeId | null) => {
    setInternalSel(id);
    onSelectedChangeRef.current?.(id);
  }, []);

  // —— graph 构建（布局 + 主题 → 节点/边投影） ——
  const graph = useMemo(
    () => buildFlowGraph(doc, layoutResult, null, theme),
    [doc, layoutResult, theme],
  );
  const graphRef = useRef(graph);
  graphRef.current = graph;

  const [nodes, setNodes, onNodesChange] = useNodesState<MindFlowNode>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MindFlowEdge>(graph.edges);
  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  // d3 干扰侦测器：手柄拖拽期间若 RF 发出 position 变更 = d3 拖拽掺和（WKWebView 排障探针）
  const handleNodesChange: OnNodesChange<MindFlowNode> = useCallback((changes: NodeChange<MindFlowNode>[]) => {
    for (const c of changes) {
      if (c.type === 'position' && c.dragging) {
        sendDebug({ k: 'rf-position', id: c.id, x: c.position?.x, y: c.position?.y });
      }
    }
    onNodesChange(changes);
  }, [onNodesChange]);

  const rf = useReactFlow();
  // 结构切换后重新适配视野
  useEffect(() => {
    const t = requestAnimationFrame(() => rf.fitView({ padding: 0.25, duration: 250 }));
    return () => cancelAnimationFrame(t);
  }, [doc.structure, rf]);

  // —— 节点操作（全部经 onDocChange 走不可变更新，撤销粒度天然正确） ——
  const addChild = useCallback((parentId: NodeId) => {
    const id = defaultIdGen();
    onDocChange((d) => {
      const loc = findNode(d.root, parentId);
      if (!loc) return;
      loc.node.collapsed = false;                        // 加子节点自动展开父
      loc.node.children.push({ id, text: '分支主题', children: [] });
    });
    select(id);
  }, [onDocChange, select]);

  const addSibling = useCallback((afterId: NodeId) => {
    const id = defaultIdGen();
    onDocChange((d) => {
      const loc = findNode(d.root, afterId);
      if (!loc) return;
      if (loc.parent === null) {                          // 根没有兄弟：转为加子节点
        loc.node.collapsed = false;
        loc.node.children.push({ id, text: '分支主题', children: [] });
        return;
      }
      loc.parent.children.splice(loc.index + 1, 0, { id, text: '分支主题', children: [] });
    });
    select(id);
  }, [onDocChange, select]);

  const deleteNode = useCallback((id: NodeId) => {
    if (id === doc.root.id) return;                      // 根不可删
    onDocChange((d) => {
      const loc = findNode(d.root, id);
      if (!loc?.parent) return;
      loc.parent.children.splice(loc.index, 1);
    });
    }, [doc.root.id, onDocChange]);

  const toggleCollapse = useCallback((id: NodeId) => {
    onDocChange((d) => {
      const loc = findNode(d.root, id);
      if (loc) loc.node.collapsed = loc.node.collapsed !== true;
    });
  }, [onDocChange]);



  // —— 卡片本体拖放（2026-11-20 全面重写：本体 = 唯一拖动入口）——
  // 复位用（防御路径）：setNodes(同一数组引用) 会被 React 以 Object.is 相等 bail-out
  // 跳过渲染，必须重建引用。
  const resetProjection = useCallback(() => {
    setNodes(graphRef.current.nodes.map((n) => ({ ...n, position: { ...n.position } })));
    setEdges(graphRef.current.edges.map((e) => ({ ...e })));
  }, [setEdges, setNodes]);

  const onNodeDragStop = useCallback((_e: MouseEvent | TouchEvent, dragged: MindFlowNode) => {
    const isRoot = dragged.id === doc.root.id;
    const hits = rf.getIntersectingNodes({ id: dragged.id });
    const target = isRoot ? undefined : hits.find((h) =>
      h.id !== dragged.id && !inSubtree(doc.root, dragged.id, h.id),
    );
    sendDebug({ k: 'rf-dragstop', id: dragged.id, hits: hits.length, reparent: target ? target.id : null, root: isRoot });
    if (target) {
      // 拖到另一节点上 = 挂为其子节点（防御顺序：先确认目标存在再摘源）
      onDocChange((d) => {
        const to = findNode(d.root, target.id);
        if (!to) return;
        const loc = findNode(d.root, dragged.id);
        if (!loc?.parent) return;
        loc.parent.children.splice(loc.index, 1);
        to.node.collapsed = false;
        to.node.children.push(loc.node);
      });
      select(target.id);
      return;
    }
    // 拖到空白处 = 自由定位（2026-11-20 交互重设计：用户心智模型「放哪就在哪」）：
    // 以 d3 拖放位移提交 pos（d3 已按 1/zoom 折算位移，此处无需再除 zoom）
    const proj = graphRef.current.nodes.find((n) => n.id === dragged.id);
    if (!proj) { resetProjection(); return; }
    const base = findNode(doc.root, dragged.id)?.node.pos ?? { dx: 0, dy: 0 };
    const pos = {
      dx: base.dx + (dragged.position.x - proj.position.x),
      dy: base.dy + (dragged.position.y - proj.position.y),
    };
    sendDebug({ k: 'free-commit', id: dragged.id, dx: pos.dx, dy: pos.dy });
    onDocChange((d) => {
      const loc = findNode(d.root, dragged.id);
      if (!loc) return;
      loc.node.pos = (pos.dx === 0 && pos.dy === 0) ? undefined : pos;
    });
  }, [doc.root, onDocChange, resetProjection, rf, select]);

  // —— 键盘（编辑态由 textarea 自行消化，不冒泡到这里） ——
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (menu !== null) { e.preventDefault(); setMenu(null); return; }   // Escape/任意键先收菜单
    if (!effectiveSel) return;
    if (e.key === 'Tab') { e.preventDefault(); addChild(effectiveSel); }
    else if (e.key === 'Enter') { e.preventDefault(); addSibling(effectiveSel); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteNode(effectiveSel); }
  }, [addChild, addSibling, deleteNode, effectiveSel, menu]);

  // —— 自定义节点/边类型 ——
  // —— 自定义节点/边类型 ——
  const nodeTypes = useMemo(() => {
    const wrapper = (p: NodeProps<MindFlowNode>) => (
      <MindNode
        {...p}
        onToggleCollapse={toggleCollapse}
        onAddChild={addChild}
        onDropFiles={onDropFiles ?? (() => {})}
        appearance={app}
      />
    );
    return { mind: wrapper } as unknown as NodeTypes;
  }, [addChild, app, onDropFiles, toggleCollapse]);
  const edgeTypes = useMemo(() => {
    const wrapper = (props: EdgeProps<MindFlowEdge>) => (
      <StringEdge {...props} appearance={app} />
    );
    return { branch: wrapper } as unknown as EdgeTypes;
  }, [app]);

  return (
    <div
      style={{ width: '100%', height: '100%', outline: 'none' }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDownCapture={(e) => {
        // 探针：画布内每一次按下的落点元素（区分 手柄/卡片本体/圆钮/画布空白）
        const t = e.target as HTMLElement;
        sendDebug({ k: 'pd', tag: t.tagName, cls: String(t.className).slice(0, 32) });
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_e, n) => { select(n.id); setMenu(null); }}
        onPaneClick={() => { select(null); setMenu(null); }}
        onNodeDragStart={(_e, node) => sendDebug({ k: 'rf-dragstart', id: node.id })}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={(e, n) => {
          e.preventDefault();
          select(n.id);
          setMenu({ x: e.clientX, y: e.clientY, nodeId: n.id });
        }}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, nodeId: null });
        }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15}
        maxZoom={2.5}
        onlyRenderVisibleElements={nodes.length > 100}
        onDrop={(e) => {
          // 画布空白处拖入文件 → 挂到选中节点（或根节点）
          e.preventDefault();
          if (!onDropFiles || !e.dataTransfer?.files?.length) return;
          const target = effectiveSel ?? doc.root.id;
          onDropFiles(target, Array.from(e.dataTransfer.files));
        }}
        onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); }}
      >
      {app.background.pattern !== 'none' && (
        <Background
          variant={app.background.pattern === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Cross}
          gap={app.background.gap}
          color={app.background.color}
          size={app.background.size ?? 1}
        />
      )}
      </ReactFlow>

      {/* 中文右键菜单（替代 WKWebView 默认英文菜单） */}
      {menu !== null && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          node={menu.nodeId !== null ? (findNode(doc.root, menu.nodeId)?.node ?? null) : null}
          isRoot={menu.nodeId === doc.root.id}
          onClose={() => setMenu(null)}
          onAddChild={() => { if (menu.nodeId !== null) addChild(menu.nodeId); setMenu(null); }}
          onAddSibling={() => { if (menu.nodeId !== null) addSibling(menu.nodeId); setMenu(null); }}
          onRename={() => {
            if (menu.nodeId !== null) select(menu.nodeId);
            setMenu(null);
          }}
          onToggleCollapse={() => { if (menu.nodeId !== null) toggleCollapse(menu.nodeId); setMenu(null); }}
          onClearPos={() => {
            const id = menu.nodeId;
            if (id !== null) {
              onDocChange((d) => {
                const loc = findNode(d.root, id);
                if (loc) loc.node.pos = undefined;
              });
            }
            setMenu(null);
          }}
          onDelete={() => { if (menu.nodeId !== null) deleteNode(menu.nodeId); setMenu(null); }}
          onFitView={() => { void rf.fitView({ padding: 0.25, duration: 250 }); setMenu(null); }}
          onExpandAll={() => {
            onDocChange((d) => {
              const walk = (n: DocNode) => { n.collapsed = false; n.children.forEach(walk); };
              walk(d.root);
            });
            setMenu(null);
          }}
          onCollapseAll={() => {
            onDocChange((d) => {
              const walk = (n: DocNode) => {
                if (n.children.length > 0) n.collapsed = true;
                n.children.forEach(walk);
              };
              walk(d.root);
            });
            setMenu(null);
          }}
        />
      )}
    </div>
  );
}

export function MindMapCanvas(props: MindMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
