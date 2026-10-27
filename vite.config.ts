import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base keeps the production build portable: it works at the domain
  // root, in a GitHub Pages project sub-path (e.g. /chessr/) and from dist/.
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
