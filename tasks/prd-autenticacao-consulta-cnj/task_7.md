# Tarefa 7.0: Base React, cliente HTTP, controle de sessão e rotas protegidas

## Visão geral

Criar o frontend e a infraestrutura compartilhada de navegação, requisições e sessão para integrar as telas das próximas tarefas com segurança.

**Dependências:** [5.0](./task_5.md)

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

- RF3, RF4, RF6 e RF16: restaurar acesso somente após checagem remota, retirar dados ao perder sessão e recuperar logout pendente.
- RF10 e RF23: aplicar prazo e descarte de respostas obsoletas a todas as operações da jornada.
- RF17: disponibilizar componentes semânticos reutilizáveis, foco e anúncios acessíveis.
- O6: configurar testes, lint, tipos, build e cobertura mínima do novo aplicativo.

</requirements>

## Subtarefas

- [x] 7.1 Criar React 19, TypeScript, Vite e Tailwind com lock independente, scripts de qualidade e proxy configurável na mesma origem.
- [x] 7.2 Definir a base visual funcional com impeccable e criar componentes de formulário, mensagem e título conforme React e o PRD.
- [x] 7.3 Implementar cliente HTTP, contratos e hook de requisição com cancelamento, prazo e identificação da tentativa/geração de sessão.
- [x] 7.4 Implementar AuthProvider, useSession e ProtectedRoute com bootstrap remoto, expiração e tratamento seguro de falhas.
- [x] 7.5 Implementar invalidação entre abas, retomada/retorno do navegador e saída pendente, sem armazenar credenciais em Web Storage.
- [x] 7.6 Configurar Vitest/V8, Testing Library e ambiente DOM; testar os componentes e infraestrutura deste incremento e executar as verificações do frontend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Arquitetura do sistema → Visão dos componentes: frontend
- Design de implementação → Principais interfaces: Link e frontend; Sessão e autorização
- Design de implementação → Modelos de dados: SessionResponse e ApiError
- Abordagem de testes
- Considerações técnicas → Conformidade com skills

Dentro de `frontend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

Pode iniciar após a tarefa 5, mesmo com a tarefa 6 bloqueada. Testar a infraestrutura por componentes de teste; não publicar páginas processuais com dados fictícios ou ignorar checagem remota de sessão.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-03
- CA-12
- CA-13
- CA-14
- CA-17
- CA-19
- CA-27
- CA-28

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [x] TU-13 — Timeout e descarte de respostas obsoletas. Escopo nesta tarefa: Faceta compartilhada de prazo, cancelamento e geração de sessão; telas reais serão integradas nas tarefas 8 e 9.
- [x] TU-15 — Semântica, foco e mensagens acessíveis. Escopo nesta tarefa: Faceta dos componentes reutilizáveis e navegação/foco.
- [x] TU-16 — Configuração, erros e logs seguros. Escopo nesta tarefa: Faceta frontend: configuração pública sem segredos, erros seguros e ausência de logs de dados sensíveis.
- [x] TU-17 — Saída sem conexão e login com resposta tardia. Escopo nesta tarefa: Faceta do gerenciador de sessão e recuperação de saída; resposta tardia no formulário será integrada na tarefa 8.

### Testes de integração (se aplicável)

Não há casos desta camada definidos pela TechSpec para este incremento. Os comportamentos atribuídos são exercitados pelos casos acima e pela jornada final.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/vitest.config.ts`
- `frontend/eslint.config.js`
- `frontend/tsconfig.json`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/components/`
- `frontend/src/hooks/useSession.ts`
- `frontend/src/hooks/useRequest.ts`
- `frontend/src/services/`
- `frontend/src/types/`
- `frontend/.env.development.example`
- `frontend/README.md`
- `AGENTS.md`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_7.md` e `tasks.md` para atualização de progresso ao concluir a implementação.

## Evidências de conclusão

- Executados em `frontend/`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`; todos aprovados.
- Vitest: 48 testes aprovados; cobertura V8: 95,91% statements, 94% branches, 97,24% funções e 97,02% linhas.
- Detector visual impeccable executado uma vez nos arquivos alterados: sem achados. Capturas desktop e móvel em `.impeccable/screenshots/`; contrato de direção presente no `frontend/dist/index.html` após o build.
- Revisão visual de acabamento: PASS, sem ajustes materiais pendentes; capturas comparadas à composição C aprovada. O sistema visual está registrado em `DESIGN.md` e `.impeccable/design.json`.
