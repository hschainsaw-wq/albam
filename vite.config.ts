/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相対パスにして GitHub Pages のサブパス（/albam/）でも動くようにする
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
