import { defineConfig } from 'vite'

export default defineConfig({
  base: '/mqtt-vue-dashboard/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
})
