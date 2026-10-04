# Tarefa 6.0: API protegida de consulta CNJ e destino mínimo do processo

## Visão geral

Validar a estrutura da entrada CNJ e entregar os dois endpoints processuais protegidos, com projeção mínima e preservação da base.

**Dependências:** [5.0](./task_5.md)

**Validação CNJ nesta tarefa:** conferir somente estrutura completa e dígitos ASCII, aceitando máscara padrão ou 20 dígitos sem pontuação. Não calcular os dígitos verificadores. A busca continua exata pelo CNJ normalizado.

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

- RF11 e RF13: autorizar antes de validar o domínio ou buscar processos; qualquer conta autenticada tem o mesmo acesso de leitura.
- RF8, RF9 e RF11: entrada estrita, equivalência dos dois formatos, preservação de zeros e busca exata.
- RF12–RF15: payload mínimo, destino estável e erros distintos de ausência, entrada inválida e infraestrutura.
- RN2, RN5 e RN6: preservar identificador persistido e todo o conteúdo processual, sem carga nem consulta externa.

</requirements>

## Subtarefas

- [x] 6.1 Definir e cobrir entradas vazias, formatos inválidos, 20 dígitos ASCII, máscara padrão e zeros à esquerda, sem cálculo de dígito verificador.
- [x] 6.2 Criar o adaptador de entrada CNJ e produzir o formato textual esperado pelo repositório existente.
- [x] 6.3 Expor POST /api/processes/search com autorização antes da busca e tratamento distinto de validação, ausência e falha.
- [x] 6.4 Adicionar projeções mínimas por CNJ e ID ao repositório e expor GET /api/processes/:id.
- [x] 6.5 Integrar revalidação de sessão, prazo e respostas sem cache; provar proteção contra chamadas diretas.
- [x] 6.6 Implementar testes de integração das rotas e snapshots da base, preservando os testes da fundação; executar as verificações do backend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Resumo: regras de domínio e formatos aceitos
- Design de implementação → Principais interfaces: Entrada CNJ e busca; Sessão e autorização
- Design de implementação → Modelos de dados: CnjInput, ProcessIdInput e ProcessSummary
- Design de implementação → Endpoints: POST /api/processes/search e GET /api/processes/:id
- Sequenciamento do desenvolvimento → Dependências técnicas

Dentro de `backend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-03
- CA-04
- CA-05
- CA-06
- CA-07
- CA-08
- CA-09
- CA-10
- CA-12
- CA-15
- CA-18
- CA-19
- CA-27

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [x] TU-04 — Entrada CNJ vazia e estrutura estrita. Escopo nesta tarefa: Entrada vazia, formato estrito, máscara e zeros.
- [x] TU-05 — Contrato de normalização CNJ. Escopo nesta tarefa: Apenas estrutura e dígitos ASCII; nenhum cálculo de dígito verificador.

### Testes de integração (se aplicável)

- [x] TI-11 — Cookie, origem e proteção direta. Escopo nesta tarefa: Completar proteção dos endpoints processuais antes de qualquer leitura.
- [x] TI-13 — CNJs equivalentes, inválidos e ausentes. Escopo nesta tarefa: CNJs equivalentes, formato inválido, resultado ausente e busca exata sem cálculo de dígito verificador.
- [x] TI-14 — Leitura mínima por CNJ e por ID. Escopo nesta tarefa: Duas contas, busca e destino por ID com payload mínimo.
- [x] TI-15 — Integridade da base processual. Escopo nesta tarefa: Snapshot integral antes/depois, incluindo sucesso, ausência e falha.
- [x] TI-16 — Falhas de dependências e prazos HTTP. Escopo nesta tarefa: Faceta processual: falha/timeout nunca se tornam resultado ausente.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `backend/src/services/cnj-input-service.ts`
- `backend/src/services/process-service.ts`
- `backend/src/repositories/process-repository.ts`
- `backend/src/routers/process-router.ts`
- `backend/src/controllers/process-controller.ts`
- `backend/src/schemas/`
- `backend/src/middlewares/session-middleware.ts`
- `backend/src/errors/`
- `backend/src/app.ts`
- `backend/src/repositories/process-repository.integration.test.ts`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_6.md` e `tasks.md` para atualização de progresso ao concluir a implementação.

## Evidências de validação

- `npm run lint` — passou.
- `npm run typecheck` — passou.
- `npm test` — 183 testes em 37 arquivos passaram, incluindo integração PostgreSQL isolada e chamadas HTTP.
- `npm run test:coverage` — passou; statements 92,11%, branches 85%, funções 95,18% e linhas 95,39%.
- `npm run build` — passou.
