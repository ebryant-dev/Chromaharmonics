import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set VITE_BASE_URL env var to your GitHub Pages repo name when deploying,
// e.g. VITE_BASE_URL=/chromaharmonics/ npm run build
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
