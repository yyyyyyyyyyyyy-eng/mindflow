// ============================================================================
// fishbone（鱼骨图）测试：快照（小/中/深 + 折叠）、肋交替上下、链上共线、
// 盒缘距恒为 levelGap、主脊/连线计数、确定性。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { layoutFishbone } from '../src/layout/fishbone';
import { assertNoOverlap, makeOpts, node, rectOf, snap } from './helpers';

const SIN60 = Math.sqrt(3) / 2;
const COS60 = 0.5;

const small = node('r', '根', [node('a', '甲'), node('b', '乙')]);

const medium = node('r', '中心主题', [
  node('a', '原因一'),
  node('b', '原因二', [
    node('b1', '子因一'),
    node('b2', '子因二', [node('b21', '孙因')]),
  ]),
  node('c', '比较长的一个一级原因'),
  node('d', '原因四'),
]);

/** 深链：肋 0 上挂 6 层链 */
const deep = node('r', 'root', [
  node('a', '肋一', [
    node('a1', '一', [node('a2', '二', [node('a3', '三', [
      node('a4', '四', [node('a5', '五', [node('a6', '六')])],
    )])])]),
  ]),
  node('b', '肋二'),
]);

describe('fishbone 快照', () => {
  it('小树（2 肋）', () => {
    expect(snap(layoutFishbone(small, makeOpts()))).toMatchSnapshot();
  });
  it('中树（4 肋，肋 1 带两级链，宽短文混合）', () => {
    expect(snap(layoutFishbone(medium, makeOpts()))).toMatchSnapshot();
  });
  it('深树（肋 0 六层链）', () => {
    expect(snap(layoutFishbone(deep, makeOpts()))).toMatchSnapshot();
  });
  it('折叠：肋 1 折叠后链只剩自身', () => {
    const doc = node('r', '根', [
      node('a', '甲'),
      node('b', '乙', [node('b1', '乙一'), node('b2', '乙二')]),
    ]);
    doc.children[1]!.collapsed = true;
    expect(snap(layoutFishbone(doc, makeOpts()))).toMatchSnapshot();
    const r = layoutFishbone(doc, makeOpts());
    expect(r.nodeRects.has('b1')).toBe(false);
    expect(r.nodeRects.has('b2')).toBe(false);
    expect(r.nodeRects.has('b')).toBe(true);
  });
});

describe('fishbone 结构性质', () => {
  it('肋交替上下：偶数肋在上、奇数肋在下；锚点间距 = levelGap', () => {
    const r = layoutFishbone(medium, makeOpts());
    const root = rectOf(r, 'r');
    const spineY = root.y + root.height / 2;
    const ids = ['a', 'b', 'c', 'd'];
    ids.forEach((id, i) => {
      const rc = rectOf(r, id);
      const cy = rc.y + rc.height / 2;
      if (i % 2 === 0) expect(cy).toBeLessThan(spineY);
      else expect(cy).toBeGreaterThan(spineY);
    });
    // 锚点 x：根右缘 + i*60；一级子中心 x = 锚点 + dist*COS60（dist=60+edgeDist）
    const b = rectOf(r, 'b');
    const attachB = root.x + root.width + 1 * 60;
    const bEdge = Math.min(b.width, b.height / 2 / SIN60);
    const bCx = attachB + (60 + bEdge) * COS60;
    expect(b.x + b.width / 2).toBeCloseTo(bCx, 2);
  });
  it('链上节点中心共线（同一条 60° 肋线）', () => {
    const r = layoutFishbone(medium, makeOpts());
    const root = rectOf(r, 'r');
    const attachB = { x: root.x + root.width + 60, y: root.y + root.height / 2 };
    for (const id of ['b', 'b1', 'b2', 'b21']) {
      const rc = rectOf(r, id);
      const cx = rc.x + rc.width / 2 - attachB.x;
      const cy = rc.y + rc.height / 2 - attachB.y;
      // 共线：|cy| = tan60 * |cx|（下肋 dy=+sin60, dx=+cos60）
      expect(Math.abs(cy)).toBeCloseTo(Math.abs(cx) * SIN60 / COS60, 2);
    }
  });
  it('链上相邻盒缘距恒为 levelGap', () => {
    const r = layoutFishbone(deep, makeOpts());
    const chainIds = ['a', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
    let prevDist = -1;
    let prevEdge = -1;
    for (const id of chainIds) {
      const rc = rectOf(r, id);
      const root = rectOf(r, 'r');
      const attachX = root.x + root.width; // 肋 0
      const cx = rc.x + rc.width / 2 - attachX;
      const cyTop = (rc.y + rc.height / 2) - (root.y + root.height / 2);
      const dist = cyTop / -SIN60; // 上肋：dist = -Δy / sin60
      expect(cx / dist).toBeCloseTo(COS60, 6);
      const edge = Math.min(rc.width, rc.height / 2 / SIN60);
      if (prevDist >= 0) {
        expect(dist - prevDist).toBeCloseTo(prevEdge + 60 + edge, 2);
      }
      prevDist = dist;
      prevEdge = edge;
    }
  });
  it('连线计数：主脊 1 条 + 每个非根可见节点恰好 1 条入线；根在左端', () => {
    const r = layoutFishbone(medium, makeOpts());
    expect(r.branches.length).toBe(r.nodeRects.size); // 1 主脊 + (N-1) 条父子线
    const root = rectOf(r, 'r');
    let minX = Infinity;
    for (const rc of r.nodeRects.values()) minX = Math.min(minX, rc.x);
    expect(root.x).toBe(minX);
    // 主脊 fromId=root，d 为水平线段
    const spine = r.branches.find((b) => b.d.startsWith('M ') && b.d.includes(' L ') && !b.d.includes('C'))!;
    expect(spine.fromId).toBe('r');
    expect(spine.toId).toBe('d'); // 最后一个一级子承载主脊
    const ys = spine.d.match(/-?[\d.]+/g)!.map(Number);
    expect(ys[1]).toBe(ys[3]); // 起止同 y
  });
  it('全部节点两两不重叠（测试规模内）', () => {
    assertNoOverlap(layoutFishbone(medium, makeOpts()).nodeRects);
  });
});

describe('fishbone 确定性', () => {
  it('同输入两次运行输出全等', () => {
    const a = snap(layoutFishbone(medium, makeOpts()));
    const b = snap(layoutFishbone(medium, makeOpts()));
    expect(a).toEqual(b);
  });
});
