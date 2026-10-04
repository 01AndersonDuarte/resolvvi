import { expect, type Page } from '@playwright/test';

export const PROCESS_CNJ = '1001399-31.2023.8.26.0070';
export const UNKNOWN_CNJ = '1002271-82.2025.8.26.0003';
export const E2E_MAILBOX_PORT = process.env.E2E_MAILBOX_PORT ?? '3051';

export function uniqueEmail(): string {
  return `e2e-${crypto.randomUUID()}@example.test`;
}

export async function registerAccount(page: Page, email: string): Promise<void> {
  await page.goto('/criar-conta');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-e2e-segura');
  await expect(page.locator('input')).toHaveCount(2);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Confira seu e-mail para continuar. Se já possui conta confirmada, entre.')).toBeVisible();
}

export async function getConfirmationUrl(email: string): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${E2E_MAILBOX_PORT}/mail?email=${encodeURIComponent(email)}`);
  expect(response.ok).toBeTruthy();
  const message: { confirmationUrl: string } = await response.json();
  return message.confirmationUrl;
}

export async function confirmInNewContext(page: Page, email: string, keyboardOnly = false): Promise<void> {
  const context = await page.context().browser()!.newContext();
  const confirmationPage = await context.newPage();
  await confirmationPage.goto(await getConfirmationUrl(email));
  if (keyboardOnly) await pressConfirmationByKeyboard(confirmationPage);
  else await confirmationPage.getByRole('button', { name: 'Confirmar e-mail' }).click();
  await expect(confirmationPage.getByText('E-mail confirmado. Agora você pode entrar.')).toBeVisible();
  await context.close();
}

async function pressConfirmationByKeyboard(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (activeText === 'Confirmar e-mail') {
      await page.keyboard.press('Enter');
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('Could not reach email confirmation using keyboard navigation.');
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-e2e-segura');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/consulta$/);
}

export async function submitSearch(page: Page, cnj: string): Promise<void> {
  await page.getByLabel('Número do processo (CNJ)').fill(cnj);
  await page.getByRole('button', { name: 'Consultar' }).click();
}

export async function expireVerification(email: string): Promise<void> {
  await postControl('/expire-verification', email);
}

export async function expireSession(email: string): Promise<void> {
  await postControl('/expire-session', email);
}

async function postControl(path: string, email: string): Promise<void> {
  const response = await fetch(`http://127.0.0.1:${E2E_MAILBOX_PORT}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  expect(response.status).toBe(204);
}
