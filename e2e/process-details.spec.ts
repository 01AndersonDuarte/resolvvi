import { expect, test, type Page } from '../frontend/e2e-support/playwright';
import {
  expireSession,
  login,
  PROCESS_CNJ,
  registerAccount,
  submitSearch,
  uniqueEmail,
} from '../frontend/e2e-support/session';

test('E2E-01: consulta, detalhes, expansão, paginação e retorno preservam o CNJ', async ({ page }) => {
  const email = uniqueEmail();
  await registerAccount(page, email);
  await login(page, email);
  await submitSearch(page, PROCESS_CNJ);
  await expect(page).toHaveURL(/\/processos\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Processo' })).toBeVisible();
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  await expandFirstLongMovement(page);
  await page.getByRole('button', { name: 'Próxima' }).click();
  await expectPageRange(page, 21);
  await page.getByRole('link', { name: 'Voltar à consulta' }).click();
  await expect(page.getByLabel('Número do processo (CNJ)')).toHaveValue(PROCESS_CNJ);
});

test('E2E-02: acesso direto e recarga funcionam com destinos válidos, inválidos e ausentes', async ({ page }) => {
  const email = uniqueEmail();
  await registerAccount(page, email);
  await login(page, email);
  const processId = await resolveProcessId(page);
  await page.goto(`/processos/${processId}`);
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  await expectPageRange(page, 1);
  await page.reload();
  await expectPageRange(page, 1);
  await page.goto('/processos/invalido');
  await expect(page.getByText('O endereço do processo é inválido.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar à consulta' })).toBeVisible();
  await page.goto('/processos/2147483647');
  await expect(page.getByText(/Não encontramos esse processo/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar à consulta' })).toBeVisible();
});

test('E2E-03: falha localizada do histórico permite nova tentativa sem apagar detalhes', async ({ page }) => {
  const email = uniqueEmail();
  await registerAccount(page, email);
  await login(page, email);
  await submitSearch(page, PROCESS_CNJ);
  await expect(page.getByRole('heading', { name: 'Processo' })).toBeVisible();
  await expectPageRange(page, 1);
  let failedFirstRequest = false;
  await page.route(/movements\?page=2/, async (route) => {
    if (failedFirstRequest) {
      await route.continue();
      return;
    }
    failedFirstRequest = true;
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Próxima' }).click();
  expect(failedFirstRequest).toBe(true);
  await expect(page.getByRole('region', { name: 'Movimentações' }).getByRole('alert'))
    .toContainText('Não foi possível conectar.');
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  await expectPageRange(page, 1);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expectPageRange(page, 21);
});

test('E2E-04: expiração da sessão durante detalhes impede paginação protegida', async ({ page }) => {
  const email = uniqueEmail();
  await registerAccount(page, email);
  await login(page, email);
  await submitSearch(page, PROCESS_CNJ);
  await expectPageRange(page, 1);
  await expireSession(email);
  await page.getByRole('button', { name: 'Próxima' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByText(PROCESS_CNJ)).toHaveCount(0);
});

test('E2E-05: detalhes suportam teclado e layout ampliado em celular e desktop', async ({ page }) => {
  const email = uniqueEmail();
  await registerAccount(page, email);
  await login(page, email);
  await submitSearch(page, PROCESS_CNJ);
  await expect(page.getByRole('main')).toBeVisible();
  await page.keyboard.press('Tab');
  await tabToButton(page, 'Ver conteúdo completo');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Recolher' }).first()).toBeVisible();
  await tabToButton(page, 'Próxima');
  await page.keyboard.press('Enter');
  await expectPageRange(page, 21);
  await tabToLink(page, 'Voltar à consulta');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Número do processo (CNJ)')).toHaveValue(PROCESS_CNJ);
  await checkExpandedLayout(page, { width: 320, height: 780 });
  await checkExpandedLayout(page, { width: 1280, height: 900 });
});

async function resolveProcessId(page: Page): Promise<number> {
  const processId = await page.evaluate(async (cnj) => {
    const response = await fetch('/api/processes/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnj }),
    });
    if (!response.ok) return null;
    const process: unknown = await response.json();
    if (typeof process !== 'object' || process === null || !('id' in process)) return null;
    return typeof process.id === 'number' ? process.id : null;
  }, PROCESS_CNJ);
  expect(Number.isInteger(processId)).toBe(true);
  if (processId === null) throw new Error('Could not resolve the process ID using the CNJ search endpoint.');
  return processId;
}

async function expectPageRange(page: Page, firstItem: number): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'Paginação das movimentações' })
    .getByText(new RegExp(`Movimentações ${firstItem}–${firstItem + 19} de \\d+`))).toBeVisible();
}

async function expandFirstLongMovement(page: Page): Promise<void> {
  const expandButton = page.getByRole('button', { name: 'Ver conteúdo completo' }).first();
  await expect(expandButton).toBeVisible();
  await expandButton.click();
  await expect(page.getByRole('button', { name: 'Recolher' }).first()).toBeVisible();
}

async function tabToButton(page: Page, name: string): Promise<void> {
  const target = page.getByRole('button', { name }).first();
  for (let step = 0; step < 40; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not reach button ${name} using keyboard navigation.`);
}

async function tabToLink(page: Page, name: string): Promise<void> {
  const target = page.getByRole('link', { name });
  for (let step = 0; step < 40; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not reach link ${name} using keyboard navigation.`);
}

async function checkExpandedLayout(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(`/processos/${await resolveProcessId(page)}`);
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
  const zoom = await page.evaluate(() => getComputedStyle(document.documentElement).zoom);
  expect(zoom).toBe('2');
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar à consulta' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
}
