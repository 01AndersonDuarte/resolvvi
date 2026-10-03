# Tarefa 2.0: Implementar as regras de domínio

## Visão geral

Entregar validadores e decisões puras para transformar um registro decodificado em dados canônicos ou diagnósticos acumulados. Nenhuma regra de domínio depende de banco, rede, locale ou relógio.

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

Aplicar funções pequenas, unknown nas entradas externas, const, comparações estritas e contratos nomeados. Testes CNJ usam valores de referência literais e mutações controladas, nunca expectativas produzidas pelo algoritmo testado. Não mockar normalização ou identidade.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF1, RF2, RF3, RF4, RF5, RF6, RF7, RF8, RF11. Requisitos não funcionais relacionados: RNF2, RNF3, RNF6.

- Validar e normalizar CNJ, datas civis, valores exatos e autores sem aproximação numérica ou correção automática.
- Preservar textos originais e gerar representações de comparação determinísticas; conteúdo ausente permanece válido.
- Validar campos independentes e produzir todos os diagnósticos aplicáveis, sem cascata a partir de campo ilegível ou inválido.
- Definir identidade com os quatro componentes, comparação de conflitos antes da duplicidade e projeção cronológica estável.

</requirements>

## Subtarefas

- [ ] 2.1 Definir contratos tipados de dados canônicos, validação e diagnósticos conforme os modelos da TechSpec.
- [ ] 2.2 Implementar CNJ, data civil e números exatos, cobrindo limites e formatos recusados.
- [ ] 2.3 Implementar preservação/normalização textual e obrigatoriedade dos campos.
- [ ] 2.4 Implementar validação agregada do registro e categorias de erros com mensagens em português.
- [ ] 2.5 Implementar identidade, comparação de metadados e ordenação por data/id sem alterar a entrada.
- [ ] 2.6 Implementar e executar todas as variantes das famílias TU-01 a TU-11, inclusive datas em UTC e America/Fortaleza.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Principais interfaces → Normalização**, **Identidade e colisões**, **Modelos de dados → ValidationResult, Lawsuit, Movement e Diagnostic** e **Abordagem de testes → Testes de unidade**. Nesta tarefa ficam as decisões puras; consulta de candidatos, slots de colisão e gravação são integrados na tarefa 4.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

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
- CA-19

## Testes da tarefa

IDs e nomes abaixo reproduzem o inventário da [TechSpec](./techspec.md#abordagem-de-testes), que define resultados esperados e variantes. Cada família deve ser desdobrada em testes independentes. Uma etapa parcial só comprova o recorte indicado; a família completa permanece pendente até a tarefa de conclusão registrada em [tasks.md](./tasks.md#rastreabilidade-dos-testes).

### Testes de unidade (se aplicável)

- [ ] TU-01 — CNJ mascarado e canônico preservam zeros
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-02 — CNJ inválido recebe categoria específica
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-03 — Calendário civil e bissextos
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-04 — Decimal exato sem limite de precisão arbitrário
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-05 — Quantidade de autores é inteiro positivo
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-06 — Normalização preserva diferenças reais
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-07 — Conteúdo ausente e obrigatoriedade
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-08 — Todos os erros independentes, sem cascata
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-09 — Identidade usa os quatro componentes
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-10 — Conflitos precedem duplicidade
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.
- [ ] TU-11 — Projeção cronológica e empate
  - Completo nesta tarefa: implementar variantes independentes com asserts de comportamento.

### Testes de integração (se aplicável)

Não há novos casos desta camada nesta tarefa.

### Testes E2E (se aplicável)

Não há novos casos desta camada nesta tarefa; os E2E são implementados na tarefa 8.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Registrar comandos e resultados; não marcar variantes dependentes de tarefas futuras como aprovadas. Os E2E completos serão executados na tarefa 8.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `backend/src/services/cnj-service.ts`
- `backend/src/services/civil-date-service.ts`
- `backend/src/services/exact-number-service.ts`
- `backend/src/services/text-normalization-service.ts`
- `backend/src/services/movement-identity-service.ts`
- `backend/src/services/process-conflict-service.ts`
- `backend/src/services/record-validation-service.ts`
- `backend/src/services/movement-order-service.ts`
- `backend/src/schemas/csv-record-schema.ts`
- `backend/src/errors/`
- `backend/src/protocols.ts`
- `backend/src/services/*.test.ts`
