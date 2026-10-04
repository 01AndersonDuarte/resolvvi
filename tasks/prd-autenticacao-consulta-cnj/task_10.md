# Tarefa 10.0: Jornadas E2E, qualidade, documentação e aceite real do Resend

## Visão geral

Entregar a infraestrutura e as jornadas E2E completas, consolidar evidências de qualidade e documentar o aceite controlado do produto com e-mail real e acessibilidade.

**Dependências:** [1.0](./task_1.md), [2.0](./task_2.md), [3.0](./task_3.md), [4.0](./task_4.md), [5.0](./task_5.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md), [9.0](./task_9.md)

**Pré-requisito externo:** Requer infraestrutura de testes isolada e, para concluir o aceite externo, domínio/remetente Resend verificados, credencial protegida, URL pública correta e caixa controlada. Se faltar uma condição, registrar o bloqueio e manter os itens correspondentes abertos; aprovação das suítes simuladas não substitui recebimento real.

<skills>

### Conformidade com skills

- [`executar-task`](../../.agents/skills/executar-task/SKILL.md): fluxo de implementação incremental, validações, checklists e limpeza do ambiente.
- [`react`](../../.agents/skills/react/SKILL.md): obrigatória ao criar, alterar ou revisar frontend, inclusive seus testes.
- [`impeccable`](../../.agents/skills/impeccable/SKILL.md): orientar interfaces e verificações visuais/acessíveis pertinentes; preservar os contratos e mensagens do PRD.
- [`executar-qa`](../../.agents/skills/executar-qa/SKILL.md): aplicável quando iniciar a validação formal de aceitação; manter seu relatório distinto dos testes de implementação.

</skills>

<rules>

### Conformidade com o AGENTS.md e as rules

Leitura realizada do `AGENTS.md` e de todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `folder-structure.md`, `tests.md` e `commit_guidelines.md`. Usar a versão desses arquivos vigente na execução. Aplicar tipagem explícita, módulos ESM, limites de tamanho, camadas e logging centralizado; manter npm/locks separados, segredos fora do repositório e testes FIRST junto ao código. Cobertura mínima de 80% em linhas, funções, branches e statements por aplicativo afetado, sem exclusões artificiais. Criar commits locais de incrementos validados com staging explícito, preservar alterações alheias e não fazer push sem autorização.

No frontend, manter componentes até 30 linhas, props explícitas, acesso HTTP em services/hooks, efeitos com limpeza e Tailwind. Não há desvio adicional previsto.

</rules>

<requirements>

- O1–O7 e RF1–RF23: integrar os incrementos na jornada descrita pelo PRD, sem substituir testes de unidade/integração por E2E.
- CA-19: qualidade e cobertura mínima em cada aplicativo, com integração realmente executada.
- CA-17 e CA-28: complementar automação com leitor de tela, zoom real e envio/recebimento em caixa controlada.
- RN5: preservar processos e movimentações durante preparação, execução e limpeza.

</requirements>

## Subtarefas

- [x] 10.1 Configurar Playwright no frontend e testes em e2e/ na raiz, com SPA/API reais, portas disponíveis e banco dedicado.
- [x] 10.2 Integrar o provedor de confirmação simulado e coletor privado do harness, sem endpoint de produção para obter tokens.
- [x] 10.3 Implementar E2E-01 e E2E-02 para cadastro, confirmação em outro contexto, reenvio e recuperação.
- [x] 10.4 Implementar E2E-03, E2E-04 e E2E-05 para consulta, autorização, saída, teclado e tela pequena.
- [x] 10.5 Executar as suítes e verificações dos dois aplicativos, conferir cobertura e rastreabilidade de todos os casos; corrigir falhas dentro do escopo.
- [ ] 10.6 Realizar e registrar aceite de leitor de tela/zoom e envio/recebimento real pelo Resend em ambiente controlado, sem registrar segredos.
- [x] 10.7 Atualizar documentação operacional e evidências, registrar dependências realmente atendidas e encerrar somente recursos iniciados pela execução.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Abordagem de testes: todas as camadas e aceite complementar
- Pontos de integração
- Sequenciamento do desenvolvimento → Dependências técnicas
- Monitoramento e observabilidade
- PRD → Definição de pronto

Executar `lint`, `typecheck`, `test`, `test:coverage` e `build` dentro de cada aplicativo, mais `npm run test:e2e` em `frontend/`. Exigir banco isolado e execução efetiva dos testes de integração. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

A validação formal dos critérios de aceitação pertence ao QA. Esta tarefa entrega testes e evidências; não declarar conformidade de CA-17 por automação apenas, nem CA-28 sem recebimento real. Manter evidências sanitizadas e não antecipar a marcação de pronto.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

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
- CA-23
- CA-24
- CA-25
- CA-26
- CA-27
- CA-28

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

Não há novos casos desta camada atribuídos a esta tarefa. Reexecutar os casos existentes da TechSpec para validar a integração final, sem substituir ou renumerar seus IDs.

### Testes de integração (se aplicável)

Não há novos casos desta camada atribuídos a esta tarefa. Reexecutar os casos existentes da TechSpec para validar a integração final, sem substituir ou renumerar seus IDs.

### Testes E2E (se aplicável)

- [x] E2E-01 — Cadastro até consulta e retorno. Escopo nesta tarefa: Caso completo conforme a TechSpec.
- [x] E2E-02 — Link expirado, reenvio e recuperação. Escopo nesta tarefa: Caso completo conforme a TechSpec.
- [x] E2E-03 — Consulta inválida, ausente, falha e correção. Escopo nesta tarefa: Caso completo conforme a TechSpec.
- [x] E2E-04 — Autorização, expiração e saída. Escopo nesta tarefa: Caso completo conforme a TechSpec.
- [x] E2E-05 — Jornada por teclado e viewport pequeno. Escopo nesta tarefa: Caso completo conforme a TechSpec.

## Arquivos relevantes

- `frontend/playwright.config.ts`
- `frontend/package.json`
- `frontend/package-lock.json`
- `e2e/*.spec.ts`
- `e2e/support/`
- `backend/vitest.config.ts`
- `frontend/vitest.config.ts`
- `backend/README.md`
- `frontend/README.md`
- `AGENTS.md`
- `tasks/prd-autenticacao-consulta-cnj/evidences/`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_10.md` e `tasks.md` para atualização de progresso ao concluir a implementação.

## Evidências

Resultados e aceite externo pendente: [`evidences/task-10.md`](./evidences/task-10.md).
