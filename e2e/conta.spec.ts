import { expect, test } from '@playwright/test';

/**
 * Conta e assinatura.
 *
 * O teste mais importante deste arquivo é o primeiro: **o convidado nunca
 * pode topar com uma tela de login**. Se isso quebrar, quebra junto a tese de
 * distribuição do produto — o convite precisa funcionar com um clique pra
 * circular no WhatsApp.
 */
test.describe('conta', () => {
  test('convidado responde ao convite sem nenhuma conta', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-create"]');
    await page.fill('#fTitle', 'Rolê sem cadastro');
    await page.fill('#fDate', '2026-12-20');
    await page.fill('#fTime', '21:00');
    await page.fill('#fLocation', 'Pinheiros, SP');
    await page.click('.submit-btn');
    await expect(page.locator('.invite-card')).toBeVisible();

    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await page.fill('#guestNameInput', 'Convidada Anônima');
    await page.click('[data-action="rsvp"][data-status="vou"]');

    await expect(page.locator('.confirmed-panel__msg')).toContainText('Vou!');
    // nenhum pedido de e-mail no caminho do convidado
    await expect(page.locator('#authEmail')).toHaveCount(0);
  });

  test('entra pelo e-mail e a home passa a mostrar a conta', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-entrar"]');
    await page.fill('#authEmail', 'gabriel@teste.com');
    await page.click('#authForm .submit-btn');

    // no modo local a sessão é imediata e volta pra home
    await expect(page.locator('.evcard').first()).toBeVisible();
    await expect(page.locator('[data-action="go-entrar"]')).toContainText('gabriel@teste.com');
  });

  test('sai da conta e volta ao estado anônimo', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-entrar"]');
    await page.fill('#authEmail', 'gabriel@teste.com');
    await page.click('#authForm .submit-btn');
    await expect(page.locator('[data-action="go-entrar"]')).toContainText('gabriel@teste.com');

    page.once('dialog', (d) => d.accept());
    await page.click('[data-action="go-entrar"]');
    await page.click('[data-action="sign-out"]');

    await expect(page.locator('[data-action="go-entrar"]')).toContainText('salvar meus rolês');
  });
});

test.describe('plano da produtora', () => {
  test('no Pro os recursos pagos aparecem', async ({ page }) => {
    // a demonstração nasce no Pro (ver src/data/seed.ts)
    await page.goto('/#/pro/promoters');
    await expect(page.locator('.plan-badge--pro')).toBeVisible();
    await expect(page.locator('.paywall')).toHaveCount(0);
    await expect(page.locator('.link-row').first()).toBeVisible();
  });

  test('no grátis promoters, campanha e exportação ficam bloqueados', async ({ page }) => {
    await page.goto('/#/pro/painel');
    await page.click('[data-action="demo-set-plan"][data-plan="free"]');
    await expect(page.locator('.plan-badge--free')).toBeVisible();

    await page.goto('/#/pro/promoters');
    await expect(page.locator('.paywall')).toBeVisible();
    await expect(page.locator('.paywall__title')).toContainText('Promoters');

    await page.goto('/#/pro/publico');
    await expect(page.locator('.paywall')).toBeVisible();
    await expect(page.locator('.pro-btn--locked')).toBeVisible();
  });

  test('o botão de assinar leva pra fora do app, nunca a um checkout interno', async ({ page }) => {
    await page.goto('/#/pro/painel');
    await page.click('[data-action="demo-set-plan"][data-plan="free"]');
    await page.goto('/#/pro/promoters');

    const cta = page.locator('.paywall__cta');
    // comissão de 15-30% da loja só existe em compra dentro do app:
    // por isso o CTA é um link externo, não um formulário de pagamento
    await expect(cta).toHaveAttribute('target', '_blank');
    await expect(cta).toHaveAttribute('href', /\/assinar/);
  });

  test('a portaria pede assinatura no plano grátis', async ({ page }) => {
    await page.goto('/#/pro/painel');
    await page.click('[data-action="demo-set-plan"][data-plan="free"]');
    await page.click('[data-action="open-door"]');

    await expect(page.locator('.paywall__title')).toContainText('Portaria');
    await expect(page.locator('#doorSearch')).toHaveCount(0);
  });
});
