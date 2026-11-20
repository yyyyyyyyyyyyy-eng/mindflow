// ============================================================================
// OutlineView（契约 §7）：大纲视图——小屏主编辑入口（§7.1）。
// 深度缩进列表 + 与画布同一文档源；行内输入失焦/回车提交（撤销粒度=一次编辑）。
// 键盘：Enter=下方加兄弟，Tab=缩进为上一行子节点，Shift+Tab=升级，
// ↑↓=行间移动，空行 Backspace=删除节点。折叠与画布互通。
// ============================================================================

import { useCallback, useRef } from 'react';
import { defaultIdGen } from 'mindflow-core';
import type { MindDoc, NodeId } from 'mindflow-core';
import { collectOutlineRows, findNode } from '../treeOps';
import type { OutlineRow } from '../treeOps';

export interface OutlineViewProps {
  doc: MindDoc;
  onDocChange: (mutator: (draft: MindDoc) => void) => void;
  selectedId?: NodeId | null;
  onSelectedChange?: (id: NodeId | null) => void;
}

export function OutlineView({ doc, onDocChange, selectedId, onSelectedChange }: OutlineViewProps) {
  const rows = collectOutlineRows(doc.root);
  const inputRefs = useRef(new Map<number, HTMLInputElement>());

  const focusRow = useCallback((idx: number) => {
    inputRefs.current.get(idx)?.focus();
  }, []);

  /** 单行键盘处理 */
  const onKeyDown = useCallback((e: React.KeyboardEvent, row: OutlineRow, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const id = defaultIdGen();
      // 2026-11-20 语义修订：Enter 在任何层级都创建「子层级」——与根级行为一致，
      // 消除「根回车=子级、更深层回车=同级」的不一致。需要同级时：Enter 后 Shift+Tab 升级。
      onDocChange((d) => {
        const loc = findNode(d.root, row.id);
        if (!loc) return;
        loc.node.collapsed = false;                        // 加子节点自动展开当前行
        loc.node.children.push({ id, text: '分支主题', children: [] });
      });
      onSelectedChange?.(id);
      // 新行渲染后聚焦：新子级在展平行列表中紧跟当前行（idx+1）
      requestAnimationFrame(() => {
        const rowsNow = collectOutlineRows(doc.root);
        focusRow(Math.min(idx + 1, rowsNow.length));
      });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // 升级：成为父节点的下一个兄弟；父为根的直接子节点时不允许
        onDocChange((d) => {
          const loc = findNode(d.root, row.id);
          if (!loc?.parent) return;
          const pLoc = findNode(d.root, loc.parent.id);
          if (!pLoc?.parent) return;                       // 父是根 → 不动
          loc.parent.children.splice(loc.index, 1);
          pLoc.parent.children.splice(pLoc.index + 1, 0, loc.node);
        });
      } else {
        // 缩进：成为前一个兄弟的末位子节点；无前兄弟则不动
        onDocChange((d) => {
          const loc = findNode(d.root, row.id);
          if (!loc || loc.index === 0 || loc.parent === null) return;
          const prev = loc.parent.children[loc.index - 1]!;
          loc.parent.children.splice(loc.index, 1);
          prev.collapsed = false;
          prev.children.push(loc.node);
        });
      }
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      focusRow(idx - 1);
    } else if (e.key === 'ArrowDown' && idx < rows.length - 1) {
      e.preventDefault();
      focusRow(idx + 1);
    }
    // 空行 Backspace=删除节点（输入框有内容时不删，交由浏览器默认删除文本）
  }, [doc.root, focusRow, onDocChange, onSelectedChange, rows.length]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 12px' }}>
      {rows.map((row, idx) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingLeft: row.level * 22,
            background: selectedId === row.id ? 'rgba(79,124,247,0.08)' : undefined,
            borderRadius: 6,
          }}
        >
          {row.childCount > 0 ? (
            <button
              type="button"
              onClick={() => onDocChange((d) => {
                const loc = findNode(d.root, row.id);
                if (loc) loc.node.collapsed = loc.node.collapsed !== true;
              })}
              style={{ border: 0, background: 'none', cursor: 'pointer', color: '#475467', fontSize: 11, padding: '0 4px' }}
              title={row.collapsed ? '展开' : '折叠'}
            >
              {row.collapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span style={{ display: 'inline-block', width: 20 }} />
          )}

          <input
            key={`${row.id}:${row.text}`}                 // 外部变更（撤销）时重挂载取新值
            ref={(el) => {
              if (el) inputRefs.current.set(idx, el);
              else inputRefs.current.delete(idx);
            }}
            defaultValue={row.text}
            onFocus={() => onSelectedChange?.(row.id)}
            onBlur={(e) => {
              if (e.target.value !== row.text) {
                onDocChange((d) => {
                  const loc = findNode(d.root, row.id);
                  if (loc) loc.node.text = e.target.value;
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && e.currentTarget.value === '' && row.id !== doc.root.id) {
                e.preventDefault();
                onDocChange((d) => {
                  const loc = findNode(d.root, row.id);
                  if (loc?.parent) loc.parent.children.splice(loc.index, 1);
                });
              } else {
                onKeyDown(e, row, idx);
              }
            }}
            style={{
              flex: 1,
              border: '1px solid transparent',
              borderRadius: 6,
              padding: '5px 8px',
              fontSize: 14,
              lineHeight: 1.4,
              background: 'transparent',
              outline: 'none',
              fontWeight: row.level === 0 ? 700 : 400,
              color: '#1a1d21',
            }}
          />
        </div>
      ))}
    </div>
  );
}
