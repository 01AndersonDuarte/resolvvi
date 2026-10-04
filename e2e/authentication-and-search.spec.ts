import { expect, test } from '../frontend/e2e-support/playwright';
import {
  expireSession,
  login,
  PROCESS_CNJ,
  registerAccount,
  submitSearch,
  UNKNOWN_CNJ,
  uniqueEmail,
} from '../frontend/e2e-support/session';

test('E2E-01: cadastro imediato, login e consulta', async ({ page }) => {
  const email = uniqueEmail();
  await registerAccount(page, email);
  await login(page, email);
  await submitSearch(page, PROCESS_CNJ);
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à consulta' }).click();
  await expect(page.getByLabel('Número do processo (CNJ)')).toHaveValue(PROCESS_CNJ);
});

test('E2E-02: e-mail sintético é aceito e cadastro duplicado preserva a senha original', async ({ page }) => {
  const email = uniqueEmail();
  await registerAccount(page, email);
  await page.goto('/criar-conta');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-e2e-substituta');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('alert')).toContainText('Já existe uma conta com esse e-mail.');
  await login(page, email);
});

test('E2E-03: consulta distingue validação, ausência e falha, preserva entrada e permite corrigir', async ({ page }) => {
  const email = uniqueEmail();
  await page.setViewportSize({ width: 320, height: 780 });
  await registerAccount(page, email);
  await login(page, email);
  await page.getByLabel('Número do processo (CNJ)').fill('invalido');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByText(/Confira o formato/)).toBeVisible();
  await expect(page.getByLabel('Número do processo (CNJ)')).toHaveValue('invalido');
  await submitSearch(page, UNKNOWN_CNJ);
  await expect(page.getByText(/Não encontramos esse processo/)).toBeVisible();
  const cnjField = page.getByLabel('Número do processo (CNJ)');
  const fieldMetrics = await cnjField.evaluate((field: HTMLInputElement) => ({
    clientWidth: field.clientWidth,
    scrollWidth: field.scrollWidth,
  }));
  expect(fieldMetrics.scrollWidth).toBeLessThanOrEqual(fieldMetrics.clientWidth);
  await page.route('**/api/processes/search', (route) => route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', field: null, message: 'Falha simulada', retryAfterSeconds: null } } }));
  await submitSearch(page, PROCESS_CNJ);
  await expect(page.getByText('Não foi possível concluir a consulta agora. Tente novamente.')).toBeVisible();
  await page.unrouteAll();
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à consulta' }).click();
  await page.route('**/api/processes/search', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 17_000));
    await route.continue().catch(() => undefined);
  });
  await submitSearch(page, PROCESS_CNJ);
  await expect(page.getByText('Não foi possível concluir a consulta agora. Tente novamente.')).toBeVisible({ timeout: 18_000 });
  await expect(page.getByLabel('Número do processo (CNJ)')).toBeEnabled();
});

test('E2E-04: rota protegida, sessão expirada em outra aba e saída', async ({ page, context }) => {
  const email = uniqueEmail();
  await page.goto(`/processos/1`);
  await expect(page).toHaveURL(/\/entrar$/);
  await registerAccount(page, email);
  await login(page, email);
  const secondTab = await context.newPage();
  await secondTab.goto('/consulta');
  await expect(secondTab.getByLabel('Número do processo (CNJ)')).toBeVisible();
  await expireSession(email);
  await page.reload();
  await expect(page).toHaveURL(/\/entrar$/);
  await secondTab.reload();
  await expect(secondTab).toHaveURL(/\/entrar$/);
  await login(page, email);
  await secondTab.reload();
  await expect(secondTab.getByLabel('Número do processo (CNJ)')).toBeVisible();
  await context.route('**/api/auth/logout', (route) => route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', field: null, message: 'Falha temporária', retryAfterSeconds: null } } }));
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByText('Não foi possível concluir a saída. Tente novamente.')).toBeVisible();
  await expect(secondTab.getByText('Não foi possível concluir a saída. Tente novamente.')).toBeVisible();
  await context.unrouteAll();
  await page.getByRole('button', { name: 'Concluir saída' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(secondTab).toHaveURL(/\/entrar$/);
});

test('E2E-05: jornada por teclado em 320 px sem rolagem horizontal', async ({ page }) => {
  const email = uniqueEmail();
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/criar-conta');
  await tabTo(page, 'email');
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  await page.keyboard.type('senha-e2e-segura');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Conta criada. Entre com seu e-mail e senha.')).toBeVisible();
  await tabTo(page, 'email');
  await expect(page.getByLabel('E-mail')).toHaveValue(email);
  await page.keyboard.press('Tab');
  await page.keyboard.type('senha-e2e-segura');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/consulta$/);
  await tabTo(page, 'cnj');
  await page.keyboard.type(PROCESS_CNJ);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText(PROCESS_CNJ)).toBeVisible();
  const mobileWidth = await page.evaluate(() => ({ viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(mobileWidth.scrollWidth).toBeLessThanOrEqual(mobileWidth.viewport);
});

async function tabTo(page: import('@playwright/test').Page, id: string): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const activeId = await page.evaluate(() => document.activeElement?.getAttribute('id'));
    if (activeId === id) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not reach ${id} using keyboard navigation.`);
}
