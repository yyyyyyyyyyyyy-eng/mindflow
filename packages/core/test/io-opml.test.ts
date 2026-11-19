// ============================================================================
// OPML 序列化测试：往返无损（含 XML 特殊字符/多行文本/全部元数据字段）、
// 解析器健壮性（DOCTYPE/CDATA/数字实体/单引号属性/多顶层 outline）、
// 非法输入抛错。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { docToOpml, opmlToDoc } from '../src/io/opml';
import { counterIdGen } from './helpers';
import { buildRichDoc } from './rich-doc';

describe('opml 往返无损', () => {
  it('富文档 roundtrip：树全等（含 id，计数器同序）', () => {
    const doc = buildRichDoc();
    const xml = docToOpml(doc);
    const back = opmlToDoc(xml, counterIdGen());
    expect(back.root).toEqual(doc.root); // XML 特殊字符、引号、换行均无损
  });
  it('导出格式：标准头 + outline 递归 + 扩展属性', () => {
    const doc = buildRichDoc();
    const xml = docToOpml(doc);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">')).toBe(true);
    expect(xml).toContain('<title>中心主题</title>');
    expect(xml).toContain('<dateCreated>2026-11-19T00:00:00.000Z</dateCreated>');
    expect(xml).toContain('text="带全部元数据"');
    expect(xml).toContain('_collapsed="true"');
    expect(xml).toContain('_icons="priority-1|star"');
    expect(xml).toContain('_labels="标签A|B\\|带竖线"');
    expect(xml).toContain('<outline text="八层"/>'); // 叶子自闭合
  });
});

describe('opml 解析器健壮性', () => {
  it('DOCTYPE + 注释 + 处理指令 + 单引号属性 + 数字实体', () => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE opml PUBLIC "-//xyz//DTD 1.0//EN" "http://x.example/dtd" [<!ELEMENT opml ANY>]>',
      '<!-- 顶部注释 -->',
      '<?instruction ignored?>',
      "<opml version='2.0'>",
      '  <head><title>T</title></head>',
      '  <body>',
      '    <outline text="A&amp;B&#10;C" title="备份">',
      '      <outline text="&lt;尖括号&gt;"/><![CDATA[游离字符数据]]>',
      '    </outline>',
      '  </body>',
      '</opml>',
    ].join('\n');
    const doc = opmlToDoc(xml, counterIdGen());
    expect(doc.root.text).toBe('A&B\nC');
    expect(doc.root.children[0]!.text).toBe('<尖括号>');
  });
  it('多个顶层 outline：第一个为根，其余并入根的孩子', () => {
    const xml = '<opml version="2.0"><body>'
      + '<outline text="首根"><outline text="孩子"/></outline>'
      + '<outline text="第二顶层"/>'
      + '</body></opml>';
    const doc = opmlToDoc(xml, counterIdGen());
    expect(doc.root.text).toBe('首根');
    expect(doc.root.children.map((c) => c.text)).toEqual(['孩子', '第二顶层']);
  });
  it('空 body → 默认根「中心主题」', () => {
    const doc = opmlToDoc('<opml version="2.0"><head/><body/></opml>', counterIdGen());
    expect(doc.root.text).toBe('中心主题');
    expect(doc.root.children).toEqual([]);
  });
  it('文档级默认值', () => {
    const doc = opmlToDoc('<opml version="2.0"><body><outline text="标题"/></body></opml>', counterIdGen());
    expect(doc.formatVersion).toBe(1);
    expect(doc.title).toBe('标题');
    expect(doc.structure).toBe('mindmap');
    expect(doc.theme).toBe('classic');
    expect(doc.createdAt).toBe(doc.updatedAt);
  });
});

describe('opml 非法输入', () => {
  it('根不是 opml / 缺 body / 标签不匹配 → 抛错', () => {
    expect(() => opmlToDoc('<html><body/></html>', counterIdGen())).toThrowError(/不是 <opml>/);
    expect(() => opmlToDoc('<opml version="2.0"><head/></opml>', counterIdGen())).toThrowError(/缺少 <body>/);
    expect(() => opmlToDoc('<opml><body><outline text="x"></body></opml>', counterIdGen()))
      .toThrowError(/闭合标签不匹配/);
  });
});
