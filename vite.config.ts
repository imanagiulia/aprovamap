import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' garante compatibilidade tanto com Vercel quanto com GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
});
