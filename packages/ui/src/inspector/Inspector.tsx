// ============================================================================
// Inspector（契约 §7）：选中节点的样式检查器。
// 提交粒度：文本/备注/标签失焦提交；颜色/形状/加粗即时提交（一次一步撤销）。
// 「跟随主题」按钮清除节点级覆盖（style 字段逐个回退为 undefined）。
// ============================================================================

import { useState } from 'react';
import type { DocNode, NodeId, NodeStyle } from 'mindflow-core';

/** 节点形状种类（契约 §2 NodeStyle.shape） */
type ShapeKind = NonNullable<NodeStyle['shape']>;

export interface InspectorProps {
  node: DocNode | null;
  isRoot?: boolean;
  /** 样式补丁提交（App 侧负责套到对应节点上） */
  onNodeChange: (id: NodeId, patch: Partial<DocNode>) => void;
  onDelete?: (id: NodeId) => void;
  /** 图片上传（data URI） */
  onImage?: (id: NodeId, dataUri: string) => void;
}

const SHAPES: Array<{ value: ShapeKind; label: string }> = [
  { value: 'rounded-rect', label: '圆角矩形' },
  { value: 'rect', label: '矩形' },
  { value: 'ellipse', label: '椭圆' },
  { value: 'underline', label: '下划线' },
  { value: 'diamond', label: '菱形' },
];

const PRIORITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function Inspector({ node, isRoot = false, onNodeChange, onDelete, onImage }: InspectorProps) {
  const [draftText, setDraftText] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftLabels, setDraftLabels] = useState('');
  const [boundId, setBoundId] = useState<NodeId | null>(null);

  // 选中节点切换时重置草稿（外部撤销则由 key 重挂载兜底）
  const bound = node !== null && boundId !== node.id;
  if (bound) {
    setBoundId(node.id);
    setDraftText(node.text);
    setDraftNote(node.note ?? '');
    setDraftLabels((node.labels ?? []).join(','));
  }

  if (node === null) {
    return (
      <div style={{ padding: 16, color: '#667085', fontSize: 13 }}>
        在画布或大纲中选择一个节点，即可编辑其样式与备注。
      </div>
    );
  }

  const style = node.style ?? {};
  const icons = node.icons ?? [];

  const commitText = () => onNodeChange(node.id, { text: draftText });
  const commitNote = () => onNodeChange(node.id, { note: draftNote });
  const commitLabels = () => onNodeChange(node.id, {
    labels: draftLabels.split(/[,，]/).map((s) => s.trim()).filter((s) => s.length > 0),
  });

  const patchStyle = (patch: Partial<NonNullable<DocNode['style']>>) =>
    onNodeChange(node.id, { style: { ...style, ...patch } });

  const toggleIcon = (icon: string) =>
    onNodeChange(node.id, {
      icons: icons.includes(icon) ? icons.filter((i) => i !== icon) : [...icons, icon],
    });

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, marginBottom: 10, fontSize: 13, color: '#344054',
  };
  const input: React.CSSProperties = {
    flex: 1, border: '1px solid #d0d5dd', borderRadius: 6, padding: '6px 8px', fontSize: 13,
  };

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch' }}>
        <span style={{ marginBottom: 4 }}>文本</span>
        <textarea
          key={`t:${node.id}:${node.text}`}
          defaultValue={node.text}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commitText}
          rows={2}
          style={{ ...input, resize: 'vertical' }}
        />
      </div>

      {node.pos && (
        <button
          type="button"
          onClick={() => onNodeChange(node.id, { pos: undefined })}
          style={{
            marginBottom: 10, padding: '6px 0', fontSize: 12, cursor: 'pointer',
            border: '1px solid #d0d5dd', borderRadius: 8, color: '#475467', background: '#fff',
          }}
          title="移除自定义位置偏移，节点回归自动布局"
        >
          清除自定义位置（偏移 {node.pos.dx}, {node.pos.dy}）
        </button>
      )}

      {/* 节点图片 */}
      {onImage && (
        <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch' }}>
          <span style={{ marginBottom: 4 }}>图片</span>
          {node.image ? (
            <div style={{ position: 'relative' }}>
              <img
                src={node.image}
                alt="节点图片"
                style={{ width: '100%', borderRadius: 8, border: '1px solid #e4e7ec', marginBottom: 6 }}
              />
              <button
                type="button"
                onClick={() => onNodeChange(node.id, { image: undefined })}
                style={{ ...input, cursor: 'pointer', color: '#f04438', textAlign: 'center' }}
              >
                移除图片
              </button>
            </div>
          ) : (
            <label style={{
              ...input, cursor: 'pointer', textAlign: 'center', color: '#475467',
              border: '1px dashed #d0d5dd', borderRadius: 8, padding: '14px 8px',
              display: 'block',
            }}>
              📁 选择图片（≤500KB）
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f || !f.type.startsWith('image/') || f.size > 500 * 1024) return;
                  const reader = new FileReader();
                  reader.onload = () => { if (typeof reader.result === 'string') onImage(node.id, reader.result); };
                  reader.readAsDataURL(f);
                }}
              />
            </label>
          )}
        </div>
      )}

      <div style={row}>
        <span>形状</span>
        <select
          value={style.shape ?? ''}
          onChange={(e) => patchStyle(e.target.value ? { shape: e.target.value as ShapeKind } : { shape: undefined })}
          style={{ ...input, flex: '0 0 110px' }}
        >
          <option value="">跟随主题</option>
          {SHAPES.map((s) => <option key={String(s.value)} value={String(s.value)}>{s.label}</option>)}
        </select>
      </div>

      <div style={row}>
        <span>填充色</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={style.fill ?? '#4f7cf7'}
            onChange={(e) => patchStyle({ fill: e.target.value })}
            style={{ width: 34, height: 26, border: '1px solid #d0d5dd', borderRadius: 6, padding: 1 }}
          />
          {style.fill && (
            <button type="button" onClick={() => patchStyle({ fill: undefined })} style={{ border: 0, background: 'none', color: '#4f7cf7', cursor: 'pointer', fontSize: 12 }}>
              跟随主题
            </button>
          )}
        </span>
      </div>

      <div style={row}>
        <span>文字色</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={style.textColor ?? '#1f2329'}
            onChange={(e) => patchStyle({ textColor: e.target.value })}
            style={{ width: 34, height: 26, border: '1px solid #d0d5dd', borderRadius: 6, padding: 1 }}
          />
          {style.textColor && (
            <button type="button" onClick={() => patchStyle({ textColor: undefined })} style={{ border: 0, background: 'none', color: '#4f7cf7', cursor: 'pointer', fontSize: 12 }}>
              跟随主题
            </button>
          )}
        </span>
      </div>

      <div style={row}>
        <span>加粗</span>
        <input
          type="checkbox"
          checked={style.fontWeight === 'bold'}
          onChange={(e) => patchStyle({ fontWeight: e.target.checked ? 'bold' : undefined })}
        />
      </div>

      <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch' }}>
        <span style={{ marginBottom: 4 }}>优先级图标</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PRIORITIES.map((p) => {
            const icon = `priority-${p}`;
            const on = icons.includes(icon);
            return (
              <button
                key={icon}
                type="button"
                onClick={() => toggleIcon(icon)}
                style={{
                  width: 28, height: 24, fontSize: 11, cursor: 'pointer',
                  border: on ? '1px solid #4f7cf7' : '1px solid #d0d5dd',
                  background: on ? 'rgba(79,124,247,0.12)' : '#fff',
                  borderRadius: 6,
                }}
                title={`优先级 ${p}`}
              >
                P{p}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => toggleIcon('star')}
            style={{
              width: 28, height: 24, fontSize: 12, cursor: 'pointer',
              border: icons.includes('star') ? '1px solid #4f7cf7' : '1px solid #d0d5dd',
              background: icons.includes('star') ? 'rgba(79,124,247,0.12)' : '#fff',
              borderRadius: 6,
            }}
            title="星标"
          >
            ★
          </button>
        </div>
      </div>

      <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch' }}>
        <span style={{ marginBottom: 4 }}>标签（逗号分隔）</span>
        <input
          key={`l:${node.id}:${(node.labels ?? []).join(',')}`}
          defaultValue={(node.labels ?? []).join(',')}
          onChange={(e) => setDraftLabels(e.target.value)}
          onBlur={commitLabels}
          style={input}
          placeholder="如：重点,待办"
        />
      </div>

      <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch' }}>
        <span style={{ marginBottom: 4 }}>备注</span>
        <textarea
          key={`n:${node.id}:${node.note ?? ''}`}
          defaultValue={node.note ?? ''}
          onChange={(e) => setDraftNote(e.target.value)}
          onBlur={commitNote}
          rows={3}
          style={{ ...input, resize: 'vertical' }}
          placeholder="拖到此处编写备注…"
        />
      </div>

      {!isRoot && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          style={{
            marginTop: 6, padding: '7px 0', fontSize: 13, cursor: 'pointer',
            border: '1px solid #f04438', borderRadius: 8, color: '#f04438', background: '#fff',
          }}
        >
          删除节点
        </button>
      )}
    </div>
  );
}
