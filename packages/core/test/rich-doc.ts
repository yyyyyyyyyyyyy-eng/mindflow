// ============================================================================
// 共享富文档构造器：覆盖全部需要往返的字段与文本边界。
// 注意：构造时参数数组先于函数体求值，id 顺序不是先序 —— 构造完成后按先序
// 重刷 id（与 markdownToDoc / opmlToDoc 的解析序一致），doc.id 最后取。
// ============================================================================

import type { DocNode, MindDoc } from '../src/types';
import { counterIdGen, node } from './helpers';

export function buildRichDoc(): MindDoc {
  const idg = counterIdGen();
  const n = (text: string, children: DocNode[] = [], extra: Partial<DocNode> = {}): DocNode =>
    node(idg(), text, children, extra);
  // 深链到第 8 层（markdown 第 6 层起转无序列表续接）
  const chain = (): DocNode => n('一层', [n('二层', [n('三层', [n('四层', [n('五层', [
    n('六层', [
      n('七层', [
        n('八层'),
      ]),
    ]),
  ])])])])]);
  const root = n('中心主题\n第二行', [
    n('带全部元数据', [], {
      icons: ['priority-1', 'star'],
      labels: ['标签A', 'B|带竖线'],
      note: '备注带 --> 与\n换行与 | 竖线',
      collapsed: true,
      style: { fill: '#ff000080', textColor: '#112233', border: { color: '#aabbcc', width: 2 }, shape: 'ellipse', fontSize: 18 },
    }),
    n('多行文本\n#井号开头\n-横杠开头\n*星号开头\n\\反斜杠开头\n\n空行在内', []),
    n('文本尾随用户注释 <!-- y -->', []),
    n('特殊字符 &<>"\' 混排', [], {
      note: '引号"单引号\'尖括号<>&',
    }),
    n('分支', [
      chain(),
      n('普通节点'),
    ]),
  ]);
  const stamp = counterIdGen();
  const restamp = (x: DocNode): void => {
    x.id = stamp();
    x.children.forEach(restamp);
  };
  restamp(root);
  return {
    formatVersion: 1,
    id: stamp(),
    title: root.text.split('\n')[0]!,
    structure: 'logic-right',
    theme: 'classic',
    root,
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
  };
}
