import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true },
  test: {
    // os .spec.ts de e2e são do Playwright, não do vitest
    include: ['tests/**/*.test.ts'],
  },
});
