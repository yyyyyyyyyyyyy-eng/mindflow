// ============================================================================
// StringEdge（type: 'branch'）：钉到钉的物理细绳。
//
// - 几何源：data.pinA/pinB（卡片顶面小钉球心）；缺钉点时回退渲染布局 d；
// - 物理：每条边一个 Rope（Verlet），静止即停 rAF——未扰动的绳零持续开销；
// - 质感：三层描边（深色衬底 + 主题色绳身 + 白色纤维虚线）+ 12px 隐形命中层；
// - 交互：鼠标掠过命中层 → 按指针位移注入冲量 → 绳轻微晃动后自然收敛；
//   拖动节点时钉点随动，绳被甩起再落回（setEndpoints 天然产生摆动速度）。
// ============================================================================

import { BaseEdge } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { useEffect, useRef } from 'react';
import type { MindFlowEdge } from '../flowModel';
import { Rope } from './ropePhysics';

/** 调试探针（dev-only，同 MindMapCanvas 的 window.__mfSendDebug 机制） */
function sendDebugEdge(kind: string, extra: Record<string, unknown> = {}): void {
  const w = window as Window & { __mfSendDebug?: (p: Record<string, unknown>) => void };
  w.__mfSendDebug?.({ k: kind, ...extra });
}

export function StringEdge({ id, data, sourceX, sourceY, targetX, targetY }: EdgeProps<MindFlowEdge>) {
  const pathsRef = useRef<Array<SVGPathElement | null>>([]);
  const ropeRef = useRef<Rope | null>(null);
  const rafRef = useRef(0);
  const lastPtr = useRef<{ x: number; y: number } | null>(null);
  /** 上次应用的钉点坐标（死区防抖：微抖 <0.5px 忽略——提交/重渲染的亚像素抖动不再扰绳） */
  const lastPins = useRef<{ ax: number; ay: number; bx: number; by: number } | null>(null);

  const writeAll = (d: string) => {
    for (const p of pathsRef.current) p?.setAttribute('d', d);
  };

  /** 停止循环：取消挂起的 rAF 并清零引用（防僵尸 ID 卡死后续 ensureLoop——StrictMode 双挂载下必现） */
  const stopLoop = () => {
    if (rafRef.current !== 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  };

  /** 模拟循环：绳未静止时逐帧推进，静止即停（零常驻开销） */
  const ensureLoop = () => {
    if (rafRef.current !== 0) return;
    const tick = () => {
      const rope = ropeRef.current;
      if (rope === null) { rafRef.current = 0; return; }
      rope.step();
      writeAll(rope.pathD());
      if (!rope.isSettled()) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // 实时钉点（2026-11-20 拖动跟随升级）：
  // 优先用 RF 逐帧提供的 handle 坐标（拖动时随节点实时移动 → 绳被甩起再落回）；
  // handle 坐标缺失时回退 data.pinA/pinB（flowModel 计算的钉球心，y-3 与 handle 顶边对齐）。
  const aX = typeof sourceX === 'number' ? sourceX : data?.pinA?.x;
  const aY = typeof sourceY === 'number' ? sourceY - 3 : data?.pinA?.y;
  const bX = typeof targetX === 'number' ? targetX : data?.pinB?.x;
  const bY = typeof targetY === 'number' ? targetY - 3 : data?.pinB?.y;

  // 钉点变更（拖动/重布局）：更新锚点并踢醒模拟；<0.5px 的亚像素抖动走死区（不扰绳）
  useEffect(() => {
    if (aX === undefined || aY === undefined || bX === undefined || bY === undefined) return;
    const prev = lastPins.current;
    if (prev !== null
      && Math.abs(prev.ax - aX) < 0.5 && Math.abs(prev.ay - aY) < 0.5
      && Math.abs(prev.bx - bX) < 0.5 && Math.abs(prev.by - bY) < 0.5) {
      return;                                             // 死区：提交/重渲染的微抖不进物理
    }
    if (prev !== null) {
      // 探针：真实钉点变更（死区外）——排障「松手全体绳晃」用
      sendDebugEdge('pin-change', {
        id,
        dax: Math.round((aX - prev.ax) * 10) / 10,
        day: Math.round((aY - prev.ay) * 10) / 10,
        dbx: Math.round((bX - prev.bx) * 10) / 10,
        dby: Math.round((bY - prev.by) * 10) / 10,
      });
    }
    lastPins.current = { ax: aX, ay: aY, bx: bX, by: bY };
    if (ropeRef.current === null) {
      ropeRef.current = new Rope({ x: aX, y: aY }, { x: bX, y: bY });
    } else {
      ropeRef.current.setEndpoints({ x: aX, y: aY }, { x: bX, y: bY });
    }
    writeAll(ropeRef.current.pathD());
    ensureLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aX, aY, bX, bY]);

  // 卸载清理：停掉 rAF（含清零，见 stopLoop）
  useEffect(() => () => {
    stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 鼠标掠过：把指针位移转成冲量，注入最近质点 → 绳轻晃 */
  const onHover = (e: React.MouseEvent) => {
    const rope = ropeRef.current;
    const hit = pathsRef.current[0];
    if (rope === null || !hit) return;
    const svg = hit.ownerSVGElement;
    const m = svg?.getScreenCTM()?.inverse();
    if (!m) {
      sendDebugEdge('hover-no-ctm');                       // 探针：矩阵缺失时静默退出（排障用）
      return;
    }
    const local = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    const prev = lastPtr.current;
    lastPtr.current = { x: e.clientX, y: e.clientY };
    if (prev === null) return;
    const clamp = (v: number) => Math.max(-6, Math.min(6, v));
    const force = {
      x: clamp((e.clientX - prev.x) * 0.35),
      y: clamp((e.clientY - prev.y) * 0.35),
    };
    sendDebugEdge('hover-impulse', { x: local.x, y: local.y, fx: force.x, fy: force.y });
    rope.disturb(local, force);
    ensureLoop();
  };

  const fallbackD = data?.d;
  const color = data?.color ?? '#4f7cf7';

  // 防御：钉点缺失（布局与文档不一致的过渡帧）→ 回退渲染布局 d
  if (aX === undefined || aY === undefined || bX === undefined || bY === undefined) {
    return typeof fallbackD === 'string'
      ? <BaseEdge id={id} path={fallbackD} style={{ stroke: color, strokeWidth: 2, fill: 'none' }} />
      : null;
  }

  const initialD = typeof fallbackD === 'string' ? fallbackD : '';

  return (
    <g>
      {/* 命中层：透明加宽，pointer-events: stroke，鼠标掠过即扰动 */}
      <path
        ref={(el) => { pathsRef.current[0] = el; }}
        d={initialD}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ pointerEvents: 'stroke', cursor: 'grab' }}
        onMouseMove={onHover}
        onMouseLeave={() => { lastPtr.current = null; }}
      />
      {/* 衬底：柔化绳影 */}
      <path
        ref={(el) => { pathsRef.current[1] = el; }}
        d={initialD}
        fill="none"
        stroke="rgba(16,24,40,0.20)"
        strokeWidth={3.5}
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
      {/* 绳身：主题色 */}
      <path
        ref={(el) => { pathsRef.current[2] = el; }}
        d={initialD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
      {/* 纤维：白虚线高光，营造麻绳质感 */}
      <path
        ref={(el) => { pathsRef.current[3] = el; }}
        d={initialD}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={0.9}
        strokeDasharray="2 3"
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
