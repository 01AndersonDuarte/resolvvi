# Tarefa 4.0: Confirmação de e-mail de uso único e controle de concorrência

## Visão geral

Entregar confirmação pública atômica e vinculada à conta correta, incluindo disputas entre consumo do link e reenvio.

**Dependências:** [3.0](./task_3.md)

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

- RF20 e RF21: confirmar em outro navegador sem sessão, somente por uso válido do link, sem autenticar automaticamente.
- RF21: recusar links adulterados, expirados, substituídos ou consumidos, preservando contas já confirmadas.
- RF22 e RF23: manter consistência entre confirmação, reenvio e resultado desconhecido da operação.
- RN7: estado de entrega do e-mail não substitui consumo válido do link.

</requirements>

## Subtarefas

- [x] 4.1 Expor POST /api/auth/verify-email com validação do segredo e resposta pública sem revelar destinatário.
- [x] 4.2 Implementar consumo e confirmação da conta na mesma transação, respeitando validade e estados do link.
- [x] 4.3 Integrar tratamento de conflitos e prazo restante nas disputas de confirmação simultânea e confirmação versus reenvio.
- [x] 4.4 Aplicar respostas de confirmação válida, link inválido e falha recuperável, sem criação de sessão ou cookie.
- [x] 4.5 Implementar testes de validade e concorrência com persistência real e executar as verificações do backend.

## Detalhes de implementação

Usar o [PRD](./prd.md) e a [TechSpec](./techspec.md) como fonte de verdade. Consultar as seções:

- Design de implementação → Principais interfaces: Emissão e confirmação atômicas; Link e frontend
- Design de implementação → Modelos de dados: ConfirmationInput e EmailVerification
- Design de implementação → Endpoints: POST /api/auth/verify-email

Dentro de `backend/`, executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Registrar evidências do incremento e manter checklists abertos até concluir as verificações. Nenhuma aprovação documental substitui esses resultados.

## Critérios de aceitação relacionados

A validação destes critérios é responsabilidade do QA; a tarefa fornece implementação e evidências no seu escopo:

- CA-24
- CA-25
- CA-26
- CA-27

## Testes da tarefa

IDs e nomes abaixo vêm da [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes). Quando um caso aparece em mais de uma tarefa, cada checklist se refere à faceta explicitada; preservar o mesmo ID na rastreabilidade e concluir o cenário completo na tarefa indicada. Implementar testes de comportamento para todo código produzido no incremento, incluindo erros e fronteiras relevantes, sem antecipar dependências futuras.

### Testes de unidade (se aplicável)

- [x] TU-08 — Validade e estados do link. Escopo nesta tarefa: Todos os estados e fronteira de validade.

### Testes de integração (se aplicável)

- [x] TI-04 — Confirmação pública válida. Escopo nesta tarefa: Confirmação válida de uma única conta, sem sessão.
- [x] TI-05 — Links inválidos e consumo concorrente. Escopo nesta tarefa: Links inválidos e exatamente um sucesso sob consumo concorrente.
- [x] TI-07 — Disputa entre confirmação e reenvio. Escopo nesta tarefa: Ordenação consistente de confirmação versus reenvio.

### Testes E2E (se aplicável)

Não aplicável como entrega desta tarefa; as jornadas completas estão atribuídas à [tarefa 10](./task_10.md).

## Arquivos relevantes

- `backend/src/routers/auth-router.ts`
- `backend/src/controllers/verification-controller.ts`
- `backend/src/services/auth-service.ts`
- `backend/src/repositories/auth-repository.ts`
- `backend/src/types/auth.ts`
- `backend/src/schemas/`
- `backend/src/errors/`
- Testes `*.test.ts`/`*.test.tsx` adjacentes aos módulos implementados, quando aplicável.
- `tasks/prd-autenticacao-consulta-cnj/task_4.md` e `tasks.md` para atualização de progresso ao concluir a implementação.
