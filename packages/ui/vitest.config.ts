import { defineConfig } from 'vitest/config';

// flowModel 为纯函数（仅 type-import React Flow），node 环境即可测试；
// DOM 交互由 apps/desktop 的浏览器冒烟覆盖。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
