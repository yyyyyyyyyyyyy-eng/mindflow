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
  private readonly segs: number;
  private readonly sagRatio: number;
  readonly gravity: number;
  readonly damping: number;

  /** 绳段自然长度 = 跨距 × 弧长系数（1 + 8·sag²/3，抛物线弧长） / 段数
   *  ——松弛量编入绳长：悬垂态段长=自然长度，约束不再与重力拔河（2026-11-20 修订） */
  private computeRestLen(dist: number): number {
    return Math.max(1, dist * (1 + (8 * this.sagRatio * this.sagRatio) / 3) / this.segs);
  }

  constructor(a: Vec, b: Vec, opts: RopeOptions = {}) {
    const segs = Math.max(4, Math.min(24, opts.segments ?? 10));
    const sag = opts.sag ?? 0.15;
    this.segs = segs;
    this.sagRatio = sag;
    this.gravity = opts.gravity ?? 0.5;
    this.damping = opts.damping ?? 0.9;

    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    this.restLen = this.computeRestLen(dist);

    // 初始形态：直线上叠加正弦悬垂（近似悬链线），落绳动画即由此自然稳定
    // 注意：悬垂只加在中段质点上——sin(π) 在 IEEE 下非严格为 0，加在端点上会漂移钉点
    const len = dist;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const base = lerp(a, b, t);
      const sagY = (i === 0 || i === segs)
        ? 0
        : Math.sin(Math.PI * t) * sag * len;
      const p: Particle = {
        x: base.x, y: base.y + sagY,
        px: base.x, py: base.y + sagY,
        pin: i === 0 || i === segs,
      };
      this.pts.push(p);
    }
  }

  /** 钉点移动（拖动/重布局）：移动锚点并清零其速度——绳经约束松弛地跟上，无刻意甩摆 */
  setEndpoints(a: Vec, b: Vec): void {
    const first = this.pts[0]!;
    const last = this.pts[this.pts.length - 1]!;
    first.x = a.x; first.y = a.y;
    first.px = a.x; first.py = a.y;                      // 锚点速度清零（否则旧 px 残留 → 松手甩摆）
    last.x = b.x; last.y = b.y;
    last.px = b.x; last.py = b.y;
    this.restLen = this.computeRestLen(Math.hypot(b.x - a.x, b.y - a.y));
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
    // 2) 约束迭代（Gauss-Seidel 扫掠：次数须足够在单帧内把重力注入的段误差压回自然长度，
    //    否则绳会卡在「重力压下=扫掠抬起」的深层固定点，段误差永不清零——实测 4 次残差 0.74，24 次收敛）
    for (let iter = 0; iter < 24; iter++) {
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

  /** 只读访问质点坐标（测试/渲染用） */
  point(i: number): Vec {
    const p = this.pts[i];
    if (!p) throw new Error(`Rope.point(${i}) 越界：共 ${this.pts.length} 点`);
    return { x: p.x, y: p.y };
  }

  get pointCount(): number {
    return this.pts.length;
  }

  /** 最大约束误差：段长偏离 restLen 的最大值（钉点被移动后此值很大，须继续松弛） */
  constraintError(): number {
    let max = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const p = this.pts[i]!;
      const q = this.pts[i + 1]!;
      max = Math.max(max, Math.abs(Math.hypot(q.x - p.x, q.y - p.y) - this.restLen));
    }
    return max;
  }

  /** 静止判定：动能与约束误差均低于阈值（只查动能会漏掉「锚点已移、绳未跟上」的中间态；
   *  阈值 0.15 覆盖 4 次迭代后的重力稳态残差 ~0.03，而锚点被拖走时段误差为数十像素量级） */
  isSettled(): boolean {
    return this.energy() < 0.12 && this.constraintError() < 0.15;
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
