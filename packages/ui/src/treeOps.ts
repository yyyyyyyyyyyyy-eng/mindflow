// ============================================================================
// 树操作纯函数（节点查找/移动/删插、可见行收集、子树判定）。
// 画布与大纲共用；全部为不可变文档上的 draft 操作（经 Immer produce 调用）。
// ============================================================================

import type { DocNode, NodeId } from 'mindflow-core';

/** 节点定位：node + 父节点（根为 null）+ 在父 children 中的下标 */
export interface NodeLoc {
  node: DocNode;
  parent: DocNode | null;
  index: number;
}

/** 按 id 查找节点：返回节点、父节点与下标；未找到返回 null */
export function findNode(root: DocNode, id: NodeId): NodeLoc | null {
  const walk = (node: DocNode, parent: DocNode | null, index: number): NodeLoc | null => {
    if (node.id === id) return { node, parent, index };
    for (let i = 0; i < node.children.length; i++) {
      const hit = walk(node.children[i]!, node, i);
      if (hit) return hit;
    }
    return null;
  };
  return walk(root, null, 0);
}

/**
 * 子树判定：id 是否在 ancestorId 的子树内（含 ancestorId 自身）。
 * 拖拽改父级时用于防环——节点不能落入自己的子树。
 */
export function inSubtree(root: DocNode, ancestorId: NodeId, id: NodeId): boolean {
  const walk = (node: DocNode): boolean => {
    if (node.id === ancestorId) return contains(node, id);
    return node.children.some((c) => walk(c));
  };
  const contains = (sub: DocNode, target: NodeId): boolean => {
    if (sub.id === target) return true;
    return sub.children.some((c) => contains(c, target));
  };
  return walk(root);
}

/** 大纲行：可见展平（collapsed 节点保留行、隐藏其子行） */
export interface OutlineRow {
  id: NodeId;
  text: string;
  level: number;
  collapsed: boolean;
  childCount: number;
}

/** 收集大纲可见行（深度优先，折叠处截断） */
export function collectOutlineRows(root: DocNode): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const walk = (node: DocNode, level: number) => {
    rows.push({
      id: node.id,
      text: node.text,
      level,
      collapsed: node.collapsed === true,
      childCount: node.children.length,
    });
    if (node.collapsed !== true) {
      for (const child of node.children) walk(child, level + 1);
    }
  };
  walk(root, 0);
  return rows;
}
