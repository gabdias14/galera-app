import { expect, test } from '@playwright/test';

/**
 * Divisão de custos: a dor do churrasco em que cada um compra uma coisa e
 * ninguém sabe quem ficou no vermelho. O cálculo em si é coberto por
 * tests/split.test.ts — aqui é o caminho pela tela.
 */
test.describe('rachar a conta', () => {
  /** Cria um rolê com dois convidados confirmados e para na aba Rachar. */
  async function criaRoleComConvidados(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-create"]');
    await page.fill('#fTitle', 'Churrasco do rateio');
    await page.fill('#fDate', '2026-11-21');
    await page.fill('#fTime', '13:00');
    await page.fill('#fLocation', 'Quintal — SP');
    await page.click('.submit-btn');
    await expect(page.locator('.invite-card')).toBeVisible();

    // duas pessoas confirmam presença; entre uma e outra, "alterar resposta"
    // limpa o nome guardado no aparelho pra próxima responder como ela mesma
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    for (const nome of ['Ana', 'Bruno']) {
      await page.fill('#guestNameInput', nome);
      await page.click('[data-action="rsvp"][data-status="vou"]');
      await expect(page.locator('.confirmed-panel__msg')).toContainText('Vou!');
      await page.click('[data-action="change-rsvp"]');
    }

    await page.click('[data-action="set-mode"][data-mode="host"]');
    await page.click('[data-action="set-tab"][data-tab="rachar"]');
  }

  test('lança despesas e mostra quem deve pra quem', async ({ page }) => {
    await criaRoleComConvidados(page);
    await expect(page.locator('.empty-note')).toContainText('Ninguém lançou nada ainda');

    // Ana banca a carne: 90 dividido entre Ana e Bruno = 45 cada
    await page.fill('#expenseDesc', 'Carne');
    await page.fill('#expenseAmount', '90');
    await page.fill('#expensePaidBy', 'Ana');
    await page.click('#expenseForm .submit-btn');

    await expect(page.locator('.expense-row')).toHaveCount(1);
    await expect(page.locator('.stat-chip').first()).toContainText('90,00');

    // Ana pagou 90 e consumiu 45: tem 45 a receber do Bruno
    await expect(page.locator('.balance-row').filter({ hasText: 'Ana' })).toContainText('recebe R$ 45,00');
    await expect(page.locator('.balance-row').filter({ hasText: 'Bruno' })).toContainText('deve R$ 45,00');
    await expect(page.locator('.transfer-row')).toHaveCount(1);
    await expect(page.locator('.transfer-row')).toContainText('Bruno');
    await expect(page.locator('.transfer-row')).toContainText('R$ 45,00');
  });

  test('compensa despesas de pagadores diferentes', async ({ page }) => {
    await criaRoleComConvidados(page);

    for (const [desc, valor, quem] of [
      ['Carne', '80', 'Ana'],
      ['Cerveja', '40', 'Bruno'],
    ] as const) {
      await page.fill('#expenseDesc', desc);
      await page.fill('#expenseAmount', valor);
      await page.fill('#expensePaidBy', quem);
      await page.click('#expenseForm .submit-btn');
      await expect(page.locator('.expense-row').filter({ hasText: desc })).toBeVisible();
    }

    // 120 no total, 60 por cabeça: Bruno pagou 40, deve 20 pra Ana
    await expect(page.locator('.stat-chip').first()).toContainText('120,00');
    await expect(page.locator('.transfer-row')).toHaveCount(1);
    await expect(page.locator('.transfer-row')).toContainText('R$ 20,00');
  });

  test('anfitrião apaga despesa e o rateio se refaz', async ({ page }) => {
    await criaRoleComConvidados(page);
    await page.fill('#expenseDesc', 'Gelo');
    await page.fill('#expenseAmount', '30');
    await page.fill('#expensePaidBy', 'Ana');
    await page.click('#expenseForm .submit-btn');
    await expect(page.locator('.expense-row')).toHaveCount(1);

    page.once('dialog', (d) => d.accept());
    await page.click('.expense-row__del');

    await expect(page.locator('.expense-row')).toHaveCount(0);
    await expect(page.locator('.transfer-row')).toHaveCount(0);
  });

  test('convidado vê o próprio saldo sem depender do anfitrião', async ({ page }) => {
    await criaRoleComConvidados(page);
    await page.fill('#expenseDesc', 'Carne');
    await page.fill('#expenseAmount', '90');
    await page.fill('#expensePaidBy', 'Ana');
    await page.click('#expenseForm .submit-btn');
    await expect(page.locator('.expense-row')).toHaveCount(1);

    // na visão do convidado o rateio aparece, mas sem a ação de apagar do dono
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await expect(page.locator('.balance-row').filter({ hasText: 'Bruno' })).toContainText('deve R$ 45,00');
    // o convidado enxerga o rateio, mas não a ação de dono
    await expect(page.locator('.expense-row__del')).toHaveCount(0);
  });
});
