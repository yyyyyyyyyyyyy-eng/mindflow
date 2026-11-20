// ============================================================================
// 自定义节点组件（type: 'mind'）：卡片 + 三组视觉元素。
//
// 交互模型（2026-11-20 全面重写，用户澄清）：
// - 顶上小钉 = 纯装饰占位（后续钉子+细绳的预留位），不承担任何功能；
// - 卡片本体 = 唯一拖动入口（dragHandle '.mf-node-body'）：
//     拖到空白处 = 就地定位（提交 pos，可撤销）；拖到另一节点上 = 挂为其子节点；
// - 左侧 −/+ 圆钮：折叠/展开；右侧 + 圆钮：添加子层级；双击：行内编辑。
// 所有几何来自节点 style（width/height）与位置，组件自身不做布局计算。
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
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
}

export function MindNode({
  id, data, selected, onCommitText, onToggleCollapse, onAddChild,
}: MindNodeProps) {
  const [draft, setDraft] = useState<string | null>(null);  // null=非编辑态
  const taRef = useRef<HTMLTextAreaElement>(null);

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
    cursor: 'grab',                                       // 本体 = 拖动入口
    border: selected ? '2px solid rgba(79,124,247,0.9)' : undefined,
    ...shapeStyle(data.shape, data.fill),
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="mf-node-body" style={box} title={data.hasNote ? '有备注' : undefined}>
        {data.text}
        {data.hasNote && <span style={{ marginLeft: 4, fontSize: 10 }}>▤</span>}
      </div>

      {/* 顶上小钉：纯装饰占位（钉子+细绳预留位），无任何交互 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: -9,
          transform: 'translateX(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #d5dae3 45%, #8a94a6 100%)',
          border: '1px solid #7c8698',
          boxShadow: '0 1px 2px rgba(16,24,40,0.35)',
          pointerEvents: 'none',                           // 装饰：不拦截任何指针事件
        }}
      />

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
