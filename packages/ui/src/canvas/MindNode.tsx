// ============================================================================
// 自定义节点组件（type: 'mind'）：布局给定的定尺寸框 + 主题配色 + 三组控件：
// - 左侧圆钮 −/+：折叠/展开（原右侧，2026-11-20 与加号对调成镜像位）
// - 右侧圆钮 +：点击添加一个子层级
// - 顶部十字手柄：按住拖拽 = 自定义位置（子树整体随动，松手提交，一次撤销）
// 所有几何来自节点 style（width/height）与位置，组件自身不做布局计算。
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { PosOffset } from 'mindflow-core';
import type { MindFlowNode } from '../flowModel';

/** 形状 → 圆角 / 裁剪样式（diamond 用 clip-path，underline 用底边线） */
function shapeStyle(shape: MindFlowNode['data']['shape'], fill: string): React.CSSProperties {
  switch (shape) {
    case 'rect':
      return { borderRadius: 2 };
    case 'ellipse':
      return { borderRadius: '50%' };
    case 'underline':
      return { background: 'transparent', borderRadius: 0, borderBottom: `3px solid ${fill}` };
    case 'diamond':
      return { clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' };
    default:
      return { borderRadius: 10 };
  }
}

/** 圆形小钮通用样式（左右折叠/加号共用规格，互为镜像） */
const roundBtn = (offsetSide: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute',
  [offsetSide]: -11,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '1px solid #d0d5dd',
  background: '#fff',
  color: '#475467',
  fontSize: 13,
  lineHeight: '16px',
  textAlign: 'center',
  padding: 0,
  cursor: 'pointer',
  userSelect: 'none',
});

export interface MindNodeProps extends NodeProps<MindFlowNode> {
  onCommitText: (id: string, text: string) => void;      // 行内编辑提交
  onToggleCollapse: (id: string) => void;                // 折叠/展开（左侧 −/+）
  onAddChild: (id: string) => void;                      // 右侧 +：添加子层级
  getBasePos: (id: string) => PosOffset;                 // 拖拽起点：节点当前 pos
  onPosPreview: (id: string, pos: PosOffset) => void;    // 十字拖拽中：实时预览
  onPosCommit: (id: string, pos: PosOffset) => void;     // 十字拖拽松手：提交（0,0 时清除）
}

export function MindNode({
  id, data, selected,
  onCommitText, onToggleCollapse, onAddChild, getBasePos, onPosPreview, onPosCommit,
}: MindNodeProps) {
  const [draft, setDraft] = useState<string | null>(null);  // null=非编辑态
  const taRef = useRef<HTMLTextAreaElement>(null);
  const posDrag = useRef<{ sx: number; sy: number; base: PosOffset } | null>(null);

  // 进入编辑态时聚焦并初始化草稿
  useEffect(() => {
    if (data.editing) {
      setDraft(data.text);
      requestAnimationFrame(() => taRef.current?.select());
    }
  }, [data.editing, data.text]);

  const commit = () => {
    if (draft !== null && draft !== data.text) onCommitText(id, draft);
    setDraft(null);
  };

  // —— 十字手柄拖拽：预览走本地投影，松手一次性提交（撤销粒度=一次拖拽） ——
  const onHandleDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    posDrag.current = { sx: e.clientX, sy: e.clientY, base: getBasePos(id) };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // 非受信指针（自动化/测试注入）下捕获可能失败——按钮上的监听器仍生效，拖拽照常
    }
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const drag = posDrag.current;
    if (!drag) return;
    e.stopPropagation();
    onPosPreview(id, {
      dx: drag.base.dx + (e.clientX - drag.sx),
      dy: drag.base.dy + (e.clientY - drag.sy),
    });
  };
  const onHandleUp = (e: React.PointerEvent) => {
    const drag = posDrag.current;
    if (!drag) return;
    e.stopPropagation();
    posDrag.current = null;
    onPosCommit(id, {
      dx: drag.base.dx + (e.clientX - drag.sx),
      dy: drag.base.dy + (e.clientY - drag.sy),
    });
  };
  const onHandleCancel = () => {
    const drag = posDrag.current;
    if (!drag) return;
    posDrag.current = null;
    onPosPreview(id, drag.base);                       // 取消：复位预览
  };

  const box: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: data.shape === 'underline' ? 'transparent' : data.fill,
    color: data.textColor,
    fontFamily: 'var(--mind-font)',
    fontSize: data.fontSize,
    lineHeight: 1.4,
    fontWeight: data.bold ? 700 : 400,
    whiteSpace: 'pre-line',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: data.shape === 'diamond' ? '0 18%' : undefined,
    cursor: 'pointer',
    border: selected ? '2px solid rgba(79,124,247,0.9)' : undefined,
    ...shapeStyle(data.shape, data.fill),
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={box} title={data.hasNote ? '有备注' : undefined}>
        {data.text}
        {data.hasNote && <span style={{ marginLeft: 4, fontSize: 10 }}>▤</span>}
      </div>

      {/* 左侧：折叠/展开（− 圆钮，有孩子才显示） */}
      {data.childCount > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(id); }}
          style={roundBtn('left')}
          title={data.collapsed ? `展开 ${data.childCount} 个子节点` : '折叠'}
        >
          {data.collapsed ? data.childCount : '−'}
        </button>
      )}

      {/* 右侧：+ 圆钮 = 添加一个子层级 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAddChild(id); }}
        style={roundBtn('right')}
        title="添加子层级"
      >
        +
      </button>

      {/* 顶部：十字手柄 = 自定义位置（PointerCapture 拖拽） */}
      <button
        type="button"
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleCancel}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: '50%',
          top: -10,
          transform: 'translateX(-50%)',
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '1px solid #d0d5dd',
          background: '#fff',
          color: '#475467',
          fontSize: 10,
          lineHeight: '16px',
          textAlign: 'center',
          padding: 0,
          cursor: 'move',
          userSelect: 'none',
          touchAction: 'none',                            // 触屏拖拽不被滚动劫持
        }}
        title="拖动调整位置（子树整体随动）"
      >
        ✥
      </button>

      {/* 行内编辑覆盖层：按键不冒泡到画布 */}
      {draft !== null && (
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
            if (e.key === 'Escape') setDraft(null);
          }}
          style={{
            position: 'absolute', inset: -4, zIndex: 10, resize: 'none',
            background: '#fff', color: '#1a1d21', border: '2px solid #4f7cf7', borderRadius: 8,
            fontFamily: 'var(--mind-font)', fontSize: data.fontSize, lineHeight: 1.4,
            padding: '8px 12px', boxSizing: 'border-box', width: 'calc(100% + 8px)',
          }}
        />
      )}
    </div>
  );
}
