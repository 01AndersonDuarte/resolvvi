# Tarefa 9.0: Interface de consulta, resultado, retorno e recuperação de erros

## Visão geral

Entregar a jornada autenticada de consulta até a página mínima do processo, com retorno preservando a entrada e descarte de resultados após perda de sessão.

**Dependências:** [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md)

<skills>

### Conformidade com skills

- [`executar-task`](../../.agents/skills/executar-task/SKILL.md): fluxo de implementação incremental, validações, checklists e limpeza do ambiente.
- [`react`](../../.agents/skills/react/SKILL.md): obrigatória ao criar, alterar ou revisar frontend, inclusive seus testes.
- [`impeccable`](../../.agents/skills/impeccable/SKILL.md): orientar interfaces e verificações visuais/acessíveis pertinentes; preservar os contratos e mensagens do PRD.

</skills>

<rules>

### Conformidade com o AGENTS.md e as rules

Leitura realizada do `AGENTS.md` e de todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `folder-structure.md`, `tests.md` e `commit_guidelines.md`. Usar a versão desses arquivos vigente na execução. Aplicar tipagem explícita, módulos ESM, limites de tamanho, camadas e logging centralizado; manter npm/locks separados, segredos fora do repositório e testes FIRST junto ao código. Cobertura mínima de 80% em linhas, funções, branches e statements por aplicativo afetado, sem exclusões artificiais. Criar commits locais de incrementos validados com staging explícito, preservar alterações alheias e não fazer push sem autorização.

No frontend, manter componentes até 30 linhas, props explícitas, acesso HTTP em services/hooks, efeitos com limpeza e Tailwind. Não há desvio adicional previsto.

</rules>

<requirements>

- RF7–RF10: tela simples com campo CNJ, validação de estrutura, envio por Enter e estado de espera sem submissões duplicadas.
- RF11–RF14: navegar somente para correspondência exata, mostrar CNJ do resultado e permitir retorno/recarga/destino direto.
- RF6 e RF15–RF17: saída, recuperação de falhas, proteção contra respostas antigas, teclado e acessibilidade.
- RN5 e RN6: sem conteúdo processual adicional, consultas externas ou resultados aproximados.

</requirements>

## Subtarefas

- [x] 9.1 Criar ProcessSearchView com campo CNJ, ação principal e ajuda, validação de formato e estados previstos no PRD.
- [x] 9.2 Integrar useProcessSearch e serviços de consulta, bloqueando campo/submissão durante a tentativa e preservando entrada nas falhas.
- [x] 9.3 Criar ProcessFoundView e useProcessDetails com leitura por ID, destino ausente e navegação direta/recarga.
- [x] 9.4 Implementar retenção do último CNJ vinculada à sessão e limpeza ao sair, expirar ou trocar de sessão.
- [x] 9.5 Integrar LogoutButton, recuperação de erros e descarte de respostas tardias nas telas protegidas.
- [x] 9.6 Implementar testes de comportamento/foco e layout responsivo, sem duplicar o algoritmo CNJ; executar as verificações do frontend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Design de implementação → Principais interfaces: Entrada CNJ e busca; Link e frontend
- Design de implementação → Modelos de dados: ProcessSummary e ApiError
- Design de implementação → Endpoints processuais
- PRD → Experiência do usuário: consulta, destino, falhas e acessibilidade

Dentro de `frontend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-03
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
- CA-27

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [x] TU-04 — Entrada CNJ vazia e estrutura estrita. Escopo nesta tarefa: Faceta frontend de obrigatoriedade/formato; sem cálculo de dígito verificador.
- [x] TU-12 — Consulta por Enter e prevenção de duplicidade. Escopo nesta tarefa: Caso completo de Enter, bloqueio do campo e substituição do estado anterior.
- [x] TU-13 — Timeout e descarte de respostas obsoletas. Escopo nesta tarefa: Faceta processual: timeout/expiração/saída impedem resultado tardio.
- [x] TU-14 — Destino, retorno e isolamento de sessão. Escopo nesta tarefa: Caso completo de destino, retorno e isolamento da entrada por sessão.
- [x] TU-15 — Semântica, foco e mensagens acessíveis. Escopo nesta tarefa: Faceta das telas protegidas, rótulos, mensagens e foco.

### Testes de integração (se aplicável)

Não há casos desta camada definidos pela TechSpec para este incremento. Os comportamentos atribuídos são exercitados pelos casos acima e pela jornada final.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `frontend/src/views/ProcessSearchView.tsx`
- `frontend/src/views/ProcessFoundView.tsx`
- `frontend/src/hooks/useProcessSearch.ts`
- `frontend/src/hooks/useProcessDetails.ts`
- `frontend/src/services/`
- `frontend/src/types/`
- `frontend/src/components/LogoutButton.tsx`
- `frontend/src/components/`
- `frontend/src/App.tsx`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_9.md` e `tasks.md` para atualização de progresso ao concluir a implementação.

## Evidências de conclusão

- Frontend: `npm run lint`, `npm run typecheck` e `npm run build` concluídos com sucesso.
- Testes: `npm test` e `npm run test:coverage` — 18 arquivos, 122 testes aprovados; 95,21% statements, 90,52% branches, 97,11% funções e 97,23% linhas.
- Detector Impeccable executado nos alvos visuais: resultado sem observações (`[]`).
- Busca e destino usam somente os contratos `POST /api/processes/search` e `GET /api/processes/:id`; a página de destino exibe somente o CNJ da resposta. A inspeção visual manual em navegador permanece na tarefa 10.
