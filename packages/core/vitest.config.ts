import { defineConfig } from 'vitest/config';

// vitest 配置：node 环境（零 DOM），单测与基准分离
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    benchmark: {
      include: ['bench/**/*.bench.ts'],
    },
  },
});
