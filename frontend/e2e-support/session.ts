import { expect, type Page } from '@playwright/test';

export const PROCESS_CNJ = '1001399-31.2023.8.26.0070';
export const UNKNOWN_CNJ = '1002271-82.2025.8.26.0003';
export const E2E_CONTROL_PORT = process.env.E2E_CONTROL_PORT ?? '3051';
export type E2eProviderMode = 'success' | 'unavailable' | 'invalid' | 'held';

export function uniqueEmail(): string {
  return `e2e-${crypto.randomUUID()}@example.test`;
}

export async function registerAccount(page: Page, email: string): Promise<void> {
  await page.goto('/criar-conta');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-e2e-segura');
  await expect(page.locator('input')).toHaveCount(2);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Conta criada. Entre com seu e-mail e senha.')).toBeVisible();
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

export async function expireSession(email: string): Promise<void> {
  const response = await fetch(`http://127.0.0.1:${E2E_CONTROL_PORT}/expire-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  expect(response.status).toBe(204);
}

export async function setSummaryProviderMode(mode: E2eProviderMode): Promise<void> {
  const response = await fetchControl('/summary-provider', { method: 'POST', body: JSON.stringify({ mode }) });
  expect(response.status).toBe(204);
}

export async function resetSummaryProvider(): Promise<void> {
  const response = await fetchControl('/summary-provider/reset', { method: 'POST' });
  expect(response.status).toBe(204);
}

export async function releaseSummaryProvider(): Promise<void> {
  const response = await fetchControl('/summary-provider/release', { method: 'POST' });
  expect(response.status).toBe(204);
}

export async function summaryProviderCalls(): Promise<number> {
  const response = await fetchControl('/summary-provider');
  expect(response.status).toBe(200);
  const state: unknown = await response.json();
  expect(state).toMatchObject({ calls: expect.any(Number) });
  return (state as { calls: number }).calls;
}

export async function sourceMovementId(processId: number): Promise<number> {
  const response = await fetchControl(`/process-movements/${processId}`);
  expect(response.status).toBe(200);
  const movement: unknown = await response.json();
  expect(movement).toMatchObject({ movementId: expect.any(Number) });
  return (movement as { movementId: number }).movementId;
}

export async function changeSummarySource(movementId: number): Promise<void> {
  const response = await fetchControl('/change-source', { method: 'POST', body: JSON.stringify({ movementId }) });
  expect(response.status).toBe(204);
}

async function fetchControl(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`http://127.0.0.1:${E2E_CONTROL_PORT}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}
