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
  },
  define: {
    'import.meta.env.VITE_MQTT_HOSTNAME': JSON.stringify(process.env.VITE_MQTT_HOSTNAME),
    'import.meta.env.VITE_MQTT_PORT': JSON.stringify(process.env.VITE_MQTT_PORT),
    'import.meta.env.VITE_MQTT_USERNAME': JSON.stringify(process.env.VITE_MQTT_USERNAME),
    'import.meta.env.VITE_MQTT_PASSWORD': JSON.stringify(process.env.VITE_MQTT_PASSWORD),
    'import.meta.env.VITE_AUTH_USERNAME': JSON.stringify(process.env.VITE_AUTH_USERNAME),
    'import.meta.env.VITE_AUTH_PASSWORD': JSON.stringify(process.env.VITE_AUTH_PASSWORD)
  }
})
