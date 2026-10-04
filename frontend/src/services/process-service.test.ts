import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProcessById, getProcessMovements, searchProcess } from './process-service';

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
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse(processDetails));
    vi.stubGlobal('fetch', fetchStub);

    await expect(getProcessById('17', new AbortController().signal)).resolves.toEqual(processDetails);

    expect(fetchStub).toHaveBeenCalledWith('/api/processes/17', expect.objectContaining({ method: 'GET' }));
  });

  it('requests a movement page and validates its process relationship', async () => {
    const page = { processId: 17, items: [], page: 2, pageSize: 20, total: 20, totalPages: 1 };
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse(page));
    vi.stubGlobal('fetch', fetchStub);

    await expect(getProcessMovements({ processId: '17', page: 2 }, new AbortController().signal)).rejects.toThrow(
      'Resposta de movimentações inválida.',
    );
    expect(fetchStub).toHaveBeenCalledWith('/api/processes/17/movements?page=2', expect.objectContaining({ method: 'GET' }));
  });
});

const processDetails = {
  id: 17,
  cnj: '1001399-31.2023.8.26.0070',
  forum: 'Foro de Batatais',
  court: '2ª Vara Cível',
  lawsuitValue: '10.000,00',
  numberOfAuthors: 1,
};

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
