import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProcessById, searchProcess } from './process-service';

afterEach(() => vi.unstubAllGlobals());

describe('process service', () => {
  it('sends the CNJ in the protected search body', async () => {
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse({ id: 17, cnj: '1001399-31.2023.8.26.0070' }));
    vi.stubGlobal('fetch', fetchStub);

    await expect(searchProcess('10013993120238260070', new AbortController().signal)).resolves.toEqual({
      id: 17, cnj: '1001399-31.2023.8.26.0070',
    });

    expect(fetchStub).toHaveBeenCalledWith('/api/processes/search', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ cnj: '10013993120238260070' }), credentials: 'include',
    }));
  });

  it('reads a process destination by an encoded identifier', async () => {
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse({ id: 17, cnj: '1001399-31.2023.8.26.0070' }));
    vi.stubGlobal('fetch', fetchStub);

    await getProcessById('17/other', new AbortController().signal);

    expect(fetchStub).toHaveBeenCalledWith('/api/processes/17%2Fother', expect.objectContaining({ method: 'GET' }));
  });
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
