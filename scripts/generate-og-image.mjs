// Gera public/og-default.png (1200x630) — o card genérico que aparece quando
// o link do Galera é colado no WhatsApp/Instagram fora de um rolê específico.
// Roda uma vez (ou de novo se a marca mudar): `node scripts/generate-og-image.mjs`.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/og-default.png');

const html = `
<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Bricolage'; src: local('sans-serif'); }
  html, body { margin: 0; }
  .card {
    width: 1200px; height: 630px; display: flex; flex-direction: column;
    justify-content: center; align-items: flex-start; padding: 90px;
    box-sizing: border-box;
    background: linear-gradient(135deg, #FFE1E4 0%, #FFF0CE 50%, #E9E2FF 100%);
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  .emoji { font-size: 140px; margin-bottom: 20px; }
  .title { font-size: 88px; font-weight: 800; color: #1A1A1A; margin: 0 0 18px; }
  .sub { font-size: 36px; color: #4A4A4A; margin: 0; max-width: 900px; }
</style></head>
<body>
  <div class="card">
    <div class="emoji">🎉</div>
    <p class="title">Galera</p>
    <p class="sub">Crie o convite do rolê, veja quem confirmou e compartilhe o recap.</p>
  </div>
</body></html>
`;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: process.env.PLAYWRIGHT_CHROMIUM_PATH ? ['--no-sandbox'] : [],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
const buffer = await page.screenshot({ type: 'png' });
writeFileSync(outPath, buffer);
await browser.close();
console.log(`og-default.png escrito em ${outPath}`);
