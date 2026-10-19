import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// lacusapp.ch until launch (owner, 2026-10-19): the coming-soon page as a site of its own, at the
// domain's root. `npm run build:landing` writes dist-landing/, which is published as is (CNAME,
// robots.txt, sitemap.xml and 404.html from landing/public). Only the files the page uses are
// copied from public/: the lake photos and the icons.
const PUBLIC = ['lakes', 'favicon.svg', 'apple-touch-icon.png', 'logo-mark.svg']

export default defineConfig({
  root: resolve(import.meta.dirname, 'landing'),
  base: '/',
  publicDir: resolve(import.meta.dirname, 'landing/public'),
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'lacus-landing-assets',
      apply: 'build',
      closeBundle() {
        for (const name of PUBLIC) {
          cpSync(resolve(import.meta.dirname, 'public', name), resolve(import.meta.dirname, 'dist-landing', name), { recursive: true })
        }
      },
    },
  ],
  build: { outDir: resolve(import.meta.dirname, 'dist-landing'), emptyOutDir: true },
})
