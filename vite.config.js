import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` → normal multi-file build in dist/
// `SINGLE=1 npm run build` → one self-contained index.html (used for the hosted preview)
export default defineConfig({
  // relative asset paths so the site works at username.github.io/<repo>/ as well as a root domain
  base: './',
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 2000 },
});
