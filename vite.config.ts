import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages에서는 https://cooperkang.github.io/family-tree/ 아래에서 열린다
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/family-tree/' : '/',
  plugins: [react(), tailwindcss()],
}))
