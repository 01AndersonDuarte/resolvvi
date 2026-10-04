import { describe, expect, it } from 'vitest';
import type { SummaryEnvironment } from '../types/config.js';
import { createOpenAiSummaryProvider } from './openai-summary-service.js';

const configuration: SummaryEnvironment = {
  enabled: true,
  apiKey: 'server-secret',
  provider: 'openai',
  model: 'gpt-4.1-mini-2025-04-14',
  contextCapacity: 131_072,
};
const input = {
  instructions: 'trusted instructions',
  source: '{"records":[]}',
  schema: { type: 'object' },
  maxOutputTokens: 4_096,
  signal: new AbortController().signal,
};

function completedResponse(content: unknown[], status = 'completed'): Response {
  return new Response(JSON.stringify({
    id: 'resp-1', status, model: configuration.model, output: [{ content }],
    usage: { input_tokens: 12, output_tokens: 8 },
  }), { status: 200 });
}

type CapturedRequest = { url: string | URL | Request; init?: RequestInit | undefined };

function fakeTransport(response: Response, requests: CapturedRequest[] = []): typeof fetch {
  const transport = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push({ url, init });
    return Promise.resolve(response.clone());
  };
  return transport;
}

function requestBody(request: CapturedRequest | undefined): Record<string, unknown> {
  const body = request?.init?.body;
  if (typeof body !== 'string') throw new Error('Expected a serialized request body.');
  return JSON.parse(body) as Record<string, unknown>;
}

function assertRequest(request: CapturedRequest | undefined): void {
  expect(request?.url).toBe('https://api.openai.com/v1/responses');
  expect(request?.init?.headers).toMatchObject({ authorization: 'Bearer server-secret' });
  const body = requestBody(request);
  expect(body).toMatchObject({ store: false, background: false, stream: false, truncation: 'disabled', temperature: 0 });
  expect(body.input).toEqual([
    { role: 'developer', content: [{ type: 'input_text', text: 'trusted instructions' }] },
    { role: 'user', content: [{ type: 'input_text', text: '{"records":[]}' }] },
  ]);
  expect(body.tools).toBeUndefined();
}

describe('createOpenAiSummaryProvider request', () => {
  it('envia fonte e instruções separados, sem armazenar ou habilitar ferramentas', async () => {
    const requests: CapturedRequest[] = [];
    const transport = fakeTransport(completedResponse([{ type: 'output_text', text: '{"language":"pt-BR"}' }]), requests);
    const provider = createOpenAiSummaryProvider(configuration, transport);

    await provider.generate(input);

    assertRequest(requests.at(0));
  });
});

describe('createOpenAiSummaryProvider output', () => {
  it('extrai saída, uso e identificador do provedor', async () => {
    const provider = createOpenAiSummaryProvider(configuration, fakeTransport(
      completedResponse([{ type: 'output_text', text: '{"language":"pt-BR"}' }]),
    ));

    await expect(provider.generate(input)).resolves.toMatchObject({
      output: '{"language":"pt-BR"}', status: 'completed', usage: { inputTokens: 12, outputTokens: 8 },
      providerRequestId: 'resp-1', refusal: null,
    });
  });

  it('classifica recusa e truncamento sem tratar a resposta como completa', async () => {
    const refusal = createOpenAiSummaryProvider(configuration, fakeTransport(
      completedResponse([{ type: 'refusal', refusal: 'Não posso atender.' }]),
    ));
    const truncated = createOpenAiSummaryProvider(configuration, fakeTransport(
      new Response(JSON.stringify({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [{ content: [{ type: 'output_text', text: '{}' }] }] })),
    ));

    await expect(refusal.generate(input)).resolves.toMatchObject({ status: 'completed', refusal: 'Não posso atender.' });
    await expect(truncated.generate(input)).resolves.toMatchObject({ status: 'incomplete' });
  });
});

describe('createOpenAiSummaryProvider failures', () => {
  it('normaliza limite de taxa com Retry-After em segundos e em data', async () => {
    const provider = createOpenAiSummaryProvider(configuration, fakeTransport(
      new Response('{}', { status: 429, headers: { 'retry-after': '45' } }),
    ));
    const dateProvider = createOpenAiSummaryProvider(configuration, fakeTransport(
      new Response('{}', { status: 429, headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' } }),
    ), () => Date.parse('Wed, 21 Oct 2026 07:27:00 GMT'));

    await expect(provider.generate(input)).rejects.toMatchObject({ code: 'rate_limited', retryAfterMs: 45_000 });
    await expect(dateProvider.generate(input)).rejects.toMatchObject({ code: 'rate_limited', retryAfterMs: 60_000 });
  });

  it('classifica indisponibilidade e rejeição sem expor corpo externo', async () => {
    const unavailable = createOpenAiSummaryProvider(configuration, fakeTransport(new Response('secret', { status: 503 })));
    const rejected = createOpenAiSummaryProvider(configuration, fakeTransport(new Response('secret', { status: 400 })));

    await expect(unavailable.generate(input)).rejects.toMatchObject({ code: 'unavailable', retryAfterMs: 30_000 });
    await expect(rejected.generate(input)).rejects.toMatchObject({ code: 'rejected' });
  });
});

describe('createOpenAiSummaryProvider configuration', () => {
  it('impede composição sem geração habilitada ou credencial', () => {
    expect(() => createOpenAiSummaryProvider({ ...configuration, enabled: false })).toThrow();
    expect(() => createOpenAiSummaryProvider({ ...configuration, apiKey: null })).toThrow();
  });
});
