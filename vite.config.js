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
    // MQTT connection settings with fallback values
    'import.meta.env.VITE_MQTT_HOSTNAME': JSON.stringify(process.env.VITE_MQTT_HOSTNAME || '270e5d38ecbe4c2b89b7e54a787d3068.s1.eu.hivemq.cloud'),
    'import.meta.env.VITE_MQTT_PORT': JSON.stringify(process.env.VITE_MQTT_PORT || '8884'),
    'import.meta.env.VITE_MQTT_USERNAME': JSON.stringify(process.env.VITE_MQTT_USERNAME || 'githubuser'),
    // Authentication credentials with fallback values to prevent configuration errors
    'import.meta.env.VITE_MQTT_PASSWORD': JSON.stringify(process.env.VITE_MQTT_PASSWORD || '2pQ0`0%lbtSe'),
    'import.meta.env.VITE_AUTH_USERNAME': JSON.stringify(process.env.VITE_AUTH_USERNAME || 'admin'),
    'import.meta.env.VITE_AUTH_PASSWORD': JSON.stringify(process.env.VITE_AUTH_PASSWORD || 'admin')
  }
})