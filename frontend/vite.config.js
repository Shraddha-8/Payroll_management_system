import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Dev server proxies /api -> FastAPI so the browser stays same-origin.
// (The backend currently has no CORS middleware, so direct cross-origin calls would be blocked.)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8000'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      },
    },
  }
})
