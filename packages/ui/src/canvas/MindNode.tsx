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

import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { MindFlowNode } from '../flowModel';
import type { AppearanceConfig } from '../appearance';

/** 形状 → 圆角 / 裁剪样式 */
function shapeStyle(shape: MindFlowNode['data']['shape'], fill: string, card: AppearanceConfig['card']): React.CSSProperties {
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
      return { borderRadius: card.borderRadius };
  }
}

/** 圆形小钮（折叠/加号），从 appearance 读取尺寸配色 */
const roundBtn = (offsetSide: 'left' | 'right', btn: AppearanceConfig['card']['buttons']): React.CSSProperties => ({
  position: 'absolute',
  [offsetSide]: -11,
  top: '50%',
  transform: 'translateY(-50%)',
  width: btn.size,
  height: btn.size,
  borderRadius: '50%',
  border: `1px solid ${btn.borderColor}`,
  background: btn.background,
  color: btn.color,
  fontSize: btn.fontSize,
  lineHeight: `${btn.size - 2}px`,
  textAlign: 'center',
  padding: 0,
  cursor: 'pointer',
  userSelect: 'none',
});

export interface MindNodeProps extends NodeProps<MindFlowNode> {
  onToggleCollapse: (id: string) => void;                // 折叠/展开（左侧 −/+）
  onAddChild: (id: string) => void;                      // 右侧 +：添加子层级
  onDropFiles: (id: string, files: File[]) => void;      // 拖拽文件到节点
  appearance: AppearanceConfig;                          // 外观（从 Canvas 合并后传入）
}

export function MindNode({
  id, data, selected, onToggleCollapse, onAddChild, onDropFiles, appearance,
}: MindNodeProps) {
  const ac = appearance.card;
  const bgStyle = ac.backgroundImage
    ? `${data.shape === 'underline' ? 'transparent' : `url(${ac.backgroundImage}) center/cover`}`
    : (data.shape === 'underline' ? 'transparent' : data.fill);

  const box: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bgStyle,
    color: data.textColor,
    fontFamily: 'var(--mind-font)',
    fontSize: data.fontSize,
    lineHeight: 1.4,
    fontWeight: data.bold ? 700 : 400,
    whiteSpace: 'pre-line',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: data.shape === 'diamond' ? '0 18%' : undefined,
    cursor: 'grab',
    border: selected ? '2px solid rgba(79,124,247,0.9)' : ac.border,
    boxShadow: data.shape === 'underline' ? undefined : ac.shadow,
    ...shapeStyle(data.shape, data.fill, appearance.card),
  };

  // 处理拖入文件（多文件/多类型）
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onDropFiles(id, Array.from(files));
  };

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleFiles(e.dataTransfer?.files ?? null);
      }}
    >
      {/* RF v12 要求节点具备 Handle 才挂载边组——几何由 pinA/pinB 驱动，Handle 仅作挂载锚（隐形、无交互） */}
      <Handle type="source" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />

      <div className="mf-node-body" style={box} title={data.hasNote ? '有备注' : undefined}>
        {data.imageSrc && (
          <img
            src={data.imageSrc}
            alt=""
            style={{
              height: 28, maxWidth: 48, objectFit: 'cover',
              borderRadius: 4, marginRight: 6, pointerEvents: 'none',
            }}
          />
        )}
        {data.text}
        {data.hasNote && <span style={{ marginLeft: 2, fontSize: 10 }}>▤</span>}
      </div>

      {/* 顶上小钉：纯装饰占位（钉子+细绳预留位），无任何交互（样式从 appearance.card.pin） */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: -Math.round(ac.pin.size * 0.75),
          transform: 'translateX(-50%)',
          width: ac.pin.size,
          height: ac.pin.size,
          borderRadius: '50%',
          background: ac.pin.gradient,
          border: `1px solid ${ac.pin.borderColor}`,
          boxShadow: '0 1px 2px rgba(16,24,40,0.35)',
          pointerEvents: 'none',
        }}
      />
      {/* 针杆 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: -2,
          transform: 'translateX(-50%)',
          width: 2,
          height: 8,
          background: ac.pin.needle,
          pointerEvents: 'none',
        }}
      />

      {/* 左侧：折叠/展开（− 圆钮，有孩子才显示） */}
      {data.childCount > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(id); }}
          style={roundBtn('left', ac.buttons)}
          title={data.collapsed ? `展开 ${data.childCount} 个子节点` : '折叠'}
        >
          {data.collapsed ? data.childCount : '−'}
        </button>
      )}

      {/* 右侧：+ 圆钮 = 添加一个子层级 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAddChild(id); }}
        style={roundBtn('right', ac.buttons)}
        title="添加子层级"
      >
        +
      </button>

    </div>
  );
}
