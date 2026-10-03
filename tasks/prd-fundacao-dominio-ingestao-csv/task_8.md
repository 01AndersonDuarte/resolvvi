# Tarefa 8.0: Validar a operação completa e documentar

## Visão geral

Entregar evidências automatizadas do comando compilado para corpus, diagnósticos e recuperação após morte abrupta, além da documentação operacional final. Esta tarefa conclui a verificação do escopo implementado nas entregas anteriores.

**Dependências:** [7.0](./task_7.md).
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

Playwright configura-se em backend/ e specs ficam em e2e/ na raiz. Não substituir testes menores por E2E ou excluir código difícil da cobertura. Medir todo src autoral; excluir somente testes, declarações sem execução e cliente gerado. A validação final dos CA é responsabilidade do QA.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF1, RF2, RF3, RF4, RF5, RF6, RF7, RF8, RF9, RF10, RF11, RF12, RF13, RF14, RF15, RF16, RF17, RF18. Requisitos não funcionais relacionados: RNF1, RNF2, RNF3, RNF4, RNF5, RNF6.

- Executar o corpus original identificado por SHA, comparar todos os campos e obter 100 processos, 5.568 movimentações e zero rejeições em base vazia.
- Repetir a carga com zero criações e 5.568 duplicados, preservando dados, origem e ordem; conferir igualdade final após recuperação.
- Executar poucos E2E de CLI com Playwright e processo filho, banco e diretórios isolados, sem navegador e sem serviços externos.
- Registrar evidências de validação, cobertura, duração e ambiente, sem inventar SLA nem omitir cenários críticos.
- Documentar comandos, CSV, resultados, relatórios e recuperação, atualizando as passagens desatualizadas do AGENTS.md.

</requirements>

## Subtarefas

- [ ] 8.1 Implementar fixtures E2E para comando compilado, diretório temporário e PostgreSQL isolado, com rede externa bloqueada.
- [ ] 8.2 Implementar E2E-01 com hash, comparação dos campos do corpus, primeira carga e repetição, incluindo origem e ordenação.
- [ ] 8.3 Implementar E2E-02 com arquivo misto, rejeições, falha estrutural e coerência entre saída, relatório e banco.
- [ ] 8.4 Implementar E2E-03 com barreira após commit e antes da confirmação local, SIGKILL e recuperação seguida de carga completa.
- [ ] 8.5 Executar todas as validações previstas na TechSpec, conferir quatro métricas de cobertura e corrigir falhas ou lacunas relevantes.
- [ ] 8.6 Registrar evidências de corpus, reprodutibilidade de datas, recuperação, ambiente e duração em documento sem dados sensíveis.
- [ ] 8.7 Concluir README operacional e atualizar AGENTS.md para refletir os aplicativos e comandos efetivamente existentes.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Abordagem de testes → Testes E2E**, **Sequenciamento do desenvolvimento**, **Pontos de integração**, **Monitoramento e observabilidade** e a **Definição de pronto** do PRD. O corpus original permanece inalterado. Evidências de datas devem cobrir UTC e America/Fortaleza; E2E-03 usa barreira explícita, nunca timing aproximado.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

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

## Testes da tarefa

IDs e nomes abaixo reproduzem o inventário da [TechSpec](./techspec.md#abordagem-de-testes), que define resultados esperados e variantes. Cada família deve ser desdobrada em testes independentes. Uma etapa parcial só comprova o recorte indicado; a família completa permanece pendente até a tarefa de conclusão registrada em [tasks.md](./tasks.md#rastreabilidade-dos-testes).

### Testes de unidade (se aplicável)

Não há novos casos desta camada nesta tarefa.

### Testes de integração (se aplicável)

Não há novos casos desta camada nesta tarefa.

### Testes E2E (se aplicável)

- [ ] E2E-01 — Corpus completo e repetição pelo comando compilado
  - Completo: comparar cada registro aceito, datas, textos, origens e ordenação, além de SHA e contagens nas duas cargas.
- [ ] E2E-02 — Arquivo misto e diagnóstico operacional
  - Completo: variantes de arquivo misto, rejeições recuperáveis, estrutura irrecuperável, vazio e apenas inválidos conforme a TechSpec.
- [ ] E2E-03 — Morte após commit e carga completa recuperada
  - Completo: morte sincronizada após commit, tentativa anterior interrompida, recuperação sem duplicação e domínio final igual ao baseline.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Executar também `npm run test:e2e` sobre o build e registrar resultados e evidências finais.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `e2e/import-corpus.spec.ts`
- `e2e/import-diagnostics.spec.ts`
- `e2e/import-recovery.spec.ts`
- `backend/playwright.config.ts`
- `backend/vitest.config.ts`
- `backend/README.md`
- `backend/.env.development.example`
- `backend/.env.test.example`
- `AGENTS.md`
- `tasks/prd-fundacao-dominio-ingestao-csv/validation-evidence.md`
- `lawsuits_movements.csv`
