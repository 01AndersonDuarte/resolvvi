# Tarefa 7.0: Jornadas E2E e validação final

## Visão geral

Automatizar as cinco jornadas críticas com a aplicação real e consolidar as evidências dos critérios de aceitação, responsividade, zoom e qualidade. Esta tarefa encerra a implementação somente após os gates previstos na TechSpec.

**Dependências:** [3.0](./task_3.md), [6.0](./task_6.md)

**Status:** concluída e validada.

<skills>
### Conformidade com skills

Skill de execução aplicável: [`executar-task`](../../.agents/skills/executar-task/SKILL.md). Carregar [`react`](../../.agents/skills/react/SKILL.md) se houver alterações em código ou testes do frontend. A validação formal pode ser conduzida com [`executar-qa`](../../.agents/skills/executar-qa/SKILL.md) quando invocada; esta tarefa mantém os casos e gates já definidos na TechSpec.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura concluída de `AGENTS.md` e de todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Manter aplicativos independentes, funções de até 30 linhas e arquivos TypeScript de até 300 linhas, tipos seguros, imports sem ciclos e testes de comportamento segundo FIRST/AAA. Preservar cobertura mínima de 80%, segredos fora do código e logs sanitizados. Ao executar, revisar o diff, atualizar os checklists e criar commit local coeso com identidade Git configurada e Conventional Commits em inglês; push exige autorização separada.

No frontend, separar views/components, hooks, services e tipos por arquivo; usar Tailwind, props explícitas e estado sem redundância. O limite de acessibilidade definido no PRD prevalece sobre a orientação genérica da skill React de anúncios assíncronos: não acrescentar anúncios, foco programático ou controles próprios de zoom. Chamadas HTTP ficam em `src/services/`, conforme as rules.
</rules>

<requirements>
Requisitos relacionados: RF1, RF2, RF3, RF4, RF5, RF6, RF7, RF8, RF9, RF10, RF11, RF12, RF13, RF14, RF15, RF16, RF17, RF18, RF19, RF20, RF21.

- Reutilizar o harness, os ambientes isolados e o suporte E2E existentes, com fixture carregada e IDs resolvidos pela busca CNJ.
- Cobrir consulta, detalhes, expansão, paginação e retorno; acesso direto e recarga; falha localizada; expiração; teclado e ampliação.
- Executar as verificações de ambos os aplicativos e manter 80% em linhas, funções, branches e statements, além da cobertura global mínima.
- Registrar evidências rastreáveis de CA-01 a CA-22, incluindo medições de volume e distinção entre emulação de layout e zoom nativo.
</requirements>

## Subtarefas

- [x] 7.1 Preparar banco E2E isolado com migrations existentes e fixture, reutilizando Playwright e servidores de aplicação/controle existentes.
- [x] 7.2 Criar e2e/process-details.spec.ts com E2E-01 e E2E-02, cobrindo retorno com e sem consulta prévia e destinos inválido/ausente.
- [x] 7.3 Implementar E2E-03 com interceptação apenas da falha específica do histórico e E2E-04 com o controle /expire-session existente.
- [x] 7.4 Implementar E2E-05 em celular e desktop com textos longos, teclado e ampliação CSS de 200%; complementar com verificação pontual de zoom nativo de 200% e registrar a diferença.
- [x] 7.5 Executar lint, tipos, testes, cobertura e build em cada aplicativo e test:e2e no frontend; corrigir regressões e repetir as verificações afetadas.
- [x] 7.6 Consolidar evidências dos critérios, resultados das suítes, cobertura e medições de 1.000 eventos da tarefa 2; atualizar checklists somente após validação.
- [x] 7.7 Executar as validações concluídas desta etapa e registrar evidências; atualizar os checklists e criar o commit local do incremento.

## Detalhes de implementação

Seguir as seções abaixo do [techspec.md](./techspec.md), fonte de verdade dos contratos e casos de teste:

- Abordagem de testes: Testes E2E e gates de CA-22.
- Dependências técnicas.
- Monitoramento e observabilidade.
- Riscos conhecidos: zoom automatizado.

A jornada de sucesso usa backend real. CSS zoom é aproximação de layout; deviceScaleFactor não representa zoom do navegador. A verificação nativa deve ser registrada separadamente e não pode ser declarada concluída apenas pela emulação. Não criar controles de ampliação no produto nem matriz de leitores de tela. A rastreabilidade final inclui os testes das tarefas anteriores; estes cinco E2E não substituem os 19 casos unitários e oito de integração.

## Critérios de aceitação relacionados

Referências ao [PRD](./prd.md). A validação dos critérios é responsabilidade do QA; esta tarefa produz a implementação e/ou as evidências correspondentes.

- CA-01
- CA-02
- CA-03
- CA-04
- CA-05
- CA-06
- CA-07
- CA-08
- CA-09
- CA-10
- CA-11
- CA-12
- CA-13
- CA-14
- CA-15
- CA-16
- CA-17
- CA-18
- CA-19
- CA-20
- CA-21
- CA-22

## Testes da tarefa

IDs, nomes e resultados esperados preservados da TechSpec. Casos compartilhados têm seu recorte explicitado em “Detalhes de implementação”.

### Testes E2E

- [x] E2E-01 — Consulta até detalhes, expansão, paginação e retorno. Jornada completa com backend real e texto integral; CNJ anterior preservado.
- [x] E2E-02 — Acesso direto e recarga independem da busca. Destino válido abre página 1; variantes inválida/ausente oferecem retorno.
- [x] E2E-03 — Histórico recupera falha sem apagar processo. Falha controlada na requisição de movimentos, nova tentativa e confirmação da página correta.
- [x] E2E-04 — Expiração durante detalhes bloqueia paginação. Controle de expiração existente força sessão inválida; dados saem da tela.
- [x] E2E-05 — Operação por teclado e layout ampliado. Celular/desktop, expansão, paginação, retorno e CSS zoom de 200% passaram; o usuário confirmou manualmente que o zoom nativo do navegador a 200% também está utilizável.

### Validações de conclusão

Executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` no aplicativo afetado. Os scripts atuais existem em ambos os aplicativos; prevalecem sobre as observações antigas de ausência de lint/testes. Não reduzir os limites de cobertura nem excluir código novo para atingir o percentual.

Executar também `npm run test:e2e` dentro de `frontend/`. Registrar a verificação manual de zoom nativo e os resultados de todos os gates, sem declarar testes futuros como aprovados.

### Evidências da execução

- Banco E2E `dev_test_resolvvi_e2e_test`, já migrado e com a fixture: 100 processos e 5.568 movimentações. API na porta 3050, controle na 3051 e frontend na 5100; os processos temporários do Playwright foram encerrados ao final.
- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados em `frontend/` e `backend/`.
- O arquivo `e2e/process-details.spec.ts` também passou pelo ESLint com a configuração do frontend.
- `npm test`: frontend, 22 arquivos e 131 testes aprovados; backend, 32 arquivos e 167 testes aprovados.
- `npm run test:coverage`: frontend com 93,53% statements, 91,26% branches, 95,65% funções e 95,88% linhas; backend com 87,98% statements, 85,50% branches, 86,86% funções e 90,16% linhas.
- `npm run test:e2e`: 10 testes aprovados, incluindo os cinco cenários desta tarefa.
- TI-02, dataset de 1.000 eventos: 50 páginas, 127.877 bytes no total e 961,13 ms observados nesta execução. Medição observacional; não constitui SLA.
- CSS zoom de 200% foi exercitado como emulação de layout em celular e desktop. Em Chromium visível, os atalhos `Ctrl+=` e `Ctrl+Shift+=` não alteraram `devicePixelRatio` nem `innerWidth`; portanto, isso não demonstra zoom nativo. Em 2026-10-04, o usuário confirmou a checagem manual no zoom nativo de 200% e informou que está tudo utilizável.

## Arquivos relevantes

- [PRD](./prd.md) e [TechSpec](./techspec.md).
- `e2e/process-details.spec.ts`.
- `e2e/authentication-and-search.spec.ts`.
- `frontend/e2e-support/session.ts`.
- `frontend/e2e-support/playwright.ts`.
- `frontend/playwright.config.ts`.
- `backend/src/e2e-harness.ts`.
- `backend/compose.yaml`.
- `backend/vitest.config.ts`.
- `frontend/vitest.config.ts`.
- `backend/package.json`.
- `frontend/package.json`.

Os caminhos novos indicam arquivos a criar na implementação; dependências existentes são referências, sem obrigação de alterá-las.
