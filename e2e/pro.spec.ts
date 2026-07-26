import { expect, test } from '@playwright/test';

/** Fecha as abas do wa.me que os botões de envio abrem. */
async function ignoreWhatsAppPopups(page: import('@playwright/test').Page) {
  page.context().on('page', (p) => {
    if (p !== page) p.close().catch(() => undefined);
  });
}

test.describe('Galera Pro', () => {
  test('painel mostra a base de público e a receita da produtora', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.click('[data-action="go-pro"]');

    await expect(page.locator('.kpi').first()).toContainText('pessoas na base');
    const base = await page.locator('.kpi b').first().innerText();
    expect(Number(base)).toBeGreaterThan(20);
  });

  test('segmenta o público e a projeção acompanha o filtro', async ({ page }) => {
    await page.goto('/#/pro/publico');
    await page.waitForSelector('.contact-row');

    const todos = await page.locator('.contact-row').count();
    expect(todos).toBeGreaterThan(20);

    // o topo da lista é o de maior score
    await expect(page.locator('.contact-row').first()).toContainText('VIP');

    const antes = await page.locator('.projection').innerText();
    await page.click('.tier-chip >> nth=0'); // só VIP
    await expect(page.locator('.projection')).not.toHaveText(antes);
    expect(await page.locator('.contact-row').count()).toBeLessThan(todos);
  });

  test('monta campanha só para quem autorizou WhatsApp', async ({ page }) => {
    await ignoreWhatsAppPopups(page);
    await page.goto('/#/pro/publico');
    await page.waitForSelector('.contact-row');

    const alcance = await page.locator('.projection div b').first().innerText();
    await page.click('[data-action="build-campaign"]');
    await expect(page.locator('.queue-item').first()).toBeVisible({ timeout: 20_000 });

    // a fila tem exatamente o número de pessoas alcançáveis projetado
    await expect(page.locator('.msg-preview')).toContainText('autorizou');
    expect(await page.locator('.queue-item').count()).toBe(Number(alcance));

    await page.click('[data-action="send-next"]');
    await expect(page.locator('.queue-item.is-sent')).toHaveCount(1);
  });

  test('cadastra promoter e calcula comissão', async ({ page }) => {
    await page.goto('/#/pro/promoters');
    await page.waitForSelector('#promoterForm');

    const antes = await page.locator('.link-row').count();
    await expect(page.locator('.link-row').first()).toContainText('Comissão');

    await page.fill('#promoterName', 'Duda Ferraz');
    await page.fill('#promoterPhone', '(11) 98888-7777');
    await page.fill('#promoterCommission', '15');
    await page.click('#promoterForm button[type=submit]');

    await expect(page.locator('.link-row')).toHaveCount(antes + 1);
  });

  test('link de convidado credita quem confirmou por ele', async ({ page }) => {
    await page.goto('/#/pro/painel');
    await page.waitForSelector('.link-row');
    await page.locator('.link-actions button[data-action="open-event"]').first().click();
    await page.click('[data-action="set-tab"][data-tab="links"]');

    await page.fill('#linkLabel', 'Lista Aniversariante');
    await page.fill('#linkMax', '40');
    await page.click('#linkForm button[type=submit]');
    await page.waitForTimeout(500);

    const code = await page.locator('.link-code').last().innerText();
    const eventId = page.url().split('/e/')[1].split('/')[0];

    // abre o convite pelo link do promoter e confirma presença
    await page.goto(`/#/e/${eventId}/c/${code}`);
    await page.waitForSelector('.mode-toggle');
    await page.click('[data-action="set-mode"][data-mode="guest"]');
    await page.fill('#guestNameInput', 'Convidada Do Link');
    await page.click('[data-action="rsvp"][data-status="vou"]');
    await expect(page.locator('.confirmed-panel__msg')).toContainText('Vou!');

    // a atribuição aparece no link
    await page.click('[data-action="set-mode"][data-mode="host"]');
    await page.click('[data-action="set-tab"][data-tab="links"]');
    await expect(page.locator('.link-row').last()).toContainText('1 confirmados');
  });

  test('recusa telefone que não é WhatsApp brasileiro válido', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.evcard');
    await page.locator('.evcard:not(.evcard--new)').first().click();
    await page.click('[data-action="set-mode"][data-mode="guest"]');

    await page.fill('#guestNameInput', 'Teste Telefone');
    await page.fill('#guestPhoneInput', '(01) 98765-4321'); // DDD inexistente
    await page.click('[data-action="rsvp"][data-status="vou"]');

    await expect(page.locator('#phoneError')).toBeVisible();
  });

  test('portaria faz check-in, walk-in e atualiza o caixa', async ({ page }) => {
    await page.goto('/#/pro/painel');
    await page.waitForSelector('.link-row');
    // a próxima edição (topo do painel) nasce sem convidados — a portaria com
    // gente de verdade está no histórico simulado, sempre a última linha
    await page.locator('.link-actions button[data-action="open-door"]').last().click();
    await page.waitForSelector('.door-row');

    const presentes = () => page.locator('.kpi b').first();
    const antes = Number(await presentes().innerText());

    await page.fill('#doorAmount', '90');
    await page.locator('.door-row [data-action="checkin"]').first().click();
    await expect(presentes()).toHaveText(String(antes + 1));

    // quem não está na lista entra pelo walk-in
    await page.fill('#doorSearch', 'Fulano Que Chegou');
    await page.click('[data-action="walk-in"]');
    await expect(presentes()).toHaveText(String(antes + 2));
    await expect(page.locator('.kpi').nth(0)).toContainText('1 sem confirmar antes');
  });
});
