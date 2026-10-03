# Tarefa 6.0: Implementar diário e relatórios persistentes

## Visão geral

Entregar rastros locais duráveis e relatórios versionados a partir dos resultados confirmados. A camada de relatório deve funcionar também para tentativas que só existem localmente, sem expor conteúdo processual ou segredos.

**Dependências:** [3.0](./task_3.md), [4.0](./task_4.md).
**Estado:** pendente; este documento planeja a implementação e não registra testes executados.

<skills>

### Conformidade com skills

- Aplicar [executar-task](../../.agents/skills/executar-task/SKILL.md) ao implementar esta entrega.
- [criar-tasks](../../.agents/skills/criar-tasks/SKILL.md) rege a decomposição documental atual.
- [executar-review](../../.agents/skills/executar-review/SKILL.md) e [executar-qa](../../.agents/skills/executar-qa/SKILL.md) são referências para as etapas posteriores quando solicitadas; sua execução não é implícita nesta tarefa.
- Não há frontend nesta entrega; nenhuma skill React ou de interface se aplica.

</skills>

<rules>

### Conformidade com o AGENTS.md e as rules

Leitura realizada de [AGENTS.md](../../AGENTS.md) e de todas as rules: [code-standards.md](../../.agents/rules/code-standards.md), [javascript-typescript.md](../../.agents/rules/javascript-typescript.md), [node.md](../../.agents/rules/node.md), [folder-structure.md](../../.agents/rules/folder-structure.md), [tests.md](../../.agents/rules/tests.md), [commit_guidelines.md](../../.agents/rules/commit_guidelines.md). O caminho efetivo das regras de testes é `.agents/rules/tests.md`; a referência a `./agents/rules/tests.md` no trecho crítico do AGENTS está desatualizada.

Respeitar arquivos `.ts` de até 100 linhas, funções de até 30 linhas, até três parâmetros, guard clauses, nomes claros e comentários apenas indispensáveis. Manter dependências entre camadas sem ciclos, imports internos específicos e exports por `index.ts`. Usar Vitest, FIRST, asserts comportamentais e cobertura mínima de 80% nas quatro métricas. Se houver commit posterior, seguir Conventional Commits em inglês, somente título e autoria registrada.

Logging permanece no adaptador central. Contadores não podem perder precisão ao serializar JSON. Testes usam diretórios isolados e relógio controlado; publicação deve preservar revisões anteriores em falha. Não introduzir limpeza automática de relatórios.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF12, RF15, RF16, RF17, RF18. Requisitos não funcionais relacionados: RNF1, RNF4, RNF5, RNF6.

- Criar identificação e evento inicial sincronizado antes de depender do banco; preservar tentativa local e contingência em falha de armazenamento.
- Publicar relatórios em revisões novas de forma durável, sem sobrescrever tentativas ou revisões anteriores.
- Projetar totais exclusivamente a partir de resultados confirmados, mantendo posição incerta fora da soma e desconhecido como null.
- Produzir diagnósticos em português por posição/campo/categoria e somente CNJ validado; não serializar erros brutos ou textos processuais.

</requirements>

## Subtarefas

- [ ] 6.1 Implementar criação exclusiva do diretório da tentativa e diário sincronizado com contratos de evento.
- [ ] 6.2 Implementar leitura de diário que reconheça última linha truncada sem promovê-la a confirmação.
- [ ] 6.3 Implementar projeção do relatório e totais a partir do ledger e dos fatos locais conhecidos.
- [ ] 6.4 Implementar publicação por streaming, sincronização e rename em novas revisões, preservando anteriores.
- [ ] 6.5 Implementar contingência persistente e diagnóstico mínimo quando nenhum armazenamento for gravável.
- [ ] 6.6 Executar TU-12, TU-13 e a etapa de TI-16 referente a diário/publicação; deixar explícita a integração com recuperação da tarefa 7.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Modelos de dados → ImportRun, ImportTotals, Diagnostic, ImportReport e JournalEvent**, **Pontos de integração → Recuperação detalhada** e **Monitoramento e observabilidade**. Aqui ficam adaptadores e projeções; aquisição de lock para reconciliar e alteração do estado de tentativas abandonadas entram na tarefa 7.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

- CA-17
- CA-19
- CA-20
- CA-21

## Testes da tarefa

IDs e nomes abaixo reproduzem o inventário da [TechSpec](./techspec.md#abordagem-de-testes), que define resultados esperados e variantes. Cada família deve ser desdobrada em testes independentes. Uma etapa parcial só comprova o recorte indicado; a família completa permanece pendente até a tarefa de conclusão registrada em [tasks.md](./tasks.md#rastreabilidade-dos-testes).

### Testes de unidade (se aplicável)

- [ ] TU-12 — Reconciliação e resultado operacional
  - Etapa de projeção: equações, null para desconhecido, posição pendente e resultado/código; a recuperação integrada completa a família na tarefa 7.
- [ ] TU-13 — Sanitização de logs e erros
  - Etapa de relatórios: sanitização de diagnósticos, metadados e erros de I/O; todas as bordas serão verificadas na tarefa 7.

### Testes de integração (se aplicável)

- [ ] TI-16 — Diário truncado e publicação de relatório falha
  - Parcial: diário truncado, publicação falha, reconstrução da projeção a partir do ledger e revisão anterior intacta. Reconciliação de estado sob lock na tarefa 7.

### Testes E2E (se aplicável)

Não há novos casos desta camada nesta tarefa; os E2E são implementados na tarefa 8.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Registrar comandos e resultados; não marcar variantes dependentes de tarefas futuras como aprovadas. Os E2E completos serão executados na tarefa 8.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `backend/src/adapters/journal-adapter.ts`
- `backend/src/services/report-service.ts`
- `backend/src/repositories/import-run-repository.ts`
- `backend/src/repositories/record-result-repository.ts`
- `backend/src/config/logger.ts`
- `backend/src/protocols.ts`
- `backend/src/adapters/journal-adapter*.test.ts`
- `backend/src/services/report-service*.test.ts`
