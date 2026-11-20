import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Long-lived vendor chunks: shared libraries are split from app code so route
// chunks stay small and vendor bytes cache across deploys. three's core and
// renderer are split so neither chunk crosses the 500 kB warning line; both
// load only with the 3D experiments.
const vendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined
  if (/node_modules\/three\/build\/three\.core/.test(id)) return 'three-core'
  if (/node_modules\/three\/(build|src)\//.test(id)) return 'three-renderer'
  if (/node_modules\/three\/examples\//.test(id)) return 'three-addons'
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
  if (/node_modules\/(react-router|react-router-dom)\//.test(id)) return 'router-vendor'
  return undefined
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5175,
    host: true,
  },
  build: {
    outDir: 'dist',
    copyPublicDir: true,
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  }
})
