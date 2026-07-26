import { expect, test } from '@playwright/test';

/**
 * Identidade do convidado (token), edição/exclusão de rolê e o direito de
 * exclusão de dados (LGPD art. 18) — backlog #5, #6 e #21.
 */
test.describe('edição e exclusão', () => {
  test('anfitrião edita o rolê e a mudança aparece no convite', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-create"]');
    await page.fill('#fTitle', 'Rolê original');
    await page.fill('#fDate', '2026-10-10');
    await page.fill('#fTime', '20:00');
    await page.fill('#fLocation', 'Local original');
    await page.click('.submit-btn');
    await page.waitForSelector('.invite-card');

    await page.click('[data-action="edit-event"]');
    await page.waitForSelector('#createForm');
    await page.fill('#fTitle', 'Rolê renomeado');
    await page.click('.submit-btn');

    await expect(page.locator('.invite-card')).toContainText('Rolê renomeado');
  });

  test('anfitrião apaga o rolê e ele some da home', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-create"]');
    await page.fill('#fTitle', 'Rolê descartável');
    await page.fill('#fDate', '2026-10-11');
    await page.fill('#fTime', '20:00');
    await page.fill('#fLocation', 'Vai sumir');
    await page.click('.submit-btn');
    await page.waitForSelector('.invite-card');

    page.once('dialog', (d) => d.accept());
    await page.click('[data-action="edit-event"]');
    await page.waitForSelector('#createForm');
    await page.click('[data-action="delete-event"]');

    await expect(page).toHaveURL(/#\/?$/);
    await page.waitForSelector('.evcard');
    await expect(page.locator('.evcard', { hasText: 'Rolê descartável' })).toHaveCount(0);
  });

  test('nome já usado exige diferenciação quando o token se perde', async ({ page }) => {
    // No modo local (sem Supabase), cada navegador é um "aparelho" isolado —
    // então simulamos "perder o token" (reinstalar o app, trocar de celular)
    // apagando só a chave de tokens, no mesmo rolê.
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-create"]');
    await page.fill('#fTitle', 'Rolê com homônimo');
    await page.fill('#fDate', '2026-11-01');
    await page.fill('#fTime', '19:00');
    await page.fill('#fLocation', 'Local X');
    await page.click('.submit-btn');
    await page.waitForSelector('.invite-card');
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await page.fill('#guestNameInput', 'Marina Costa');
    await page.click('[data-action="rsvp"][data-status="vou"]');
    await expect(page.locator('.confirmed-panel__msg')).toContainText('Vou!');

    await page.evaluate(() => {
      localStorage.removeItem('galera.tokens.v2');
      localStorage.removeItem('galera.myname.v1');
    });
    await page.reload();
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await page.fill('#guestNameInput', 'Marina Costa');
    await page.click('[data-action="rsvp"][data-status="talvez"]');

    await expect(page.locator('.error-note')).toContainText('sobrenome');
  });

  test('apagar meus dados remove a resposta e esquece o rolê', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.locator('.evcard:not(.evcard--new)').first().click();
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await page.fill('#guestNameInput', 'Pessoa Apagável');
    await page.click('[data-action="rsvp"][data-status="vou"]');
    await expect(page.locator('.confirmed-panel__msg')).toContainText('Vou!');

    await page.goto('/#/privacidade');
    page.once('dialog', (d) => d.accept());
    await page.click('[data-action="forget-everything"]');
    await page.waitForTimeout(500);

    // voltando ao rolê, o formulário de RSVP aparece de novo — não há mais resposta salva
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.locator('.evcard:not(.evcard--new)').first().click();
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await expect(page.locator('#guestNameInput')).toBeVisible();
  });
});
