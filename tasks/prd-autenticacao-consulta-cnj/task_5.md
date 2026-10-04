# Tarefa 5.0: Login, sessão, autorização e logout com revogação

## Visão geral

Entregar autenticação de contas confirmadas e o ciclo completo de sessão persistida, com cookie protegido, expiração absoluta e revogação remota.

**Dependências:** [4.0](./task_4.md)

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

- RF1–RF4: conferir senha antes da confirmação, responder credenciais erradas de forma comum e autorizar somente sessão válida de conta confirmada.
- RF3: persistir sessão por no máximo oito horas, sem renovação automática.
- RF6, RF15 e RF16: revogar no logout, revalidar acesso e distinguir falhas de infraestrutura de credenciais recusadas.
- RF21: conta pendente com senha correta recebe orientação de confirmação e permanece sem sessão.

</requirements>

## Subtarefas

- [ ] 5.1 Expor POST /api/auth/login, GET /api/auth/session e POST /api/auth/logout com os contratos da TechSpec.
- [ ] 5.2 Implementar serviço de login, tratamento comum de credenciais recusadas e bloqueio de conta pendente.
- [ ] 5.3 Implementar criação, leitura e revogação da sessão, incluindo substituição da sessão anterior ao novo login.
- [ ] 5.4 Configurar cookie por ambiente, middleware de sessão, checagem de confirmação e revalidação após espera.
- [ ] 5.5 Tratar saída repetida, falha de revogação, timeout e proibição de cookie tardio sem afirmar sucesso remoto indevido.
- [ ] 5.6 Implementar testes completos do ciclo de sessão e suas fronteiras; executar as verificações do backend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Design de implementação → Principais interfaces: Sessão e autorização; Proteção HTTP
- Design de implementação → Modelos de dados: SessionResponse, Session e ApiError
- Design de implementação → Endpoints: login, session e logout

Dentro de `backend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-01
- CA-02
- CA-03
- CA-12
- CA-13
- CA-14
- CA-19
- CA-23
- CA-27

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [ ] TU-03 — Verificação de senha e erro comum. Escopo nesta tarefa: Completar a decisão de login e a mensagem comum, além das primitivas da tarefa 2.
- [ ] TU-06 — Expiração absoluta e revogação. Escopo nesta tarefa: Expiração absoluta e revogação.

### Testes de integração (se aplicável)

- [ ] TI-10 — Login, credenciais erradas e pendência. Escopo nesta tarefa: Contrato completo de login e conta pendente.
- [ ] TI-11 — Cookie, origem e proteção direta. Escopo nesta tarefa: Faceta de cookies, origem e middleware; proteção das rotas processuais será completada na tarefa 6.
- [ ] TI-12 — Expiração e logout revogável. Escopo nesta tarefa: Caso completo de expiração e revogação HTTP, incluindo token anterior capturado.
- [ ] TI-16 — Falhas de dependências e prazos HTTP. Escopo nesta tarefa: Faceta de autenticação e logout, sem cookie tardio e sem falso sucesso de revogação.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `backend/src/routers/auth-router.ts`
- `backend/src/controllers/session-controller.ts`
- `backend/src/services/auth-service.ts`
- `backend/src/services/security-service.ts`
- `backend/src/repositories/auth-repository.ts`
- `backend/src/types/auth.ts`
- `backend/src/middlewares/session-middleware.ts`
- `backend/src/schemas/`
- `backend/src/errors/`
- `backend/src/app.ts`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_5.md` e `tasks.md` para atualização de progresso ao concluir a implementação.
