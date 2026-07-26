import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serve o projeto em /galera-app/, não na raiz do domínio.
  // Em dev e no build local (preview, Capacitor) a raiz continua sendo '/'.
  base: process.env.GH_PAGES ? '/galera-app/' : '/',
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true },
  test: {
    // os .spec.ts de e2e são do Playwright, não do vitest
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
