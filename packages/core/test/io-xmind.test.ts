// ============================================================================
// XMind 导入测试：fflate zipSync 手工构造最小合法 .xmind fixture、
// 结构映射、样式映射、多 sheet、detached 忽略、旧 XML 格式抛
// NotSupportedXmindError、损坏内容抛错。
// ============================================================================

import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { NotSupportedXmindError, xmindToDoc } from '../src/io/xmind';
import { counterIdGen } from './helpers';

/** 构造 .xmind（zip 含指定文本条目） */
function makeXmind(entries: Record<string, string>): ArrayBuffer {
  const zipped = zipSync(
    Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, strToU8(v)])),
  );
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength);
}

/** 最小合法 content.json（含全部已映射字段形态） */
const SAMPLE_SHEET = {
  id: 'sheet-1',
  class: 'sheet',
  title: '工作表 1',
  structureClass: 'org.xmind.ui.logic.right',
  rootTopic: {
    id: 't0',
    class: 'topic',
    title: '中心主题',
    children: {
      attached: [
        {
          id: 't1',
          title: '分支一',
          markers: [{ markerId: 'priority-1' }, { 'marker-id': 'star' }],
          labels: ['标签A', '标签B'],
          notes: { plain: { content: '这是备注' } },
          style: { properties: { 'svg:fill': '#ffcc00', 'fo:color': '#112233', 'svg:font-weight': 'bold', 'svg:font-size': 18, 'border-line-color': '#aabbcc', 'border-line-width': 2, 'svg:stroke': '#ignored' } },
          children: {
            attached: [{ id: 't11', title: '孙节点' }],
            detached: [{ id: 't99', title: '游离节点' }],
          },
        },
        { id: 't2', title: '分支二', markers: ['flag'] },
      ],
    },
  },
};

describe('xmindToDoc 最小合法 fixture', () => {
  it('解析出正确树、映射字段、忽略 detached', async () => {
    const buf = makeXmind({ 'content.json': JSON.stringify([SAMPLE_SHEET]) });
    const doc = await xmindToDoc(buf, counterIdGen());
    expect(doc.formatVersion).toBe(1);
    expect(doc.title).toBe('中心主题');
    expect(doc.structure).toBe('logic-right'); // 精确映射
    expect(doc.theme).toBe('classic');
    expect(doc.root.text).toBe('中心主题');
    const [c1, c2] = doc.root.children;
    expect(c1!.text).toBe('分支一');
    expect(c1!.icons).toEqual(['priority-1', 'star']);
    expect(c1!.labels).toEqual(['标签A', '标签B']);
    expect(c1!.note).toBe('这是备注');
    expect(c1!.style).toEqual({
      fill: '#ffcc00',
      textColor: '#112233',
      fontWeight: 'bold',
      fontSize: 18,
      border: { color: '#aabbcc', width: 2 },
    });
    expect(c1!.children.map((c) => c.text)).toEqual(['孙节点']); // detached 不进树
    expect(c2!.icons).toEqual(['flag']); // 纯字符串 marker 兼容
  });
  it('sheet 对象形态（非数组）也接受；多 sheet 取第一个', async () => {
    const sheetA = { ...SAMPLE_SHEET, rootTopic: { ...SAMPLE_SHEET.rootTopic, title: 'A根' } };
    const sheetB = { ...SAMPLE_SHEET, rootTopic: { ...SAMPLE_SHEET.rootTopic, title: 'B根' } };
    const obj = await xmindToDoc(makeXmind({ 'content.json': JSON.stringify(sheetA) }), counterIdGen());
    expect(obj.root.text).toBe('A根');
    const arr = await xmindToDoc(makeXmind({ 'content.json': JSON.stringify([sheetA, sheetB]) }), counterIdGen());
    expect(arr.root.text).toBe('A根');
  });
});

describe('xmindToDoc structureClass 映射', () => {
  it.each([
    ['org.xmind.ui.map.clockwise', 'mindmap'],
    ['org.xmind.ui.fishbone.lane', 'fishbone'],
    ['org.xmind.ui.timeline.vertical', 'timeline-v'],
    ['org.xmind.ui.org-chart.down', 'org-chart'],
    ['org.xmind.ui.logic.left', 'logic-right'], // 枚举无左向，归右向
    ['org.xmind.ui.spreadsheet', 'mindmap'],    // 无对应映射默认 mindmap
    [undefined, 'mindmap'],
  ])('%s → %s', async (cls, expected) => {
    const sheet = cls === undefined
      ? { rootTopic: { title: 'r' } }
      : { structureClass: cls, rootTopic: { title: 'r' } };
    const doc = await xmindToDoc(makeXmind({ 'content.json': JSON.stringify([sheet]) }), counterIdGen());
    expect(doc.structure).toBe(expected);
  });
  it('rootTopic 上的 structureClass 作为 sheet 级缺省的回退', async () => {
    const sheet = { rootTopic: { title: 'r', structureClass: 'org.xmind.ui.tree.down' } };
    const doc = await xmindToDoc(makeXmind({ 'content.json': JSON.stringify([sheet]) }), counterIdGen());
    expect(doc.structure).toBe('tree');
  });
});

describe('xmindToDoc 错误处理', () => {
  it('旧 XML 格式（仅 content.xml）→ NotSupportedXmindError', async () => {
    const buf = makeXmind({ 'content.xml': '<xmind-content><sheet/></xmind-content>' });
    await expect(xmindToDoc(buf, counterIdGen())).rejects.toThrowError(NotSupportedXmindError);
    try {
      await xmindToDoc(buf, counterIdGen());
    } catch (e) {
      expect((e as NotSupportedXmindError).name).toBe('NotSupportedXmindError');
      expect((e as Error).message).toContain('旧版');
    }
  });
  it('损坏的 content.json → 普通错误（非 NotSupported）', async () => {
    const buf = makeXmind({ 'content.json': '{bad json' });
    await expect(xmindToDoc(buf, counterIdGen())).rejects.toThrowError(/content.json 解析失败/);
  });
  it('包内无 content → 明确错误；缺少 rootTopic → 明确错误', async () => {
    await expect(xmindToDoc(makeXmind({ 'metadata.json': '{}' }), counterIdGen()))
      .rejects.toThrowError(/未找到 content.json/);
    await expect(xmindToDoc(makeXmind({ 'content.json': '[{"title":"x"}]' }), counterIdGen()))
      .rejects.toThrowError(/缺少 rootTopic/);
  });
  it('深层路径下的 content.json 也能定位（防御式尾匹配）', async () => {
    const buf = makeXmind({ 'dir/sub/content.json': JSON.stringify([SAMPLE_SHEET]) });
    const doc = await xmindToDoc(buf, counterIdGen());
    expect(doc.root.text).toBe('中心主题');
  });
});
