import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // This repository is published as a GitHub Pages project site.
  base: '/Balon-dor-rank/',
});
