import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any subpath (e.g. GitHub Pages /kitchen-loop/play/).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
