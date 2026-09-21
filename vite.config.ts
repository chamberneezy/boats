import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Served from https://chamberneezy.github.io/boats/ (a project page, not a
  // user/org root page), so built asset URLs must be rooted under /boats/.
  // Only applied to the production build — the dev server stays at the root
  // so it can run on a plain http://localhost:8001/ URL.
  base: command === 'build' ? '/boats/' : '/',
  server: {
    port: 8001,
    strictPort: true,
  },
}))
