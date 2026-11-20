import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 调试探针端点（仅 dev server 存在，生产构建不含）：
// 前端 POST /__mf-debug → JSON 行追加到仓库根 mf-debug.log（已 gitignore）
function mindflowDebugPlugin() {
  return {
    name: 'mindflow-debug-sink',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/__mf-debug', (req, res) => {
        let body = '';
        req.on('data', (c: Buffer) => { body += c.toString(); });
        req.on('end', () => {
          const line = `${body}\n`;
          void appendFile(resolve(process.cwd(), '../../mf-debug.log'), line);
          res.end('ok');
        });
      });
    },
  };
}

// 桌面前端：端口固定 5173，与 src-tauri/tauri.conf.json 的 devUrl 对齐
export default defineConfig({
  plugins: [react(), tailwindcss(), mindflowDebugPlugin()],
  server: { port: 5173, strictPort: true },
});
