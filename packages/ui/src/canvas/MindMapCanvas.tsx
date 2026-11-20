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
import type { EdgeTypes, NodeProps, NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { produce } from 'immer';
import {
  DEFAULT_LAYOUT_OPTIONS, defaultIdGen, layout, normalizeOptions,
} from 'mindflow-core';
import type { MindDoc, NodeId, PosOffset, TextSize, Theme } from 'mindflow-core';
import { buildFlowGraph } from '../flowModel';
import type { MindFlowEdge, MindFlowNode } from '../flowModel';
import { MIND_FONT_FAMILY, createBrowserMeasureText } from '../measure';
import { BranchEdge } from './BranchEdge';
import { MindNode } from './MindNode';
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
}

function CanvasInner({ doc, onDocChange, theme, measureText, selectedId, onSelectedChange }: MindMapCanvasProps) {
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

  // —— 选中与编辑态 ——
  const [internalSel, setInternalSel] = useState<NodeId | null>(null);
  const [editingId, setEditingId] = useState<NodeId | null>(null);
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
    () => buildFlowGraph(doc, layoutResult, editingId, theme),
    [doc, layoutResult, editingId, theme],
  );
  const graphRef = useRef(graph);
  graphRef.current = graph;

  const [nodes, setNodes, onNodesChange] = useNodesState<MindFlowNode>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MindFlowEdge>(graph.edges);
  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

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
    setEditingId(id);                                    // 新节点直接进入行内编辑
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
    setEditingId(id);
  }, [onDocChange, select]);

  const deleteNode = useCallback((id: NodeId) => {
    if (id === doc.root.id) return;                      // 根不可删
    onDocChange((d) => {
      const loc = findNode(d.root, id);
      if (!loc?.parent) return;
      loc.parent.children.splice(loc.index, 1);
    });
    if (editingId === id) setEditingId(null);
  }, [doc.root.id, editingId, onDocChange]);

  const toggleCollapse = useCallback((id: NodeId) => {
    onDocChange((d) => {
      const loc = findNode(d.root, id);
      if (loc) loc.node.collapsed = loc.node.collapsed !== true;
    });
  }, [onDocChange]);

  const commitText = useCallback((id: NodeId, text: string) => {
    onDocChange((d) => {
      const loc = findNode(d.root, id);
      if (loc) loc.node.text = text;
    });
    setEditingId(null);
  }, [onDocChange]);

  // —— 十字手柄：自定义位置（预览走本地投影不进文档，松手一次性提交） ——
  const getBasePos = useCallback((id: NodeId): PosOffset =>
    findNode(doc.root, id)?.node.pos ?? { dx: 0, dy: 0 }, [doc.root]);

  const onPosPreview = useCallback((id: NodeId, pos: PosOffset) => {
    const preview = produce(doc, (d) => {
      const loc = findNode(d.root, id);
      if (loc) loc.node.pos = pos;
    });
    const g = buildFlowGraph(preview, layoutResult, editingId, theme);
    setNodes(g.nodes);
    setEdges(g.edges);
  }, [doc, layoutResult, editingId, theme, setNodes, setEdges]);

  const onPosCommit = useCallback((id: NodeId, pos: PosOffset) => {
    onDocChange((d) => {
      const loc = findNode(d.root, id);
      if (!loc) return;
      // 拖回原位（0,0 累计）= 清除自定义位置，回归布局
      loc.node.pos = (pos.dx === 0 && pos.dy === 0) ? undefined : pos;
    });
  }, [onDocChange]);

  // —— 拖拽改父级：松手时与其它节点相交 → 挂为其子；否则复位原位 ——
  const onNodeDragStop = useCallback((_e: MouseEvent | TouchEvent, dragged: MindFlowNode) => {
    if (dragged.id === doc.root.id) { setNodes(graphRef.current.nodes); return; }
    const hits = rf.getIntersectingNodes({ id: dragged.id });
    const target = hits.find((h) =>
      h.id !== dragged.id && !inSubtree(doc.root, dragged.id, h.id),
    );
    if (!target) {
      setNodes(graphRef.current.nodes);                   // 未命中：回写投影复位
      return;
    }
    onDocChange((d) => {
      const loc = findNode(d.root, dragged.id);
      if (!loc?.parent) return;
      loc.parent.children.splice(loc.index, 1);
      const to = findNode(d.root, target.id);
      if (!to) return;
      to.node.collapsed = false;
      to.node.children.push(loc.node);
    });
    select(target.id);
  }, [doc.root, onDocChange, rf, select, setNodes]);

  // —— 键盘（编辑态由 textarea 自行消化，不冒泡到这里） ——
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingId !== null) return;
    if (!effectiveSel) return;
    if (e.key === 'Tab') { e.preventDefault(); addChild(effectiveSel); }
    else if (e.key === 'Enter') { e.preventDefault(); addSibling(effectiveSel); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteNode(effectiveSel); }
  }, [addChild, addSibling, deleteNode, editingId, effectiveSel]);

  // —— 自定义节点/边类型 ——
  const nodeTypes = useMemo(() => {
    const wrapper = (p: NodeProps<MindFlowNode>) => (
      <MindNode
        {...p}
        onCommitText={commitText}
        onToggleCollapse={toggleCollapse}
        onAddChild={addChild}
        getBasePos={getBasePos}
        onPosPreview={onPosPreview}
        onPosCommit={onPosCommit}
      />
    );
    return { mind: wrapper } as unknown as NodeTypes;
  }, [addChild, commitText, getBasePos, onPosCommit, onPosPreview, toggleCollapse]);
  const edgeTypes = useMemo(() => ({ branch: BranchEdge }) as unknown as EdgeTypes, []);

  return (
    <div
      style={{ width: '100%', height: '100%', outline: 'none' }}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_e, n) => select(n.id)}
        onPaneClick={() => select(null)}
        onNodeDoubleClick={(_e, n) => { select(n.id); setEditingId(n.id); }}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15}
        maxZoom={2.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} color="#e4e7ec" />
      </ReactFlow>
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
