# Tarefa 5.0: Implementar a leitura segura do CSV

## Visão geral

Entregar snapshot identificado e leitura sequencial do CSV, mantendo valores e posições da fonte. O adaptador distingue registros recuperáveis de estrutura irrecuperável e valida toda a codificação antes do processamento.

**Dependências:** [1.0](./task_1.md), [2.0](./task_2.md).
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

Usar I/O assíncrono e backpressure; não criar parser artesanal ou dividir o arquivo por linhas. Não colocar raw, conteúdo ou caminhos privados em logs. Não criar limite de negócio a partir do maior campo observado no corpus. Preservar o CSV original.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF3, RF5, RF9, RF10, RF11, RF15, RF17. Requisitos não funcionais relacionados: RNF2, RNF3, RNF4, RNF6.

- Copiar a fonte por streaming para snapshot privado, calcular o hash dos bytes consumidos e recusar UTF-8 inválido ou alteração detectada da fonte.
- Usar csv-parse conforme o contrato fixo, preservando valores, aspas, vírgulas e quebras de linha.
- Validar cabeçalho exato com ordem variável e localizar registro lógico/linha física, inclusive chunks e EOF.
- Distinguir linhas físicas vazias, registros vazios, quantidade de campos recuperável e aspas irrecuperáveis; não adivinhar fronteiras.

</requirements>

## Subtarefas

- [ ] 5.1 Implementar preparação de fonte regular, snapshot restrito, hash, detecção de alteração e erros de leitura.
- [ ] 5.2 Implementar decodificação UTF-8 fatal com BOM inicial e flush de EOF.
- [ ] 5.3 Implementar schema de cabeçalho e mapa de colunas com nomes exatos.
- [ ] 5.4 Integrar csv-parse com streaming/backpressure, preservação dos campos e posições físicas/lógicas.
- [ ] 5.5 Conectar estrutura de registro à validação pura, emitindo somente FIELD_COUNT quando não for seguro mapear colunas.
- [ ] 5.6 Implementar as variantes de adaptadores de TI-01 a TI-06 e TI-17; documentar a complementação de persistência/relatório na tarefa 7.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Modelos de dados → PreparedSource, SourcePosition e CsvRecord**, **Mapeamento CSV → contrato**, **Parâmetros fixos na origem e configuração** e **Abordagem de testes → Testes de integração**. A integração com gravações confirmadas fica na tarefa 7, conforme as dependências aprovadas; esta tarefa não requer o banco.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

- CA-06
- CA-12
- CA-14
- CA-15
- CA-16
- CA-17
- CA-19

## Testes da tarefa

IDs e nomes abaixo reproduzem o inventário da [TechSpec](./techspec.md#abordagem-de-testes), que define resultados esperados e variantes. Cada família deve ser desdobrada em testes independentes. Uma etapa parcial só comprova o recorte indicado; a família completa permanece pendente até a tarefa de conclusão registrada em [tasks.md](./tasks.md#rastreabilidade-dos-testes).

### Testes de unidade (se aplicável)

Não há novos casos desta camada nesta tarefa.

### Testes de integração (se aplicável)

- [ ] TI-01 — Cabeçalho e BOM
  - Parcial: BOM e cabeçalho reordenado/ausente/extra/repetido; zero domínio gravado será comprovado na tarefa 7.
- [ ] TI-02 — UTF-8 estrito e chunks
  - Etapa do adaptador: multibyte dividido, bytes inválidos e EOF incompleto; a ausência de gravações antes de validar UTF-8 será comprovada na tarefa 7.
- [ ] TI-03 — CSV com aspas, vírgulas e multilinha
  - Completo: valores idênticos e posições físicas corretas com aspas, vírgulas e multilinha em LF/CRLF, chunks e EOF.
- [ ] TI-04 — Linhas vazias versus registro vazio
  - Parcial: contagem de linhas ignoradas, rejeição de oito campos vazios e preservação de espaços; contadores finais na tarefa 7.
- [ ] TI-05 — Quantidade incorreta de campos
  - Parcial: FIELD_COUNT e continuidade na leitura; importação do próximo registro válido na tarefa 7.
- [ ] TI-06 — Aspas irrecuperáveis interrompem
  - Parcial: interrupção sem inferência de fronteiras; preservação dos commits anteriores na tarefa 7.
- [ ] TI-17 — Fonte inacessível, mutável ou interrompida
  - Parcial: fonte inacessível, mutável ou interrompida e snapshot/hash; diagnóstico durável mesmo sem banco na tarefa 7.

### Testes E2E (se aplicável)

Não há novos casos desta camada nesta tarefa; os E2E são implementados na tarefa 8.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Registrar comandos e resultados; não marcar variantes dependentes de tarefas futuras como aprovadas. Os E2E completos serão executados na tarefa 8.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `backend/src/adapters/source-adapter.ts`
- `backend/src/adapters/csv-adapter.ts`
- `backend/src/schemas/csv-header-schema.ts`
- `backend/src/schemas/csv-record-schema.ts`
- `backend/src/protocols.ts`
- `backend/src/adapters/source-adapter*.test.ts`
- `backend/src/adapters/csv-adapter*.test.ts`
- `lawsuits_movements.csv`
