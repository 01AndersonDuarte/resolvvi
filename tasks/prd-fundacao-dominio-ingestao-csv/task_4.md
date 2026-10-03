# Tarefa 4.0: Implementar o processamento transacional

## Visão geral

Entregar o processamento de um registro com classificação confirmada no banco. Validação, conflito, duplicidade e criação respeitam uma única unidade de confirmação, preservando a primeira origem e a ordem de aceitação.

**Dependências:** [2.0](./task_2.md), [3.0](./task_3.md).
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

Serviços decidem regras e repositórios acessam o banco. Exceções desfazem a unidade; rejeições esperadas são resultados tipados. Usar restrições reais ou hooks restritos ao ambiente de teste para falhas; nenhuma flag de produção deve provocar falhas arbitrárias.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF1, RF2, RF3, RF6, RF7, RF8, RF11, RF12, RF13, RF17, RF18. Requisitos não funcionais relacionados: RNF1, RNF2, RNF6.

- Confirmar processo, movimentação e resultado importado na mesma transação; registrar duplicados/rejeitados no ledger sem alterar domínio.
- Comparar metadados antes de deduplicar e preservar primeiro processo, ID e origem aceitos.
- Usar o hash apenas para encontrar candidatos; comparar identidade completa e alocar slots distintos em colisões.
- Preservar commits anteriores em falhas, não repetir automaticamente commit incerto e impedir processo novo sem primeira movimentação.

</requirements>

## Subtarefas

- [ ] 4.1 Integrar validação e repositórios no record-service, recebendo contexto transacional e posição da fonte.
- [ ] 4.2 Implementar o caminho de rejeição sem persistência de domínio e com todos os diagnósticos independentes.
- [ ] 4.3 Implementar verificação de conflitos antes da consulta de duplicidade.
- [ ] 4.4 Implementar identidade completa, slots de colisão e persistência atômica de processo/movimentação/ledger.
- [ ] 4.5 Preservar primeira origem, empate cronológico e classificações entre tentativas.
- [ ] 4.6 Executar TI-08 a TI-12 com PostgreSQL real e falhas controladas, sem mocks de atomicidade ou unicidade.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Principais interfaces → Atomicidade e Identidade e colisões**, **Modelos de dados → RecordResult, Movement e ImportTotals** e **Abordagem de testes → Testes de integração**. O serviço processa registros já decodificados; o encadeamento do parser e o diário anterior/posterior ao commit são responsabilidade da tarefa 7.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

- CA-07
- CA-08
- CA-09
- CA-10
- CA-11
- CA-12
- CA-13
- CA-14

## Testes da tarefa

IDs e nomes abaixo reproduzem o inventário da [TechSpec](./techspec.md#abordagem-de-testes), que define resultados esperados e variantes. Cada família deve ser desdobrada em testes independentes. Uma etapa parcial só comprova o recorte indicado; a família completa permanece pendente até a tarefa de conclusão registrada em [tasks.md](./tasks.md#rastreabilidade-dos-testes).

### Testes de unidade (se aplicável)

Não há novos casos desta camada nesta tarefa.

### Testes de integração (se aplicável)

- [ ] TI-08 — Transação desfaz processo e primeira movimentação
  - Completo: falha real na gravação do filho desfaz processo e ledger; cobrir também primeira movimentação inválida, sem processo vazio.
- [ ] TI-09 — Duplicação no arquivo e entre arquivos
  - Etapa de serviço completa: registros de fontes/tentativas distintas deduplicam preservando ID e origem. A leitura de arquivos reais entra na tarefa 7.
- [ ] TI-10 — Hash coincidente com identidades distintas
  - Completo: hasher controlado força colisão; identidades distintas recebem slots e repetição reconhece cada identidade correta.
- [ ] TI-11 — Conflito impede movimento novo ou duplicado
  - Completo: conflito em movimento novo ou duplicado, primeira confirmação preservada e registro posterior compatível aceito.
- [ ] TI-12 — Cronologia em cargas reordenadas
  - Completo: cargas reordenadas preservam empates existentes e colocam novos eventos empatados depois dos existentes.

### Testes E2E (se aplicável)

Não há novos casos desta camada nesta tarefa; os E2E são implementados na tarefa 8.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Registrar comandos e resultados; não marcar variantes dependentes de tarefas futuras como aprovadas. Os E2E completos serão executados na tarefa 8.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `backend/src/services/record-service.ts`
- `backend/src/services/process-conflict-service.ts`
- `backend/src/services/movement-identity-service.ts`
- `backend/src/repositories/unit-of-work-repository.ts`
- `backend/src/repositories/lawsuit-repository.ts`
- `backend/src/repositories/movement-repository.ts`
- `backend/src/repositories/record-result-repository.ts`
- `backend/src/services/record-service*.test.ts`
- `backend/src/repositories/*.test.ts`
