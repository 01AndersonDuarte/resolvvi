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

- [ ] 2.1 Criar `prisma/schema.prisma` com `Process` e `Movement`.
- [ ] 2.2 Gerar e aplicar a migration em banco vazio.
- [ ] 2.3 Implementar repositories mínimos para criar e recuperar os dados da relação.
- [ ] 2.4 Cobrir unicidade, vínculo e ordenação com testes de integração.

## Detalhes de implementação

Consultar [TechSpec — Modelos de dados](./techspec.md#modelos-de-dados). Manter a persistência restrita às duas entidades do domínio, sem estado operacional adicional.

## Critérios de aceitação relacionados

- CA-02
- CA-03
- CA-04

## Testes da tarefa

### Testes de unidade

- [ ] TU-03 — Preservar a ordem de origem

### Testes de integração

- [ ] TI-01 — Criar processos e movimentações relacionadas
- [ ] TI-02 — Respeitar unicidade do CNJ

### Testes E2E

Não aplicável.

## Arquivos relevantes

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/repositories/`
- `backend/src/**/*.test.ts`
