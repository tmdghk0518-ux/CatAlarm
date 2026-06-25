import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: 'src/main/index.js'
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: 'src/preload/index.js',
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs'
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          cat: resolve('src/renderer/cat.html')
        }
      }
    }
  }
});
