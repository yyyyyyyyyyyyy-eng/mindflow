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
import { Handle, Position } from '@xyflow/react';
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
  onCommitText: (id: string, text: string) => void;      // 行内编辑提交（含退出编辑态）
  onLiveUpdateText: (id: string, text: string) => void;  // 行内编辑实时同步（不退出编辑态，大纲跟随）
  onToggleCollapse: (id: string) => void;                // 折叠/展开（左侧 −/+）
  onAddChild: (id: string) => void;                      // 右侧 +：添加子层级
  onDropFiles: (id: string, files: File[]) => void;      // 拖拽文件到节点
  onOpenFileDialog: (id: string) => void;                // 回形针：App 层处理（Tauri dialog / browser input）
}

export function MindNode({
  id, data, selected,
  onCommitText, onLiveUpdateText, onToggleCollapse, onAddChild, onDropFiles, onOpenFileDialog,
}: MindNodeProps) {
  const [draft, setDraft] = useState<string | null>(null);  // null=非编辑态
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 进入/退出编辑态时初始化草稿（只在 editing 切换时跑——text 变化不触发 select，
  // 否则 liveUpdateText 回写后 select() 会全选文字，下一个按键覆盖整段）
  useEffect(() => {
    if (data.editing) {
      setDraft(data.text);
      requestAnimationFrame(() => taRef.current?.select());
    } else {
      setDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.editing]);

  const commit = () => {
    if (draft !== null && draft !== data.text) onCommitText(id, draft);
    else setDraft(null);
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
    // 卡片质感（2026-11-20 实体感升级）：细边 + 双层投影
    border: selected ? '2px solid rgba(79,124,247,0.9)' : '1px solid rgba(16,24,40,0.08)',
    boxShadow: data.shape === 'underline'
      ? undefined
      : '0 3px 8px rgba(16,24,40,0.16), 0 1px 2px rgba(16,24,40,0.10)',
    ...shapeStyle(data.shape, data.fill),
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
      {/* 针杆：钉入卡片顶面 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: -2,
          transform: 'translateX(-50%)',
          width: 2,
          height: 8,
          background: 'linear-gradient(#8a94a6, #5b6474)',
          pointerEvents: 'none',
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

      {/* 底部：回形针 = 导入文件（多文件/多类型） */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenFileDialog(id); }}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -11,
          transform: 'translateX(-50%)',
          height: 18,
          minWidth: 18,
          padding: '0 4px',
          borderRadius: 9,
          border: '1px solid #d0d5dd',
          background: '#fff',
          color: '#475467',
          fontSize: 10,
          lineHeight: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
        title="导入文件到节点（支持多文件/图片/文档）"
      >
        📎{data.imageCount + data.fileCount > 0 ? `${data.imageCount + data.fileCount}` : ''}
      </button>

      {/* 行内编辑覆盖层：onChange 实时同步大纲；Enter/失焦提交并关闭 */}
      {draft !== null && (
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onLiveUpdateText(id, e.target.value);          // 实时同步 → 文档更新 → 大纲跟随
          }}
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
