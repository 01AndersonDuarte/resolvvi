# Tarefa 1.0: Infraestrutura HTTP, configuração, erros, logs e ambiente de testes

## Visão geral

Disponibilizar o servidor HTTP e a infraestrutura de qualidade sobre a fundação existente, com health check, configuração validada, erros públicos seguros e desligamento controlado.

**Dependências:** Nenhuma tarefa anterior desta funcionalidade; pressupõe a fundação existente.

<skills>

### Conformidade com skills

- [`executar-task`](../../.agents/skills/executar-task/SKILL.md): fluxo de implementação incremental, validações, checklists e limpeza do ambiente.

</skills>

<rules>

### Conformidade com o AGENTS.md e as rules

Leitura realizada do `AGENTS.md` e de todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `folder-structure.md`, `tests.md` e `commit_guidelines.md`. Usar a versão desses arquivos vigente na execução. Aplicar tipagem explícita, módulos ESM, limites de tamanho, camadas e logging centralizado; manter npm/locks separados, segredos fora do repositório e testes FIRST junto ao código. Cobertura mínima de 80% em linhas, funções, branches e statements por aplicativo afetado, sem exclusões artificiais. Criar commits locais de incrementos validados com staging explícito, preservar alterações alheias e não fazer push sem autorização.

Preservar Prisma 7, singleton existente e direção das dependências. Middleware de erro Express tem a exceção técnica de quatro parâmetros registrada na TechSpec; não ampliar essa exceção a funções comuns.

</rules>

<requirements>

- RF4, RF15 e RF23: preparar proteção de origem, limites de corpo, prazos e tratamento uniforme de falhas para os recursos que serão registrados nas próximas tarefas.
- O6 e CA-19: preparar testes HTTP e banco isolado, mantendo as suítes da fundação e cobertura mínima por aplicativo.
- Preservar a execução de seed e migrations sem exigir credenciais do Resend. Não registrar endpoints de autenticação ou consulta com comportamento provisório.

</requirements>

## Subtarefas

- [ ] 1.1 Adicionar Express 5, CORS, tipos e Supertest; configurar os scripts HTTP preservando os scripts de qualidade e o lock npm.
- [ ] 1.2 Criar composição injetável em app.ts, servidor e health check, com desligamento idempotente e tratamento de falhas fatais.
- [ ] 1.3 Acrescentar configuração HTTP validada antes de listen, sem tornar opções de e-mail obrigatórias para a fundação.
- [ ] 1.4 Criar contexto de requisição, proteção de origem, validação JSON, limite de corpo, middleware de erros e orçamento de processamento.
- [ ] 1.5 Ampliar o logger/sanitizador e preparar fixtures de HTTP e banco isolado, sem integrações obrigatórias silenciosamente ignoradas.
- [ ] 1.6 Implementar os testes mapeados, executar as verificações do backend e documentar execução/configuração.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Arquitetura do sistema → Visão dos componentes
- Design de implementação → Principais interfaces: Proteção HTTP
- Design de implementação → Modelos de dados: ApiError e HealthResponse
- Design de implementação → Endpoints: regras transversais e GET /health
- Pontos de integração
- Monitoramento e observabilidade

Dentro de `backend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-03
- CA-12
- CA-19
- CA-27
- CA-28

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [ ] TU-16 — Configuração, erros e logs seguros. Escopo nesta tarefa: Configuração comum/HTTP, sanitização e tradução pública dos erros; preservar seed sem Resend.

### Testes de integração (se aplicável)

- [ ] TI-11 — Cookie, origem e proteção direta. Escopo nesta tarefa: Faceta de origem e limites HTTP; cookies/sessão pertencem à tarefa 5 e proteção da consulta à tarefa 6.
- [ ] TI-16 — Falhas de dependências e prazos HTTP. Escopo nesta tarefa: Faceta de orçamento HTTP e erro de dependência em aplicação de teste; resultados dos recursos reais serão exercitados nas tarefas 3, 5 e 6.
- [ ] TI-17 — Bootstrap e desligamento. Escopo nesta tarefa: Caso completo de inicialização e desligamento.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/config/`
- `backend/src/protocols.ts`
- `backend/src/errors/`
- `backend/src/middlewares/`
- `backend/src/routers/health-router.ts`
- `backend/src/controllers/health-controller.ts`
- `backend/vitest.config.ts`
- `backend/.env.development.example`
- `backend/.env.test.example`
- `backend/README.md`
- `AGENTS.md`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_1.md` e `tasks.md` para atualização de progresso ao concluir a implementação.
