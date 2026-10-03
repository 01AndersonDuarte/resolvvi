# Tarefa 3.0: Implementar o seed inicial do CSV

## Visão geral

Implementar o comando específico para ler `lawsuits_movements.csv`, mapear seus oito campos e gravar a base inicial em uma transação. O comando existe para bootstrap desta aplicação e não será tratado como uma rotina de importação reutilizável.

**Dependências:** [2.0](./task_2.md).
**Estado:** concluída em 3 de outubro de 2026.

<skills>
### Conformidade com skills

Não há frontend nesta tarefa; a skill React não se aplica.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Foram lidos `AGENTS.md` e todos os arquivos em `.agents/rules/`. O parser deve ser pequeno e específico, usar APIs assíncronas quando aplicável, manter tipos explícitos e não introduzir comentários ou abstrações sem necessidade.
</rules>

<requirements>

- Implementar RF5, RF6 e RF7.
- Ler o contrato conhecido de UTF-8, vírgula, aspas e campos multilinha.
- Criar cada processo uma vez no contexto da execução e suas movimentações correspondentes.
- Persistir conteúdo vazio como ausência e preservar textos, datas, valores e ordem de origem.
- Falhar quando o arquivo não puder ser lido ou quando a gravação não puder ser concluída.
</requirements>

## Subtarefas

- [x] 3.1 Implementar o parser específico do seed.
- [x] 3.2 Implementar o mapeamento para Processo e Movimentação.
- [x] 3.3 Implementar o comando de execução única e a transação.
- [x] 3.4 Cobrir o mapeamento e as falhas relevantes com testes.

## Detalhes de implementação

Consultar [TechSpec — Principais interfaces](./techspec.md#principais-interfaces), [Mapeamento do CSV](./techspec.md#mapeamento-do-csv--domínio) e [Monitoramento e observabilidade](./techspec.md#monitoramento-e-observabilidade). Não adicionar deduplicação de movimentações, relatórios ou continuação após erro.

## Critérios de aceitação relacionados

- CA-01
- CA-02
- CA-03
- CA-05

## Testes da tarefa

### Testes de unidade

- [x] TU-01 — Mapear as oito colunas do registro
- [x] TU-02 — Converter data, valor e quantidade
- [x] TU-03 — Preservar a ordem de origem

### Testes de integração

- [x] TI-01 — Criar processos e movimentações relacionadas
- [x] TI-04 — Popular base vazia com o CSV fornecido
- [x] TI-05 — Falhar sem persistência parcial

### Testes E2E

Não aplicável.

## Arquivos relevantes

- `backend/src/seed/`
- `backend/src/domain/`
- `backend/src/repositories/`
- `backend/src/**/*.test.ts`
- `lawsuits_movements.csv`

## Validações executadas

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` com PostgreSQL: 29 testes aprovados
- [x] `npm run test:coverage` com PostgreSQL: 98,24% statements, 96,84% branches, 100% functions e 100% lines
- [x] `npm run build`
