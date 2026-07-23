import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Served from https://chamberneezy.github.io/boats/ (a project page, not a
  // user/org root page), so built asset URLs must be rooted under /boats/.
  base: '/boats/',
})
