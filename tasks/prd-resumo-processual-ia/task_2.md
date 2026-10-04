# Tarefa 2.0: Persistência, versionamento e concorrência

## Visão geral

Entregar modelos e operações de banco para fontes imutáveis, tentativas, resumos e votos. Provar as garantias transacionais com PostgreSQL isolado; a composição com executor e HTTP será concluída na tarefa 3.

**Dependências:** [1.0](./task_1.md). Banco de testes isolado e infraestrutura Prisma existentes.

<skills>
### Conformidade com skills

- [`executar-task`](../../.agents/skills/executar-task/SKILL.md): implementação do incremento e atualização dos checklists.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura realizada no planejamento: `AGENTS.md` e todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Revalidar instruções aplicáveis ao executar. A referência sem ponto `agents/rules/tests.md` não existe; usar `.agents/rules/tests.md`.

Preservar aplicativos e dependências separados, módulos ES, funções nomeadas, `unknown` nas fronteiras, organização por recurso/camada e imports sem ciclos. Respeitar 300 linhas por arquivo TS/TSX, 30 por função e 100 por classe; não desabilitar limites nem comprimir código. Banco apenas em repositories, configuração validada em `config/`, logs pelo adaptador existente e segredos fora do repositório. Migrations geradas pelo Prisma, sem edição manual.

Testes Vitest adjacentes, FIRST/AAA, assertions de comportamento e efeitos persistidos; Playwright em `e2e/`. Usar banco isolado e controlar relógio/transporte, sem sleeps arbitrários ou chamadas cobradas nas suítes comuns. Executar lint, typecheck, testes, cobertura e build nos aplicativos afetados, com mínimo de 80% em linhas, funções, branches e statements. Os scripts atuais prevalecem sobre as observações antigas do AGENTS sobre ausência de testes/lint.

Após cada incremento coeso validado, revisar o diff, selecionar arquivos explicitamente e criar commit local conforme Conventional Commits em inglês, incluindo checklists; preservar alterações alheias e staging prévio. Push exige autorização separada. Os cortes aprovados alteram o escopo funcional/técnico documentado, sem dispensar as regras do projeto.
</rules>

<requirements>

**Requisitos relacionados:** RF4, RF8, RF13, RF14, RF15, RF16, RF18, RF20, RF21, RF22, RF24, RF25, RF26.

- Persistir as cinco entidades, relações Restrict, unicidades e índices definidos na TechSpec; gerar migration pelo Prisma sem editar SQL manualmente.
- Preservar snapshots mesmo após remoção de movimentos, revisões crescentes, versões imutáveis e votos vinculados à versão original. Fonte revertida observada não reativa resumo substituído.
- Usar a ordem de locks, limites de transação e revalidação da fonte definidos na TechSpec, inclusive contra escrita direta em Movement. Nenhuma chamada externa dentro de transação.
- Garantir reserva única por chave, marcação condicional de despacho, cooldown durável, publicação atômica e voto único por usuário/resumo. Limite de capacidade global entre instâncias fica fora deste incremento.
- Permitir reconciliação de commit incerto por leitura e interpretação de tentativa vencida como timeout, sem presumir nova geração.
</requirements>

## Subtarefas

- [ ] 2.1 Adicionar entidades e constraints ao schema, gerar migration e validar aplicação em banco isolado sem alterar os textos processuais existentes.
- [ ] 2.2 Implementar leitura integral em lotes e transações de observação da fonte, revisão e leitura de resumo atual; preservar ordenação pública do histórico.
- [ ] 2.3 Implementar reserva, número de tentativa, cooldown, despacho condicional e transições terminais com prazo persistido.
- [ ] 2.4 Implementar publicação atômica de resumo/evidências e consultas para reconciliação após falha de confirmação.
- [ ] 2.5 Implementar gravação serializada de feedback, idempotência, timestamps e preservação de votos antigos.
- [ ] 2.6 Provar concorrência, invalidação, integridade e rollback com conexões reais e barreiras controladas; executar os gates do backend.

## Detalhes de implementação

Usar [techspec.md](./techspec.md) como fonte de verdade, especialmente:

- Arquitetura do sistema → Coordenação e consistência e orçamento de tempo.
- Design de implementação → Modelos de dados → SummarySourceState, SummaryGenerationSlot, SummaryAttempt, ProcessAiSummary e SummaryFeedbackRecord.
- Pontos de integração (transações curtas).
- Abordagem de testes → Testes de integração.

Aplicar o escopo simplificado aprovado: sem comprovante HMAC, localização automática de referência ou capacidade global entre instâncias. Manter fonte integral, evidências imutáveis, deduplicação persistida, deadline, autenticação, votos e testes.

## Critérios de aceitação relacionados

Critérios do [PRD](./prd.md); a validação de aceitação é responsabilidade do QA:

- CA-05
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
- CA-23

## Testes da tarefa

Nesta tarefa, TI-03/04/05/07/08/09/13/14 exercitam as garantias dos repositories. A tarefa 3 completa os mesmos casos com services, provedor, sessão e executor: número de chamadas, reinício do serviço, commit incerto e shutdown. TI-14 exige duas conexões, SQL direto e inserção concorrente; TI-07 inclui rollback e perda de confirmação após commit. Não considerar o caso completo sem o complemento indicado.

### Testes de integração

- [ ] TI-03 — Concorrência em dois services/clientes compartilha tentativa
- [ ] TI-04 — Mudança de cada campo da fonte invalida leitura e publicação
- [ ] TI-05 — Reinício preserva resumo e expira tentativa sem reenvio
- [ ] TI-07 — Falha/commit incerto da persistência não publica sucesso aparente
- [ ] TI-08 — Voto repetido, trocado e concorrente mantém uma linha
- [ ] TI-09 — Nova versão preserva voto antigo e snapshot após remoção
- [ ] TI-13 — Fonte revertida e regras alteradas geram nova identidade
- [ ] TI-14 — Locks incluem escrita direta e encerramento interrompe operações

## Arquivos relevantes

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/repositories/process-ai-summary-repository.ts`
- `backend/src/repositories/summary-attempt-repository.ts`
- `backend/src/repositories/summary-feedback-repository.ts`
- `backend/src/repositories/movement-repository.ts`
- `backend/src/config/database-client.ts`
- `backend/src/types/process-ai-summary.ts`
- Testes adjacentes dos módulos novos/alterados e reexports explícitos dos barrels necessários, conforme “Visão dos componentes” da TechSpec.
