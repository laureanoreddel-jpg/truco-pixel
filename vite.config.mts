import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
