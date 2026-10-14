import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    // Версия сборки выводится в подвале — её нужно указывать в баг-репортах
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Относительные пути к ресурсам: сборка работает из корня бакета S3,
  // из любой «папки» внутри него и даже при открытии index.html с диска.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
