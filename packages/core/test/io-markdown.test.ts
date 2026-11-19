// ============================================================================
// Markdown 序列化测试：往返无损（含 icons/labels/note/collapsed/style、
// 多行文本、深度 >6 列表续接、注释碰撞边界）、手工 md 导入、导出格式、
// 文档级默认值。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { docToMarkdown, markdownToDoc } from '../src/io/markdown';
import type { DocNode, MindDoc } from '../src/types';
import { counterIdGen, node } from './helpers';
import { buildRichDoc } from './rich-doc';

describe('markdown 往返无损', () => {
  it('富文档 roundtrip：树全等（含 id，计数器同序）', () => {
    const doc = buildRichDoc();
    const md = docToMarkdown(doc);
    const back = markdownToDoc(md, counterIdGen());
    expect(back.root).toEqual(doc.root); // id 同序生成 → 可全等比较
  });
  it('契约示例格式的注释原样出现', () => {
    const doc: MindDoc = {
      formatVersion: 1, id: 'd1', title: '根', structure: 'mindmap', theme: 'classic',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      root: node('r', '根', [node('c', '子', [], {
        icons: ['priority-1', 'star'], labels: ['A', 'B'], note: '备注文本',
      })]),
    };
    expect(docToMarkdown(doc)).toContain('## 子 <!-- icons:priority-1|star labels:A|B note:备注文本 -->');
  });
  it('纯文本节点无注释；深度 >6 转列表续接', () => {
    const doc: MindDoc = {
      formatVersion: 1, id: 'd1', title: '根', structure: 'mindmap', theme: 'classic',
      createdAt: '', updatedAt: '',
      root: node('r', '根', [node('a', '一', [node('b', '二')])]),
    };
    expect(docToMarkdown(doc)).toBe('# 根\n## 一\n### 二\n');
    const deep = node('r', '根', [chainOf(8)]);
    function chainOf(depth: number): DocNode {
      return depth === 1 ? node(`n${depth}`, `层${depth}`) : node(`n${depth}`, `层${depth}`, [chainOf(depth - 1)]);
    }
    // 树：根(0) → 层8(1) → … → 层3(6) → 层2(7) → 层1(8)
    const md = docToMarkdown({ ...doc, root: deep });
    expect(md).toContain('- 层3');      // 深度 6 → 顶格列表
    expect(md).toContain('  - 层2');    // 深度 7 → 缩进 2
    expect(md).toContain('    - 层1');  // 深度 8 → 缩进 4
  });
});

describe('markdown 手工导入', () => {
  it('标题层级 → 树深度；跳级挂最近浅父', () => {
    const doc = markdownToDoc('# A\n### C\n## B\n# D', counterIdGen());
    expect(doc.root.text).toBe('A');
    // C(H3) 跳级挂 A；B(H2) 比 C 浅 → 也挂 A；D(H1) 根下
    expect(doc.root.children.map((c) => c.text)).toEqual(['C', 'B', 'D']);
    expect(doc.root.children[0]!.children).toEqual([]);
  });
  it('列表区：H6 下顶格列表 + 缩进嵌套', () => {
    const doc = markdownToDoc('# A\n###### F\n- x\n- y\n  - z\n* w', counterIdGen());
    expect(doc.root.children[0]!.children.map((c) => c.text)).toEqual(['x', 'y', 'w']);
    expect(doc.root.children[0]!.children[1]!.children.map((c) => c.text)).toEqual(['z']);
  });
  it('纯列表与空文档 → 默认根「中心主题」', () => {
    const bullets = markdownToDoc('- a\n  - b', counterIdGen());
    expect(bullets.root.text).toBe('中心主题');
    expect(bullets.root.children[0]!.children.map((c) => c.text)).toEqual(['b']);
    const empty = markdownToDoc('', counterIdGen());
    expect(empty.root.text).toBe('中心主题');
  });
  it('续行并入文本；用户尾注释不被误删', () => {
    const doc = markdownToDoc('# A\nhello world', counterIdGen());
    expect(doc.root.text).toBe('A\nhello world');
    const keep = markdownToDoc('# x <!-- y -->\n正文', counterIdGen());
    expect(keep.root.text).toBe('x <!-- y -->\n正文');
  });
  it('文档级默认值：formatVersion/title/structure/theme', () => {
    const doc = markdownToDoc('# 标题', counterIdGen());
    expect(doc.formatVersion).toBe(1);
    expect(doc.title).toBe('标题');
    expect(doc.structure).toBe('mindmap');
    expect(doc.theme).toBe('classic');
    expect(typeof doc.createdAt).toBe('string');
    expect(doc.createdAt).toBe(doc.updatedAt);
  });
  it('导出→导入→再导出 幂等（第二轮 md 与第一轮完全一致）', () => {
    const doc = buildRichDoc();
    const md1 = docToMarkdown(doc);
    const back = markdownToDoc(md1, counterIdGen());
    const md2 = docToMarkdown(back);
    expect(md2).toBe(md1);
  });
});
