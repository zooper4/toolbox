import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 1024,
    allowedHosts: true,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 1024,
    strictPort: true,
  },
  plugins: [vue(), tailwindcss()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/node_modules/vue/') || id.includes('/node_modules/@vue/')) return 'vendor-vue';
          if (id.includes('/node_modules/lucide-vue-next/')) return 'vendor-icons';
          if (id.includes('/node_modules/prettier/')) return 'vendor-prettier';
          if (id.includes('/node_modules/node-forge/') || id.includes('/node_modules/sm-crypto/')) return 'vendor-crypto';
          if (id.includes('/node_modules/fast-xml-parser/') || id.includes('/node_modules/yaml/')) return 'vendor-data-format';
          if (id.includes('/node_modules/qrcode/')) return 'vendor-qrcode';
          if (id.includes('/node_modules/diff/') || id.includes('/node_modules/colord/')) return 'vendor-utils';
          return 'vendor';
        },
      },
    },
  },
});