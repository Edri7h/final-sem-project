import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // react-redux's selector shim is CommonJS. Serving it directly from the
    // hoisted node_modules tree leaves it without named exports in this Vite
    // workspace, so use the tiny React context adapter in src instead.
    alias: {
      'react-redux': fileURLToPath(new URL('./src/react-redux-compat.jsx', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
  // Explicitly prebundle CommonJS dependencies so Vite exposes their named
  // exports consistently, even when dependency discovery is disabled.
  optimizeDeps: {
  include: ['react-router', 'react-router-dom', 'cookie'],
},
  build: { outDir: 'dist' },
});
