import { describe, expect, it } from 'vitest';

import { SEED_HEADERS, mapSeedRows } from './seed-row-mapper.js';

const firstMovement = [
  '0001234-56.2023.8.26.0001',
  'Foro de São Paulo',
  '2ª Vara Cível',
  '10.043,24',
  '2',
  '5/12/2023',
  'Certidão expedida',
  'Conteúdo com acento: ação',
];

describe('mapeamento do seed', registerMappingTests);

function registerMappingTests(): void {
  it('mapeia as oito colunas e converte os tipos persistidos', mapAllColumns);
  it('mantém conteúdo vazio como ausência e preserva a ordem original', () => {
    const secondMovement = [...firstMovement.slice(0, 7), ''];
    const [process] = mapSeedRows([SEED_HEADERS.slice(), firstMovement, secondMovement]);

    expect(process?.movements.map(({ sourceOrder }) => sourceOrder)).toEqual([1, 2]);
    expect(process?.movements[1]?.movementContent).toBeNull();
  });

  it('rejeita cabeçalho desconhecido e registros com quantidade de colunas incorreta', () => {
    expect(() => mapSeedRows([['unknown'], firstMovement])).toThrow('cabeçalho esperado');
    expect(() => mapSeedRows([SEED_HEADERS.slice(), firstMovement.slice(0, 7)])).toThrow('linha lógica 2');
  });

  it('rejeita datas, valores e quantidades inválidos', () => {
    expect(() => mapSeedRows([SEED_HEADERS.slice(), [...firstMovement.slice(0, 5), '31/2/2023', ...firstMovement.slice(6)]])).toThrow('Data');
    expect(() => mapSeedRows([SEED_HEADERS.slice(), [...firstMovement.slice(0, 3), '10.04,24', ...firstMovement.slice(4)]])).toThrow('Valor');
    expect(() => mapSeedRows([SEED_HEADERS.slice(), [...firstMovement.slice(0, 4), '2.5', ...firstMovement.slice(5)]])).toThrow('Quantidade');
  });
}

function mapAllColumns(): void {
  const [process] = mapSeedRows([SEED_HEADERS.slice(), firstMovement]);

  expect(process).toMatchObject({
    cnj: '0001234-56.2023.8.26.0001',
    forum: 'Foro de São Paulo',
    court: '2ª Vara Cível',
    lawsuitValue: '10043.24',
    numberOfAuthors: 2,
    movements: [{
      movementDate: new Date('2023-12-05T00:00:00.000Z'),
      movementTitle: 'Certidão expedida',
      movementContent: 'Conteúdo com acento: ação',
      sourceOrder: 1,
    }],
  });
}
