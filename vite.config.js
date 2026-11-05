import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',

  publicDir: 'public',

  build: {
    outDir: 'src/main/resources/static',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        player: resolve(__dirname, 'player.html')
      },
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: function(assetInfo) {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },

    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },

    cssMinify: true,
    sourcemap: false,

    target: 'es2020',

    assetsInlineLimit: 4096
  },

  server: {
    port: 3000,
    open: '/index.html',
    headers: {
      'Cache-Control': 'no-cache'
    }
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'js')
    }
  }
});
