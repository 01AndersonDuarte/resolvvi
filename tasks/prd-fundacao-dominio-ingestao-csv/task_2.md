# Tarefa 2.0: Criar o modelo persistente de processos e movimentações

## Visão geral

Criar o schema Prisma e a migration das entidades Processo e Movimentação Processual, incluindo a chave única do CNJ, a chave estrangeira obrigatória e o campo simples que preserva a ordem do CSV.

**Dependências:** [1.0](./task_1.md).
**Estado:** pendente.

<skills>
### Conformidade com skills

Não há frontend nesta tarefa; a skill React não se aplica.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Foram lidos `AGENTS.md` e todos os arquivos em `.agents/rules/`. Prisma ficará restrito à persistência, os tipos serão explícitos, e os testes verificarão comportamento real em banco controlado.
</rules>

<requirements>

- Implementar RF1, RF2, RF3 e RF4.
- Modelar os campos das oito colunas sem adicionar dados derivados de negócio.
- Garantir `cnj` único e vínculo obrigatório de cada movimentação com um processo.
- Permitir ordenação por data e `sourceOrder`.
</requirements>

## Subtarefas

- [x] 2.1 Criar `prisma/schema.prisma` com `Process` e `Movement`.
- [x] 2.2 Gerar e aplicar a migration em bancos vazios.
- [x] 2.3 Implementar repositories mínimos para criar e recuperar os dados da relação.
- [x] 2.4 Cobrir unicidade, vínculo e ordenação com testes.

## Detalhes de implementação

Consultar [TechSpec — Modelos de dados](./techspec.md#modelos-de-dados). Manter a persistência restrita às duas entidades do domínio, sem estado operacional adicional.

## Critérios de aceitação relacionados

- CA-02
- CA-03
- CA-04

## Testes da tarefa

### Testes de unidade

- [x] TU-03 — Preservar a ordem de origem na consulta do repository

### Testes de integração

- [x] TI-01 — Criar processos e movimentações relacionadas, incluindo os campos persistidos
- [x] TI-02 — Respeitar unicidade do CNJ
- [x] TI-03 — Recusar movimentação sem processo

### Testes E2E

Não aplicável.

## Arquivos relevantes

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/repositories/`
- `backend/src/**/*.test.ts`

## Validações executadas

- [x] `npm run prisma:generate`
- [x] `npm run prisma:migrate -- --name process-movement` no banco `dev_test_resolvvi`
- [x] `npx prisma migrate deploy` no banco `dev_test_resolvvi_test_template`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` com PostgreSQL: 16 testes aprovados
- [x] `npm run test:coverage` com PostgreSQL: 100% nas quatro métricas
- [x] `npm run build`

**Estado:** concluída em 3 de outubro de 2026.
