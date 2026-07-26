import { defineConfig } from '@playwright/test';

/**
 * Os testes rodam contra o build de produção servido pelo `vite preview` —
 * é o mesmo bundle que vai pro ar, então pega erro que só aparece minificado.
 *
 * Viewport mobile "na mão" (não `devices['iPhone ...']`): esse preset troca
 * `defaultBrowserType` pra webkit, o que quebra em ambientes com só Chromium
 * instalado. O app não usa nada específico de motor de navegador — o
 * tamanho de tela é o que importa pros testes.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // ambientes com Chromium pré-instalado em revisão fixa (ex.: sandboxes
    // de CI) apontam aqui em vez de baixar o binário que o Playwright pede
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ['--no-sandbox'] }
      : undefined,
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
