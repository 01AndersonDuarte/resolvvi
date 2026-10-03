# Tarefa 1.0: Simplificar a fundação do backend

## Visão geral

Manter a base executável do backend com configuração, logging, scripts de qualidade e PostgreSQL local. Remover a infraestrutura que existia somente para uma plataforma de importação recorrente.

**Dependências:** nenhuma.
**Estado:** concluída em 3 de outubro de 2026.

<skills>
### Conformidade com skills

Não há frontend nesta tarefa; a skill React não se aplica. A revisão documental segue as skills de PRD, TechSpec e tasks do projeto.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Foram lidos `AGENTS.md` e todos os arquivos em `.agents/rules/`. A tarefa mantém TypeScript estrito, arquivos pequenos, configuração centralizada, npm com lock file e Vitest com cobertura mínima de 80%.
</rules>

<requirements>

- Manter scripts de lint, typecheck, test, coverage e build.
- Manter configuração de banco, ambiente de desenvolvimento/teste, logger e Compose PostgreSQL.
- Remover relatórios, timeouts de importação, Playwright e fixtures de processo, diretório temporário e criação de bancos de teste.
- Atualizar a documentação para descrever o seed inicial, sem prometer um importador reutilizável.
</requirements>

## Subtarefas

- [x] 1.1 Simplificar variáveis de ambiente e contratos de configuração.
- [x] 1.2 Remover infraestrutura de testes e execução criada para ETL recorrente.
- [x] 1.3 Atualizar scripts, dependências, Compose e README.
- [x] 1.4 Executar lint, typecheck, testes, cobertura e build.

## Detalhes de implementação

Consultar [TechSpec — Arquitetura do sistema](./techspec.md#arquitetura-do-sistema) e [Considerações técnicas](./techspec.md#considerações-técnicas). A configuração permanece genérica para o backend; não contém diretório de relatório, diário ou estado de execução.

## Critérios de aceitação relacionados

- CA-06

## Testes da tarefa

### Testes de unidade

- [x] TU-01 — Configuração mínima do ambiente
- [x] TU-02 — Configuração inválida sem expor credenciais
- [x] TU-03 — Logger sanitiza contexto e erros

### Testes de integração

Não aplicável nesta tarefa; persistência será coberta depois que o schema existir.

### Testes E2E

Não aplicável.

## Validações

Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`.

## Arquivos relevantes

- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env.*.example`
- `backend/src/config/`
- `backend/src/protocols.ts`
- `backend/vitest.config.ts`
- `backend/README.md`
