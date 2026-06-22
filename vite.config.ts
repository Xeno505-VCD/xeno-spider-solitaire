import { defineConfig } from 'vite';

export default defineConfig({
  base: '/snake-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});