// ============================================================================
// ContextMenu：画布中文右键菜单（2026-11-20 新增）。
// 节点右键：添加子层级 / 添加同级 / 重命名 / 折叠展开 / 清除自定义位置 / 删除；
// 空白右键：适应视图 / 全部展开 / 全部折叠。
// 取代 WKWebView 的英文默认菜单（画布层 preventDefault + 自绘菜单）。
// ============================================================================

import type { DocNode } from 'mindflow-core';

export interface ContextMenuProps {
  /** 屏幕坐标（右键落点） */
  x: number;
  y: number;
  /** 右键命中的节点；null = 画布空白处 */
  node: DocNode | null;
  /** 命中的是否根节点（根不显示 加同级/删除） */
  isRoot: boolean;
  onClose: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onRename: () => void;
  onToggleCollapse: () => void;
  onClearPos: () => void;
  onDelete: () => void;
  onFitView: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const MENU_WIDTH = 176;

/** 菜单项（含 hover 高亮，用 <style> 实现避免每项挂事件） */
const item: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '7px 14px', fontSize: 13, border: 0, background: 'none',
  cursor: 'pointer', color: '#344054', borderRadius: 6,
};

export function ContextMenu(props: ContextMenuProps) {
  const nodeItems = props.node !== null;
  const estHeight = nodeItems ? 300 : 130;
  const left = Math.min(props.x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(props.y, window.innerHeight - estHeight - 8);

  return (
    <>
      <style>{`.mf-ctx-item:hover { background: #f2f4f7; }`}</style>
      <div
        style={{
          position: 'fixed', left, top, zIndex: 10000,
          minWidth: MENU_WIDTH, background: '#fff',
          border: '1px solid #e4e7ec', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(16,24,40,0.16)', padding: 4,
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {nodeItems && props.node !== null ? (
          <>
            <button type="button" className="mf-ctx-item" style={item} onClick={props.onAddChild}>添加子层级</button>
            {!props.isRoot && (
              <button type="button" className="mf-ctx-item" style={item} onClick={props.onAddSibling}>添加同级</button>
            )}
            <button type="button" className="mf-ctx-item" style={item} onClick={props.onRename}>重命名</button>
            {props.node.children.length > 0 && (
              <button type="button" className="mf-ctx-item" style={item} onClick={props.onToggleCollapse}>
                {props.node.collapsed === true
                  ? `展开子节点（${props.node.children.length}）`
                  : '折叠子节点'}
              </button>
            )}
            {props.node.pos && (
              <button type="button" className="mf-ctx-item" style={item} onClick={props.onClearPos}>
                清除自定义位置
              </button>
            )}
            {!props.isRoot && (
              <>
                <div style={{ height: 1, background: '#f2f4f7', margin: '4px 8px' }} />
                <button type="button" className="mf-ctx-item" style={{ ...item, color: '#f04438' }} onClick={props.onDelete}>
                  删除节点
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button type="button" className="mf-ctx-item" style={item} onClick={props.onFitView}>适应视图</button>
            <button type="button" className="mf-ctx-item" style={item} onClick={props.onExpandAll}>全部展开</button>
            <button type="button" className="mf-ctx-item" style={item} onClick={props.onCollapseAll}>全部折叠</button>
          </>
        )}
      </div>
    </>
  );
}
