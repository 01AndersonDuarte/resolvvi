# Tarefa 8.0: Telas de cadastro, confirmação, reenvio e login

## Visão geral

Conectar a interface pública aos fluxos reais da API, permitindo obter e confirmar a própria conta antes do login, com recuperação de erros e suporte a teclado.

**Dependências:** [3.0](./task_3.md), [4.0](./task_4.md), [7.0](./task_7.md)

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

- RF1, RF2 e RF18: formulário de acesso e cadastro somente com e-mail/senha, com validação e credenciais recusadas de forma comum.
- RF19–RF23: espera de confirmação, consumo explícito do link, reenvio com limites, recuperação de falha/resultado desconhecido e ausência de login automático.
- RF15–RF17: mensagens compreensíveis, e-mail preservado, bloqueio de envios repetidos e estados acessíveis.

</requirements>

## Subtarefas

- [ ] 8.1 Criar LoginView, SignUpView, VerificationPendingView, EmailVerificationView e ResendVerificationView com as rotas previstas.
- [ ] 8.2 Integrar services e hooks de cadastro/login, preservando identidade e senha conforme o contrato e impedindo duplicidade.
- [ ] 8.3 Implementar leitura e remoção do token do fragmento e confirmação por ação explícita, sem consumo automático em efeito.
- [ ] 8.4 Integrar reenvio e contagem de espera, inclusive quando é necessário informar o e-mail novamente.
- [ ] 8.5 Integrar respostas neutras, pendência, falhas e resultado desconhecido com as mensagens do PRD, incluindo login tardio e saída pendente.
- [ ] 8.6 Implementar testes de componentes e jornadas públicas no escopo unitário, conferir teclado/responsividade e executar as verificações do frontend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Design de implementação → Principais interfaces: Link e frontend
- Design de implementação → Modelos de dados: CredentialsInput, EmailInput, ConfirmationInput, MessageResponse e ApiError
- Design de implementação → Endpoints de autenticação
- Abordagem de testes → Testes de unidade
- PRD → Experiência do usuário: estados, mensagens e diretrizes

Dentro de `frontend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-01
- CA-02
- CA-12
- CA-13
- CA-14
- CA-17
- CA-20
- CA-21
- CA-22
- CA-23
- CA-24
- CA-25
- CA-26
- CA-27

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [ ] TU-01 — Normalização e validação de identidade. Escopo nesta tarefa: Faceta frontend de entrada e feedback do e-mail.
- [ ] TU-02 — Política de senha e preservação Unicode. Escopo nesta tarefa: Faceta frontend dos limites e preservação da senha.
- [ ] TU-03 — Verificação de senha e erro comum. Escopo nesta tarefa: Faceta de exibição de credenciais recusadas e conta pendente, sem hash no frontend.
- [ ] TU-11 — Estados e recuperação de cadastro/reenvio. Escopo nesta tarefa: Caso completo de estados e recuperação de cadastro/reenvio.
- [ ] TU-13 — Timeout e descarte de respostas obsoletas. Escopo nesta tarefa: Faceta das telas públicas e confirmação, incluindo resposta após timeout.
- [ ] TU-15 — Semântica, foco e mensagens acessíveis. Escopo nesta tarefa: Faceta de formulários públicos, foco, anúncios e senha colável.
- [ ] TU-17 — Saída sem conexão e login com resposta tardia. Escopo nesta tarefa: Completar resposta tardia de login integrada ao formulário e gerenciador de sessão.

### Testes de integração (se aplicável)

Não há casos desta camada definidos pela TechSpec para este incremento. Os comportamentos atribuídos são exercitados pelos casos acima e pela jornada final.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `frontend/src/views/`
- `frontend/src/hooks/useRegistration.ts`
- `frontend/src/hooks/useVerification.ts`
- `frontend/src/hooks/useLogin.ts`
- `frontend/src/services/`
- `frontend/src/types/`
- `frontend/src/components/`
- `frontend/src/App.tsx`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_8.md` e `tasks.md` para atualização de progresso ao concluir a implementação.
