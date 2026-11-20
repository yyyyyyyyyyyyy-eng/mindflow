// ============================================================================
// Rope 单测（纯函数，node 环境）：重力悬垂收敛、扰动响应、钉点移动、
// 路径形态与确定性。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { Rope } from '../src/canvas/ropePhysics';

/** 步进到静止（带上限防死循环） */
function settle(rope: Rope, max = 400): void {
  for (let i = 0; i < max && !rope.isSettled(); i++) rope.step();
}

describe('Rope（钉间细绳物理）', () => {
  it('重力悬垂：静止后中段显著低于两端连线', () => {
    const rope = new Rope({ x: 0, y: 0 }, { x: 100, y: 0 }, { segments: 10, sag: 0.15 });
    settle(rope);
    expect(rope.isSettled()).toBe(true);
    const mid = rope.point(Math.floor(rope.pointCount / 2));
    expect(mid.y).toBeGreaterThan(5);            // 100px 跨距悬垂 ~15px
  });

  it('钉点固定：step 过程中两端点永不动', () => {
    const rope = new Rope({ x: 10, y: 5 }, { x: 210, y: 5 });
    for (let i = 0; i < 50; i++) {
      rope.step();
      expect(rope.point(0)).toEqual({ x: 10, y: 5 });
      expect(rope.point(rope.pointCount - 1)).toEqual({ x: 210, y: 5 });
    }
  });

  it('扰动响应：disturb 抬升动能，随后重新收敛', () => {
    const rope = new Rope({ x: 0, y: 0 }, { x: 200, y: 0 });
    settle(rope);
    const before = rope.energy();
    rope.disturb({ x: 100, y: 0 }, { x: 0, y: -12 });
    const after = rope.energy();
    expect(after).toBeGreaterThan(before * 2);
    settle(rope);
    expect(rope.isSettled()).toBe(true);
  });

  it('钉点移动：setEndpoints 更新两端并重新稳定，锚点精确落位', () => {
    const rope = new Rope({ x: 0, y: 0 }, { x: 100, y: 0 });
    settle(rope);
    rope.setEndpoints({ x: 50, y: -20 }, { x: 150, y: 40 });
    settle(rope);
    expect(rope.point(0)).toEqual({ x: 50, y: -20 });
    expect(rope.point(rope.pointCount - 1)).toEqual({ x: 150, y: 40 });
  });

  it('路径形态：M 起于首钉、含 Q 平滑段、终点精确等于末钉', () => {
    const rope = new Rope({ x: 0, y: 0 }, { x: 100, y: 0 });
    settle(rope);
    const d = rope.pathD();
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d).toContain(' Q ');
    expect(d.endsWith('100 0')).toBe(true);
  });

  it('确定性：同参数同操作序列产出完全一致的路径', () => {
    const run = (): string => {
      const rope = new Rope({ x: 0, y: 0 }, { x: 300, y: 0 });
      rope.disturb({ x: 150, y: 0 }, { x: 3, y: -5 });
      for (let i = 0; i < 100; i++) rope.step();
      return rope.pathD();
    };
    expect(run()).toBe(run());
  });
});
