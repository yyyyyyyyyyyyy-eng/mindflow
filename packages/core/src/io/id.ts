// ============================================================================
// 默认 id 生成器。
// 契约 §1 写明「默认 nanoid」——为避免引入新依赖，此处用 crypto.randomUUID
// 等价替代（唯一性同量级、零依赖）；若主对话裁决必须 nanoid，替换本文件即可。
// 测试一律注入 counterIdGen 保证确定性。
// ============================================================================

let fallbackCounter = 0;

/** 默认 id 生成：crypto.randomUUID；极少数无 crypto 环境退化为计数器 */
export function defaultIdGen(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') return g.crypto.randomUUID();
  fallbackCounter += 1;
  return `mf-${fallbackCounter}`;
}
