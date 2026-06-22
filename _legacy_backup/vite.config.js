import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/exports': 'http://localhost:3000'
    }
  },
  build: {
    outDir: path.resolve(process.cwd(), 'client/dist'),
    emptyOutDir: true
  }
});
