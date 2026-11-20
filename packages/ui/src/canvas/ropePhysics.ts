// ============================================================================
// 细绳物理（Verlet 质点链）：钉到钉的悬挂绳模拟。
//
// - 重力使绳自然下垂成悬链状；两端钉点为固定质点；
// - 距离约束（2 次迭代）保持绳段等长；阻尼让扰动收敛；
// - 静止判定（energy < 阈值）后外部 rAF 循环可停——未扰动的绳零持续开销；
// - disturb() 注入冲量（鼠标掠过）；setEndpoints() 移动钉点（拖拽时绳随动甩摆）。
// 纯 TS 零 DOM，可在 node 环境单测；确定性（无随机源）。
// ============================================================================

/** 平面向量 */
export interface Vec {
  x: number;
  y: number;
}

export interface RopeOptions {
  /** 绳段数（质点数 = 段数 + 1），默认 10 */
  segments?: number;
  /** 初始悬垂系数（0=绷直，越大垂得越深），默认 0.15 */
  sag?: number;
  /** 每帧重力加速度（px/frame²），默认 0.5 */
  gravity?: number;
  /** 速度保留系数（<1 即阻尼），默认 0.9 */
  damping?: number;
}

interface Particle {
  x: number;
  y: number;
  px: number;             // 上一帧位置（Verlet）
  py: number;
  pin: boolean;           // 钉点（端点）
}

const num = (v: number): number => Math.round(v * 100) / 100;

/** 两点插值 */
function lerp(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * 悬挂绳：两端钉在 pinA / pinB，中段受重力。
 * 全部方法为同步纯计算；渲染方负责调 step()/pathD()。
 */
export class Rope {
  private pts: Particle[] = [];
  private restLen = 0;
  readonly gravity: number;
  readonly damping: number;

  constructor(a: Vec, b: Vec, opts: RopeOptions = {}) {
    const segs = Math.max(4, Math.min(24, opts.segments ?? 10));
    const sag = opts.sag ?? 0.15;
    this.gravity = opts.gravity ?? 0.5;
    this.damping = opts.damping ?? 0.9;

    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    this.restLen = Math.max(1, dist / segs);

    // 初始形态：直线上叠加正弦悬垂（近似悬链线），落绳动画即由此自然稳定
    const len = dist;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const base = lerp(a, b, t);
      const sagY = Math.sin(Math.PI * t) * sag * len;
      const p: Particle = {
        x: base.x, y: base.y + sagY,
        px: base.x, py: base.y + sagY,
        pin: i === 0 || i === segs,
      };
      this.pts.push(p);
    }
  }

  /** 钉点移动（拖拽节点时）：保持 px 为旧位置 → 天然产生甩摆速度 */
  setEndpoints(a: Vec, b: Vec): void {
    const first = this.pts[0]!;
    const last = this.pts[this.pts.length - 1]!;
    first.x = a.x; first.y = a.y;
    last.x = b.x; last.y = b.y;
    this.restLen = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y) / (this.pts.length - 1));
  }

  /** 注入冲量：force 直接加到最近质点的速度上（鼠标掠过用） */
  disturb(p: Vec, force: Vec): void {
    let best = 1;
    let bestDist = Infinity;
    for (let i = 1; i < this.pts.length - 1; i++) {   // 只扰动中段
      const d = Math.hypot(this.pts[i]!.x - p.x, this.pts[i]!.y - p.y);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    const pt = this.pts[best]!;
    pt.px -= force.x;
    pt.py -= force.y;
  }

  /**
   * 前进一步（Verlet 积分 + 距离约束 2 次迭代）。
   * 钉点不积分；单端受力时修正量全部给自由端。
   */
  step(): void {
    // 1) 积分
    for (const p of this.pts) {
      if (p.pin) continue;
      const vx = (p.x - p.px) * this.damping;
      const vy = (p.y - p.py) * this.damping + this.gravity;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy;
    }
    // 2) 约束迭代
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < this.pts.length - 1; i++) {
        const p = this.pts[i]!;
        const q = this.pts[i + 1]!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const diff = (d - this.restLen) / d / 2;
        const pFixed = p.pin ? 0 : 1;
        const qFixed = q.pin ? 0 : 1;
        const total = pFixed + qFixed;
        if (total === 0) continue;
        p.x += dx * diff * 2 * (pFixed / total);
        p.y += dy * diff * 2 * (pFixed / total);
        q.x -= dx * diff * 2 * (qFixed / total);
        q.y -= dy * diff * 2 * (qFixed / total);
      }
    }
  }

  /** 当前总动能（最大质点速度） */
  energy(): number {
    let max = 0;
    for (const p of this.pts) {
      max = Math.max(max, Math.hypot(p.x - p.px, p.y - p.py));
    }
    return max;
  }

  /** 静止判定：动能低于阈值（外部循环据此停摆省开销） */
  isSettled(): boolean {
    return this.energy() < 0.12;
  }

  /** 渲染路径：质点列 → 平滑二次贝塞尔（中点法） */
  pathD(): string {
    const pts = this.pts;
    const n = pts.length;
    if (n < 3) {
      return `M ${num(pts[0]!.x)} ${num(pts[0]!.y)} L ${num(pts[n - 1]!.x)} ${num(pts[n - 1]!.y)}`;
    }
    let d = `M ${num(pts[0]!.x)} ${num(pts[0]!.y)}`;
    d += ` L ${num(pts[1]!.x)} ${num(pts[1]!.y)}`;
    for (let i = 1; i < n - 2; i++) {
      const c = pts[i]!;
      const nx = pts[i + 1]!;
      const mx = (c.x + nx.x) / 2;
      const my = (c.y + nx.y) / 2;
      d += ` Q ${num(c.x)} ${num(c.y)} ${num(mx)} ${num(my)}`;
    }
    const last = pts[n - 1]!;
    const prev = pts[n - 2]!;
    d += ` Q ${num(prev.x)} ${num(prev.y)} ${num(last.x)} ${num(last.y)}`;
    return d;
  }
}
