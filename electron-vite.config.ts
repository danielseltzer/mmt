import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    root: 'apps/electron-main',
    build: {
      outDir: '../../dist/main',
      lib: {
        entry: resolve(__dirname, 'apps/electron-main/src/index.ts'),
      },
      rollupOptions: {
        output: {
          format: 'es',
        },
      },
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      extensions: ['.ts', '.js'],
    },
  },
  preload: {
    root: 'apps/electron-preload',
    build: {
      outDir: '../../dist/preload',
      lib: {
        entry: resolve(__dirname, 'apps/electron-preload/src/preload.ts'),
      },
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: 'apps/electron-renderer',
    build: {
      outDir: '../../dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'apps/electron-renderer/index.html'),
        },
      },
    },
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
    },
  },
});