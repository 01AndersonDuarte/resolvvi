import { describe, expect, it } from 'vitest';
import { readMovementPage, readProcessDetails } from './process-response';

describe('process response readers', () => {
  it('reads process details only when identity and fields match the request', () => {
    expect(readProcessDetails(details, '17')).toEqual(details);
    expect(() => readProcessDetails({ ...details, id: 18 }, '17')).toThrow('Resposta de detalhes processuais inválida.');
    expect(() => readProcessDetails({ ...details, cnj: '' }, '17')).toThrow('Resposta de detalhes processuais inválida.');
  });

  it('preserves movement order and accepts explicit nullable fields', () => {
    const response = movementPage([
      { id: 31, movementDate: '05/12/2023', movementTitle: 'Primeiro', movementContent: null },
      { id: 32, movementDate: null, movementTitle: null, movementContent: 'Texto original\nsem mudanças' },
    ]);

    expect(readMovementPage(response, { processId: 17, page: 1 }).items).toEqual(response.items);
  });

  it('rejects incorrect metadata, process links, duplicate identities, and invalid fields', () => {
    const response = movementPage([{ id: 31, movementDate: null, movementTitle: null, movementContent: null }]);
    expect(() => readMovementPage({ ...response, processId: 18 }, { processId: 17, page: 1 })).toThrow();
    expect(() => readMovementPage({ ...response, totalPages: 4 }, { processId: 17, page: 1 })).toThrow();
    expect(() => readMovementPage({ ...response, items: [response.items[0], response.items[0]], total: 2, totalPages: 1 }, { processId: 17, page: 1 })).toThrow();
    expect(() => readMovementPage({ ...response, items: [{ id: 31, movementDate: '31/02/2023', movementTitle: '', movementContent: null }] }, { processId: 17, page: 1 })).toThrow();
  });
});

const details = {
  id: 17,
  cnj: '1001399-31.2023.8.26.0070',
  forum: null,
  court: null,
  lawsuitValue: null,
  numberOfAuthors: 0,
};

function movementPage(items: unknown[]) {
  return { processId: 17, items, page: 1, pageSize: 20, total: items.length, totalPages: items.length === 0 ? 0 : 1 };
}
