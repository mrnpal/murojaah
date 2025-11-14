import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills' // Import pluginnya

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Konfigurasi biar simple-peer jalan lancar
      globals: {
        Buffer: true, 
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    // Backup jaga-jaga
    'global': 'window',
  },
})