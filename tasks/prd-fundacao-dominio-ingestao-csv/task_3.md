# Tarefa 3.0: Criar persistência e controle de sessão

## Visão geral

Entregar schema, migrations e acesso à persistência, com exclusão de importações na mesma base e verificação da identidade da sessão. A estabilidade da sessão Prisma é comprovada antes de integrar o fluxo de gravação de domínio.

**Dependências:** [1.0](./task_1.md).
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

Prisma fica somente nos repositories; cada transação usa seu contexto sem cliente global ou transação aninhada. Migrations são geradas, sem edição manual do SQL. Bases isoladas por worker são necessárias porque schemas separados não isolam o advisory lock. Preservar a durabilidade do PostgreSQL.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF1, RF2, RF6, RF7, RF12, RF14, RF17, RF18. Requisitos não funcionais relacionados: RNF1, RNF4, RNF6.

- Modelar Lawsuit, Movement, ImportRun e RecordResult com vínculos, índices, precisão e representações previstas na TechSpec.
- Gerar migrations pelo Prisma e comprovar aplicação em base vazia; preparar geração do cliente no typecheck/build.
- Implementar repositórios e unidade de trabalho via Prisma, com conexão única, advisory lock por base e verificação de PID/backend_start antes de escrita.
- Recusar sessão substituída e liberar a exclusão após encerramento; não readquirir silenciosamente o lock para a tentativa antiga.

</requirements>

## Subtarefas

- [ ] 3.1 Definir schema e prisma.config.ts, gerar migrations e cliente e validar o ciclo de preparação em base vazia.
- [ ] 3.2 Implementar conversão de bytes/textos e números exatos nos repositórios com testes de persistência.
- [ ] 3.3 Implementar repositórios de processos, movimentações, tentativas e resultados e consulta cronológica interna.
- [ ] 3.4 Implementar aquisição/liberação do lock, identificação da sessão e unidade transacional curta.
- [ ] 3.5 Comprovar bloqueio entre processos e proteção contra substituição da conexão com PostgreSQL real.
- [ ] 3.6 Concluir TI-07, TI-14 e TI-15 no nível de persistência e preparar fixtures para a integração transacional da tarefa 4.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Principais interfaces → Exclusão e sessão e Atomicidade**, **Modelos de dados → Lawsuit, Movement, ImportRun e RecordResult**, **Pontos de integração** e **Riscos conhecidos**. TI-15 é condição de aceite desta entrega; não remover a verificação de sessão para contornar comportamento do adapter.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

- CA-01
- CA-02
- CA-04
- CA-05
- CA-06
- CA-13
- CA-18
- CA-20
- CA-21

## Testes da tarefa

IDs e nomes abaixo reproduzem o inventário da [TechSpec](./techspec.md#abordagem-de-testes), que define resultados esperados e variantes. Cada família deve ser desdobrada em testes independentes. Uma etapa parcial só comprova o recorte indicado; a família completa permanece pendente até a tarefa de conclusão registrada em [tasks.md](./tasks.md#rastreabilidade-dos-testes).

### Testes de unidade (se aplicável)

Não há novos casos desta camada nesta tarefa.

### Testes de integração (se aplicável)

- [ ] TI-07 — Persistência exata e vínculos
  - Completo nesta tarefa: unicidade, FKs, datas, precisão de números enormes e bytes originais, inclusive NUL sintético, em PostgreSQL real.
- [ ] TI-14 — Exclusão entre processos e liberação
  - Completo na camada de sessão: processos/conexões independentes, recusa, término e morte; integração com o comando na tarefa 7.
- [ ] TI-15 — Perda e substituição da sessão Prisma
  - Completo na camada de sessão/unidade de trabalho: liberar entre queries, substituir conexão, impedir escrita antiga e exigir novo lock; integração com recuperação na tarefa 7.
- [ ] TI-19 — Configuração e isolamento das dependências
  - Parcial: migrations e cliente em base vazia; complementa o isolamento da tarefa 1 e será concluído com o importador na tarefa 7.

### Testes E2E (se aplicável)

Não há novos casos desta camada nesta tarefa; os E2E são implementados na tarefa 8.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Registrar comandos e resultados; não marcar variantes dependentes de tarefas futuras como aprovadas. Os E2E completos serão executados na tarefa 8.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/prisma.config.ts`
- `backend/src/generated/prisma/`
- `backend/src/config/database.connection.ts`
- `backend/src/repositories/import-session-repository.ts`
- `backend/src/repositories/unit-of-work-repository.ts`
- `backend/src/repositories/lawsuit-repository.ts`
- `backend/src/repositories/movement-repository.ts`
- `backend/src/repositories/import-run-repository.ts`
- `backend/src/repositories/record-result-repository.ts`
- `backend/src/repositories/*.test.ts`
- `backend/package.json`
