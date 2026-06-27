import { defineConfig } from 'vite';

export default defineConfig({
  base: '/xeno-spider-solitaire/',
  build: {
    outDir: 'docs',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: {
        safari10: true,
        properties: false,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/x_module/')) return 'x-renderer';
          if (id.includes('/e_module/')) return 'e-engine';
          if (id.includes('/n_module/')) return 'n-input';
          if (id.includes('/o_module/')) return 'o-storage';
        },
      },
    },
  },
});