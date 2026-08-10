import { expect, test } from '@playwright/test';

/**
 * Fluxo do lado pessoal: criar rolê, confirmar presença, enquete, mural,
 * trava do álbum e geração do Recap.
 */
test.describe('convite pessoal', () => {
  test('cria um rolê e chega no painel do anfitrião', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');

    await page.click('[data-action="go-create"]');
    await page.fill('#fTitle', 'Festa Junina da República');
    await page.fill('#fDate', '2026-09-05');
    await page.fill('#fTime', '20:00');
    await page.fill('#fLocation', 'Rua do Lago, 300 — Butantã, SP');
    await page.fill('#fDescription', 'Quentão, pipoca e quadrilha.');
    await page.click('.submit-btn');

    await expect(page.locator('.invite-card')).toBeVisible();
    await expect(page).toHaveURL(/#\/e\//);
    await expect(page.locator('h1')).toContainText('Festa Junina');
  });

  test('confirma presença, vota na enquete e posta no mural', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-create"]');
    await page.fill('#fTitle', 'Churrasco de teste');
    await page.fill('#fDate', '2026-12-05');
    await page.fill('#fTime', '13:00');
    await page.fill('#fLocation', 'Vila Madalena');
    await page.click('.submit-btn');
    await page.waitForSelector('.invite-card');

    // RSVP como convidado
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await page.fill('#guestNameInput', 'Marina Costa');
    await page.click('[data-action="rsvp"][data-status="vou"]');
    await expect(page.locator('.confirmed-panel__msg')).toContainText('Vou!');

    // enquete criada pelo anfitrião
    await page.click('[data-action="set-mode"][data-mode="host"]');
    await page.click('[data-action="set-tab"][data-tab="enquete"]');
    await page.click('[data-action="toggle-poll-form"]');
    await page.fill('#pollQuestion', 'O que você traz?');
    await page.fill('#pollOpt0', 'Carvão');
    await page.fill('#pollOpt1', 'Bebida');
    await page.click('#pollForm .submit-btn');
    await expect(page.locator('.poll-question')).toContainText('O que você traz?');

    // convidado vota
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await page.click('.poll-option-btn >> nth=0');
    await expect(page.locator('.poll-result-content').first()).toContainText('100%');

    // mural
    await page.click('[data-action="set-mode"][data-mode="host"]');
    await page.click('[data-action="set-tab"][data-tab="mural"]');
    await page.fill('#muralInput', 'Levem canecas!');
    await page.press('#muralInput', 'Enter');
    await expect(page.locator('.mural-post p').first()).toHaveText('Levem canecas!');
  });

  test('álbum fica trancado antes do rolê e aberto depois', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');

    // o seed cria um rolê futuro e um que já passou; o primeiro card é o mais antigo
    const cards = page.locator('.evcard:not(.evcard--new)');
    await cards.first().click();
    await page.click('[data-action="set-tab"][data-tab="album"]');
    await expect(page.locator('.upload-zone')).toBeVisible();

    await page.click('[data-action="go-home"]');
    await page.waitForSelector('.evcard');
    await cards.last().click();
    await page.click('[data-action="set-tab"][data-tab="album"]');
    await expect(page.locator('.album-locked')).toBeVisible();
  });

  test('gera o Recap em 1080x1920', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.locator('.evcard:not(.evcard--new)').first().click();
    await page.click('[data-action="set-tab"][data-tab="convite"]');
    await page.click('[data-action="open-recap"]');

    const img = page.locator('.recap-modal__inner img');
    await expect(img).toBeVisible({ timeout: 30_000 });
    const dims = await img.evaluate((el) => ({
      w: (el as HTMLImageElement).naturalWidth,
      h: (el as HTMLImageElement).naturalHeight,
    }));
    expect(dims).toEqual({ w: 1080, h: 1920 });

    await page.click('.recap-modal .lightbox__close');
    await expect(page.locator('.recap-modal')).toHaveCount(0);
  });
});
