import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '../frontend/e2e-support/playwright';
import {
  changeSummarySource,
  expireSession,
  login,
  PROCESS_CNJ,
  registerAccount,
  releaseSummaryProvider,
  resetSummaryProvider,
  setSummaryProviderMode,
  sourceMovementId,
  submitSearch,
  summaryProviderCalls,
  uniqueEmail,
} from '../frontend/e2e-support/session';

const SUMMARY_TEXT = 'A parte ré apresentou defesa e negou responsabilidade pelo dano.';
const EVIDENCE_DIRECTORY = path.resolve(process.cwd(), '../tasks/prd-resumo-processual-ia/evidences');

async function captureSummaryEvidence(page: Page, fileName: string): Promise<void> {
  mkdirSync(EVIDENCE_DIRECTORY, { recursive: true });
  await page.getByRole('region', { name: 'Resumo por inteligência artificial' })
    .screenshot({ path: path.join(EVIDENCE_DIRECTORY, fileName) });
}

async function openProcess(page: Page): Promise<{ email: string; processId: number }> {
  const email = uniqueEmail();
  await resetSummaryProvider();
  await registerAccount(page, email);
  await login(page, email);
  await submitSearch(page, PROCESS_CNJ);
  await expect(page).toHaveURL(/\/processos\/\d+$/);
  const processId = Number(new URL(page.url()).pathname.split('/').at(-1));
  await changeSummarySource(await sourceMovementId(processId));
  await page.reload();
  await expect(page.getByRole('button', { name: /Gerar resumo|Atualizar resumo/ })).toBeVisible();
  return { email, processId };
}

async function generateSummary(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Gerar resumo|Atualizar resumo/ }).click();
  await expect(page.getByText(SUMMARY_TEXT, { exact: true })).toBeVisible({ timeout: 10_000 });
}

async function verifyManualReference(page: Page): Promise<void> {
  const reference = page.locator('section[aria-labelledby="summary-references-title"] li ul li').first();
  const referenceText = await reference.textContent();
  const title = referenceText?.split(' · ').at(-1);
  expect(title).toBeTruthy();
  let found = false;
  for (let pageNumber = 0; pageNumber < 50; pageNumber += 1) {
    const movement = page.getByRole('heading', { name: title ?? '', exact: true });
    if (await movement.count()) {
      found = true;
      break;
    }
    const nextPage = page.getByRole('button', { name: 'Próxima' });
    if (!(await nextPage.isEnabled())) break;
    const range = page.getByRole('navigation', { name: 'Paginação das movimentações' }).locator('p');
    const currentRange = await range.textContent();
    const endOfCurrentPage = Number(currentRange?.match(/–(\d+)/)?.[1]);
    await nextPage.click();
    await expect(range).toContainText(`Movimentações ${endOfCurrentPage + 1}–`);
  }
  expect(found).toBe(true);
}

test('E2E-01: consulta, geração única, conferência manual, voto e recarga', async ({ page }) => {
  await openProcess(page);
  expect(await summaryProviderCalls()).toBe(0);
  await captureSummaryEvidence(page, 'resumo-antes-da-geracao.png');
  await generateSummary(page);
  await verifyManualReference(page);
  await page.getByRole('button', { name: 'Sim' }).click();
  await expect(page.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Não' }).click();
  await expect(page.getByRole('button', { name: 'Não' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByText(SUMMARY_TEXT, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Não' })).toHaveAttribute('aria-pressed', 'true');
  await captureSummaryEvidence(page, 'resumo-disponivel-e-avaliado.png');
  expect(await summaryProviderCalls()).toBe(1);
});

test('E2E-02: fonte alterada remove versão antiga e concorrência gera uma versão nova', async ({ page, context }) => {
  const { processId } = await openProcess(page);
  await generateSummary(page);
  await page.getByRole('button', { name: 'Sim' }).click();
  const secondTab = await context.newPage();
  await secondTab.goto(`/processos/${processId}`);
  await expect(secondTab.getByText(SUMMARY_TEXT, { exact: true })).toBeVisible();
  await changeSummarySource(await sourceMovementId(processId));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Atualizar resumo' })).toBeVisible();
  await secondTab.reload();
  await setSummaryProviderMode('held');
  await page.getByRole('button', { name: 'Atualizar resumo' }).click();
  await expect(page.getByText('Gerando resumo…')).toBeVisible();
  await secondTab.getByRole('button', { name: 'Atualizar resumo' }).click();
  await expect(secondTab.getByText('Gerando resumo…')).toBeVisible();
  await releaseSummaryProvider();
  await expect(page.getByText(SUMMARY_TEXT, { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(secondTab.getByText(SUMMARY_TEXT, { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'false');
  expect(await summaryProviderCalls()).toBe(2);
});

test('E2E-03: falha do provedor não esconde dados nem movimentações', async ({ page }) => {
  const { processId } = await openProcess(page);
  await failGeneration(page, 'unavailable', 'Não foi possível gerar o resumo agora');
  await captureSummaryEvidence(page, 'resumo-falha-recuperavel.png');
  await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Processo' })).toBeVisible();
  expect(await summaryProviderCalls()).toBe(1);
  await changeSummarySource(await sourceMovementId(processId));
  await page.reload();
  await failGeneration(page, 'invalid', 'Não foi possível gerar um resumo válido');
  await changeSummarySource(await sourceMovementId(processId));
  await page.reload();
  await setSummaryProviderMode('success');
  await generateSummary(page);
  await failSummaryReadAndRecover(page);
  await failFeedbackWithoutChangingConfirmedVote(page);
});

async function failGeneration(page: Page, mode: 'unavailable' | 'invalid', message: string): Promise<void> {
  await setSummaryProviderMode(mode);
  await page.getByRole('button', { name: /Gerar resumo|Atualizar resumo|Tentar novamente/ }).click();
  await expect(page.getByText(message)).toBeVisible({ timeout: 10_000 });
}

async function failSummaryReadAndRecover(page: Page): Promise<void> {
  await page.route(/\/api\/processes\/\d+\/ai-summary\?track=true$/, (route) => route.fulfill({
    status: 503,
    json: { error: { code: 'SERVICE_UNAVAILABLE', field: null, message: 'Falha de leitura', retryAfterSeconds: null } },
  }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Consultar novamente' })).toBeVisible();
  await page.unrouteAll();
  await page.getByRole('button', { name: 'Consultar novamente' }).click();
  await expect(page.getByText(SUMMARY_TEXT, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();
}

async function failFeedbackWithoutChangingConfirmedVote(page: Page): Promise<void> {
  await page.route(/\/api\/processes\/\d+\/ai-summary\/[^/]+\/feedback$/, (route) => route.fulfill({
    status: 503,
    json: { error: { code: 'SERVICE_UNAVAILABLE', field: null, message: 'Falha de avaliação', retryAfterSeconds: null } },
  }));
  await page.getByRole('button', { name: 'Sim' }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar a avaliação');
  await expect(page.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'false');
  await page.unrouteAll();
}

test('E2E-04: troca de processo descarta resposta pendente e sessão expirada retorna ao login', async ({ page }) => {
  const { email, processId } = await openProcess(page);
  let releaseGeneration: (() => Promise<void>) | undefined;
  await page.route(/ai-summary\/generations/, async (route) => {
    await new Promise<void>((resolve) => { releaseGeneration = async () => resolve(); });
    await route.continue();
  });
  await page.getByRole('button', { name: /Gerar resumo|Atualizar resumo/ }).click();
  await expect(page.getByText('Solicitando…')).toBeVisible();
  await page.goto('/processos/2147483647');
  await expect(page.getByText(/Não encontramos esse processo/)).toBeVisible();
  await expireSession(email);
  await releaseGeneration?.();
  await page.unrouteAll();
  await page.reload();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto(`/processos/${processId}`);
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByText(SUMMARY_TEXT, { exact: true })).toHaveCount(0);
});

test('E2E-05: controles da seção são acessíveis por teclado em celular e zoom de 200%', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await openProcess(page);
  await tabToButton(page, /Gerar resumo|Atualizar resumo/);
  await page.keyboard.press('Enter');
  await expect(page.getByText(SUMMARY_TEXT, { exact: true })).toBeVisible({ timeout: 10_000 });
  await tabToButton(page, 'Sim');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
  for (const width of [320, 1_280, 640]) {
    await page.setViewportSize({ width, height: 780 });
    await expectNoHorizontalOverflow(page);
    if (width === 320) await captureSummaryEvidence(page, 'resumo-mobile-teclado.png');
    if (width === 1_280) await captureSummaryEvidence(page, 'resumo-desktop.png');
    if (width === 640) await captureSummaryEvidence(page, 'resumo-viewport-200-equivalente.png');
  }
});

async function tabToButton(page: Page, name: string | RegExp): Promise<void> {
  const button = page.getByRole('button', { name });
  for (let index = 0; index < 30; index += 1) {
    if (await button.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Could not reach the expected summary action using keyboard navigation.');
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
}
