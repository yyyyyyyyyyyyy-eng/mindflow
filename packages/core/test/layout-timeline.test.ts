// ============================================================================
// timeline-h / timeline-v 测试：快照（小/中/深 + 折叠）、主轴等距、交替侧、
// 小栈根与父共心、连线计数、确定性。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { layoutTimelineH, layoutTimelineV } from '../src/layout/timeline';
import type { DocNode } from '../src/types';
import { assertNoOverlap, makeOpts, node, rectOf, snap } from './helpers';

const small = node('r', '根', [node('t1', '一'), node('t2', '二'), node('t3', '三')]);

/** 中树：4 个一级节点；p2 带三个二级（奇偶交替）且其中一个有孙链 */
const medium = node('r', '中心主题', [
  node('p0', 'English mixed 中英混排'), // 宽节点置于主轴（安全）
  node('p1', '阶段一', [
    node('s1', '要点甲'),
    node('s2', '要点乙', [node('g1', '细节'), node('g2', '再深')]),
    node('s3', '要点丙'),
  ]),
  node('p2', '阶段二'),
  node('p3', '阶段三', [node('x1', '附注')]),
]);

/** 深树：p0 的第一个二级下挂 6 层链 */
const deep = node('r', 'root', [
  node('p0', '阶段', [
    node('s0', '一', [
      node('c1', '二', [node('c2', '三', [node('c3', '四', [
        node('c4', '五', [node('c5', '六')]),
      ])])]),
    ]),
  ]),
  node('p1', '尾'),
]);

/** 统计深度 ≥2 的可见节点数（每个恰有一条入线） */
function countDeepNodes(root: DocNode): number {
  let n = 0;
  const walk = (d: DocNode, depth: number): void => {
    for (const c of d.children ?? []) {
      if (depth + 1 >= 2) n++;
      if (!c.collapsed) walk(c, depth + 1);
    }
  };
  walk(root, 0);
  return n;
}

describe('timeline-h 快照', () => {
  it('小树（3 个一级节点）', () => {
    expect(snap(layoutTimelineH(small, makeOpts()))).toMatchSnapshot();
  });
  it('中树（含交替小栈与孙链）', () => {
    expect(snap(layoutTimelineH(medium, makeOpts()))).toMatchSnapshot();
  });
  it('深树（6 层小栈链）', () => {
    expect(snap(layoutTimelineH(deep, makeOpts()))).toMatchSnapshot();
  });
  it('折叠：p1 折叠后小栈整体消失', () => {
    const doc = node('r', '根', [
      node('p0', '阶段零'),
      node('p1', '阶段一', [node('s1', '甲'), node('s2', '乙')]),
      node('p2', '阶段二'),
    ]);
    doc.children[1]!.collapsed = true;
    expect(snap(layoutTimelineH(doc, makeOpts()))).toMatchSnapshot();
    const r = layoutTimelineH(doc, makeOpts());
    expect(r.nodeRects.has('s1')).toBe(false);
    expect(r.nodeRects.has('s2')).toBe(false);
  });
});

describe('timeline-h 结构性质', () => {
  it('深度 1 沿主轴等距（盒缘间距恒 levelGap），且全部中心落在主轴上', () => {
    const r = layoutTimelineH(medium, makeOpts());
    const root = rectOf(r, 'r');
    const axisY = root.y + root.height / 2;
    let prevRight = root.x + root.width;
    for (const id of ['p0', 'p1', 'p2', 'p3']) {
      const rc = rectOf(r, id);
      expect(rc.x).toBe(prevRight + 60);
      expect(rc.y + rc.height / 2).toBe(axisY);
      prevRight = rc.x + rc.width;
    }
  });
  it('二级交替上下：偶数在上（y 小）、奇数在下', () => {
    const r = layoutTimelineH(medium, makeOpts());
    const root = rectOf(r, 'r');
    const axisY = root.y + root.height / 2;
    const s1 = rectOf(r, 's1');
    const s2 = rectOf(r, 's2');
    const s3 = rectOf(r, 's3');
    expect(s1.y + s1.height).toBeLessThanOrEqual(axisY);       // s1 在上
    expect(s2.y).toBeGreaterThanOrEqual(axisY);                // s2 在下
    expect(s3.y + s3.height).toBeLessThanOrEqual(axisY);       // s3 又在上
    // 小栈根与父同 x 中心
    const p1 = rectOf(r, 'p1');
    expect(s1.x + s1.width / 2).toBe(p1.x + p1.width / 2);
  });
  it('连线计数 = 主轴 1 条 + 每个深度≥2 节点恰一条入线；主轴 toId=末位一级', () => {
    const r = layoutTimelineH(medium, makeOpts());
    expect(r.branches.length).toBe(1 + countDeepNodes(medium));
    const axis = r.branches.find((b) => b.fromId === 'r' && b.toId === 'p3')!;
    expect(axis).toBeDefined();
    const ys = axis.d.match(/-?[\d.]+/g)!.map(Number);
    expect(ys[1]).toBe(ys[3]); // 主轴水平
  });
  it('全部节点两两不重叠（测试规模内）', () => {
    assertNoOverlap(layoutTimelineH(medium, makeOpts()).nodeRects);
  });
});

describe('timeline-v（旋转一致性）', () => {
  it('快照（中树）', () => {
    expect(snap(layoutTimelineV(medium, makeOpts()))).toMatchSnapshot();
  });
  it('深度 1 沿垂直主轴等距且同 x 中心；二级偶左奇右', () => {
    const r = layoutTimelineV(medium, makeOpts());
    const root = rectOf(r, 'r');
    const axisX = root.x + root.width / 2;
    let prevBottom = root.y + root.height;
    for (const id of ['p0', 'p1', 'p2', 'p3']) {
      const rc = rectOf(r, id);
      expect(rc.y).toBe(prevBottom + 60);
      expect(rc.x + rc.width / 2).toBe(axisX);
      prevBottom = rc.y + rc.height;
    }
    const p1 = rectOf(r, 'p1');
    const s1 = rectOf(r, 's1');
    const s2 = rectOf(r, 's2');
    expect(s1.x + s1.width).toBeLessThanOrEqual(p1.x); // s1 在左
    expect(s2.x).toBeGreaterThanOrEqual(p1.x + p1.width); // s2 在右
    expect(s1.y + s1.height / 2).toBe(p1.y + p1.height / 2);
  });
  it('快照（小树）与确定性', () => {
    expect(snap(layoutTimelineV(small, makeOpts()))).toMatchSnapshot();
    const a = snap(layoutTimelineV(medium, makeOpts()));
    const b = snap(layoutTimelineV(medium, makeOpts()));
    expect(a).toEqual(b);
  });
});

describe('timeline-h 确定性', () => {
  it('同输入两次运行输出全等', () => {
    const a = snap(layoutTimelineH(medium, makeOpts()));
    const b = snap(layoutTimelineH(medium, makeOpts()));
    expect(a).toEqual(b);
  });
  it('仅根：无主轴无连线', () => {
    const r = layoutTimelineH(node('r', '根'), makeOpts());
    expect(r.branches.length).toBe(0);
    expect(r.nodeRects.size).toBe(1);
  });
});
