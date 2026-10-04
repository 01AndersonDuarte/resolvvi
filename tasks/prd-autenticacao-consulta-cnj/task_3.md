# Tarefa 3.0: Cadastro e reenvio pelo Resend com limites e recuperação

## Visão geral

Entregar cadastro público e reenvio pela API, com conta pendente preservada, reservas de envio concorrentes e falhas do provedor classificadas para recuperação.

**Dependências:** [2.0](./task_2.md)

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

- RF18–RF20: cadastrar somente e-mail/senha, preservar conta existente, solicitar confirmação sem abrir sessão.
- RF22: compartilhar os limites de emissão entre cadastro inicial, cadastro repetido e reenvio.
- RF23 e RF15: distinguir falha de persistência, rejeição do envio e resultado desconhecido; preservar conta e recuperação.
- RN7 e RN8: aceite do provedor nunca confirma conta; repetição não altera senha.

</requirements>

## Subtarefas

- [x] 3.1 Expor POST /api/auth/register e POST /api/auth/resend-verification com schemas, controllers e serviços.
- [x] 3.2 Integrar criação/releitura de conta única e respostas neutras para repetição e destinatários sem confirmação pendente.
- [x] 3.3 Implementar reserva transacional, limites móveis, substituição dos links e Retry-After sob concorrência.
- [x] 3.4 Criar conteúdo de confirmação em HTML/texto e adaptador Resend com prazo e chave de idempotência por emissão.
- [x] 3.5 Tratar rejeição, timeout e queda após reserva sem desfazer a conta; preparar o provedor simulado para automação.
- [x] 3.6 Implementar testes completos dos fluxos e concorrência, incluindo as facetas iniciadas na tarefa 2; executar as verificações do backend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Design de implementação → Principais interfaces: Cadastro e concorrência; Emissão e confirmação atômicas
- Design de implementação → Modelos de dados: MessageResponse, EmailVerification, VerificationEmailInput, DeliveryResult e mapeamento Resend
- Design de implementação → Endpoints: POST /api/auth/register e POST /api/auth/resend-verification
- Pontos de integração

Dentro de `backend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-12
- CA-19
- CA-20
- CA-21
- CA-22
- CA-26
- CA-27
- CA-28

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [x] TU-07 — Limites móveis de emissão. Escopo nesta tarefa: Limites e cálculo de espera.
- [x] TU-09 — Conteúdo de confirmação. Escopo nesta tarefa: Conteúdo seguro e origem correta.
- [x] TU-10 — Classificação do resultado Resend. Escopo nesta tarefa: Aceite, rejeição e resultado desconhecido.

### Testes de integração (se aplicável)

- [x] TI-01 — Cadastro persistido e envio inicial. Escopo nesta tarefa: Cadastro e emissão inicial completos.
- [x] TI-02 — Cadastro inválido por HTTP. Escopo nesta tarefa: Validação HTTP sem efeitos indevidos.
- [x] TI-03 — Cadastros simultâneos equivalentes. Escopo nesta tarefa: Completar o cenário de cadastros simultâneos com emissão única e senha original.
- [x] TI-06 — Reenvio concorrente e janela móvel. Escopo nesta tarefa: Limites persistentes, concorrência e fronteiras da janela.
- [x] TI-08 — Rejeição, timeout e queda após reserva. Escopo nesta tarefa: Conta e reserva preservadas após falhas e queda.
- [x] TI-09 — Reenvio inexistente/confirmado. Escopo nesta tarefa: Neutralidade e ausência de criação/envio quando inaplicável.
- [x] TI-16 — Falhas de dependências e prazos HTTP. Escopo nesta tarefa: Faceta de cadastro/reenvio, prazos e falhas de persistência/provedor.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Evidências de conclusão

- `npm run lint`, `npm run typecheck` e `npm run build` aprovados no backend.
- `npm test` e `npm run test:coverage` aprovados: 32 arquivos e 108 testes; cobertura de 92,2% statements, 86,28% branches, 92,5% functions e 94,88% lines.
- Testes de integração executados no banco isolado `dev_test_resolvvi_test_template`; cadastro aceito, concorrência, limites móveis, rejeição e timeout verificados com provedor simulado.
- Nenhum servidor ou serviço foi iniciado durante esta tarefa. O aceite real do Resend permanece na tarefa 10.

## Arquivos relevantes

- `backend/src/routers/auth-router.ts`
- `backend/src/controllers/auth-controller.ts`
- `backend/src/services/auth-service.ts`
- `backend/src/services/resend-service.ts`
- `backend/src/services/verification-email.ts`
- `backend/src/repositories/user-repository.ts`
- `backend/src/repositories/verification-repository.ts`
- `backend/src/schemas/`
- `backend/src/errors/`
- `backend/src/app.ts`
- `backend/README.md`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_3.md` e `tasks.md` para atualização de progresso ao concluir a implementação.
