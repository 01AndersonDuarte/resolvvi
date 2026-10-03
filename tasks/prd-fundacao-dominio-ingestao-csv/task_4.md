# Tarefa 4.0: Validar a carga inicial e documentar a execução

## Visão geral

Executar o seed em uma base vazia, verificar os totais e a relação entre entidades e documentar o comando e os pré-requisitos. Esta tarefa fecha a etapa com evidência da carga única.

**Dependências:** [3.0](./task_3.md).
**Estado:** concluída em 3 de outubro de 2026.

<skills>
### Conformidade com skills

Não há frontend nesta tarefa; a skill React não se aplica.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Foram lidos `AGENTS.md` e todos os arquivos em `.agents/rules/`. A validação seguirá FIRST, usará uma base controlada e não criará cenários artificiais de ETL.
</rules>

<requirements>

- Implementar RF8.
- Confirmar CA-01 a CA-06 com os testes e comandos aplicáveis.
- Registrar no README somente a execução do seed inicial e os comandos de qualidade.
- Manter o CSV original inalterado.
</requirements>

## Subtarefas

- [x] 4.1 Executar a suíte unitária, integração, lint, typecheck, coverage e build.
- [x] 4.2 Executar o seed contra uma base vazia e conferir 100 processos e 5.568 movimentações.
- [x] 4.3 Conferir amostras de texto, conteúdo ausente, datas e ordenação.
- [x] 4.4 Registrar resultados no README e atualizar esta tarefa.

## Detalhes de implementação

Consultar [TechSpec — Abordagem de testes](./techspec.md#abordagem-de-testes) e [Sequenciamento do desenvolvimento](./techspec.md#sequenciamento-do-desenvolvimento). A validação não inclui reexecução, recuperação ou relatório de importação.

## Critérios de aceitação relacionados

- CA-01
- CA-02
- CA-03
- CA-04
- CA-05
- CA-06

## Testes da tarefa

### Testes de unidade

- [x] TU-01 — Mapear as oito colunas do registro
- [x] TU-02 — Converter data, valor e quantidade
- [x] TU-03 — Preservar a ordem de origem

### Testes de integração

- [x] TI-01 — Criar processos e movimentações relacionadas
- [x] TI-02 — Respeitar unicidade do CNJ
- [x] TI-03 — Recusar movimentação sem processo
- [x] TI-04 — Popular base vazia com o CSV fornecido
- [x] TI-05 — Falhar sem persistência parcial

### Testes E2E

Não aplicável.

## Arquivos relevantes

- `backend/README.md`
- `backend/src/**/*.test.ts`
- `backend/prisma/`
- `lawsuits_movements.csv`

## Validações executadas

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` com PostgreSQL: 29 testes aprovados
- [x] `npm run test:coverage`: 98,24% statements, 96,84% branches, 100% functions e 100% lines
- [x] `npm run build`
- [x] `npm run seed` em uma base de desenvolvimento vazia: 100 processos e 5.568 movimentos
- [x] Comparação dos campos persistidos com os registros do CSV: todos os processos e movimentos conferidos; 1.312 movimentos sem conteúdo e 2.527 com texto multilinha
- [x] Consulta do repository confirmou ordenação por data e `sourceOrder`
- [x] CSV original permaneceu inalterado (SHA-256 `ff787b0e95aaca3dca88943bf8606a3c96fa0f00b4218844545790f9656697c9`)
