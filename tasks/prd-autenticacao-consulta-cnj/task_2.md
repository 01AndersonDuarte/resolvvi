# Tarefa 2.0: Persistência de autenticação e segurança de senhas e tokens

## Visão geral

Entregar os modelos persistidos e as primitivas de identidade e segurança usados pelos fluxos de autenticação, sem alterar o domínio processual.

**Dependências:** [1.0](./task_1.md)

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

- RF18 e RF19: identidade normalizada, senha preservada e unicidade garantida pelo banco.
- RF3, RF6 e RF21: modelar sessões revogáveis e confirmações vinculadas a uma única conta, com vencimento e estado de consumo.
- RF22: persistir reservas de emissão e seus índices para os limites concorrentes da tarefa 3.
- RN5 e RN8: migration aditiva, sem modificar processos, movimentações ou credenciais existentes.

</requirements>

## Subtarefas

- [x] 2.1 Adicionar User, Session e EmailVerification ao schema e gerar migration aditiva com o Prisma.
- [x] 2.2 Criar contratos derivados dos modelos e repositórios de autenticação, com fronteiras de transação e injeção do cliente.
- [x] 2.3 Implementar normalização/validação do e-mail e validação da senha com preservação integral de seu conteúdo.
- [x] 2.4 Implementar derivação/verificação assíncrona de senhas e limites de concorrência de trabalho, conforme a TechSpec.
- [x] 2.5 Implementar geração de segredos independentes e digests para persistência; garantir que o segredo transitório não apareça em logs ou contratos públicos.
- [x] 2.6 Testar unicidade concorrente, persistência e primitivas de segurança no escopo definido abaixo; executar migration em banco isolado e as verificações do backend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Design de implementação → Principais interfaces: Cadastro e concorrência; Senhas e segredos
- Design de implementação → Modelos de dados: CredentialsInput, User, Session e EmailVerification
- Pontos de integração: migrations e preservação da fundação
- Abordagem de testes → Testes de integração

Dentro de `backend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

Os repositórios desta tarefa fornecem a persistência necessária; regras de emissão/consumo e seus endpoints são concluídos nas tarefas 3 e 4. Facetas parciais de TI-03 e TI-12 não declaram esses casos completos antes das tarefas responsáveis.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-01
- CA-02
- CA-13
- CA-14
- CA-18
- CA-21
- CA-22
- CA-23
- CA-26

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [x] TU-01 — Normalização e validação de identidade. Escopo nesta tarefa: Regras backend de identidade.
- [x] TU-02 — Política de senha e preservação Unicode. Escopo nesta tarefa: Política backend, limites Unicode e preservação.
- [x] TU-03 — Verificação de senha e erro comum. Escopo nesta tarefa: Faceta de hash/verificação, salt, conteúdo preservado e hash fictício; a decisão de login será concluída na tarefa 5.

### Testes de integração (se aplicável)

- [x] TI-03 — Cadastros simultâneos equivalentes. Escopo nesta tarefa: Faceta de unicidade no repositório e preservação da senha aceita; emissão e contrato HTTP serão concluídos na tarefa 3.
- [x] TI-12 — Expiração e logout revogável. Escopo nesta tarefa: Faceta de persistência de sessão e revogação; a autorização HTTP será concluída na tarefa 5.

## Evidências de conclusão

- Migration `20261004014334_authentication_persistence` aplicada ao banco isolado `dev_test_resolvvi_test_template`; alterações somente nas entidades de autenticação.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` aprovados no backend.
- Cobertura: 92,46% statements, 92,68% branches, 90,83% functions e 94,38% lines; 21 arquivos e 64 testes aprovados.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/protocols.ts`
- `backend/src/repositories/user-repository.ts`
- `backend/src/repositories/session-repository.ts`
- `backend/src/repositories/verification-repository.ts`
- `backend/src/services/password-service.ts`
- `backend/src/services/token-service.ts`
- `backend/src/schemas/`
- `backend/src/errors/`
- `backend/src/config/`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_2.md` e `tasks.md` para atualização de progresso ao concluir a implementação.
