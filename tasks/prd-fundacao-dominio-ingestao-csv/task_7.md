# Tarefa 7.0: Integrar os comandos de importação e recuperação

## Visão geral

Entregar os comandos operacionais completos, integrando fonte, exclusão, processamento, diário e relatórios. A execução deve recuperar fatos confirmados após falha e permitir reimportação integral sem duplicação.

**Dependências:** [4.0](./task_4.md), [5.0](./task_5.md), [6.0](./task_6.md).
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

CLI substitui router/controller como borda e converte erros em diagnóstico/saída; não criar HTTP. Não iniciar nova unidade após sinal ou falha fatal. Integração usa PostgreSQL real, bases independentes e barreiras/eventos; hooks de falha ficam restritos ao teste.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF1, RF2, RF3, RF4, RF5, RF6, RF7, RF8, RF9, RF10, RF11, RF12, RF13, RF14, RF15, RF16, RF17, RF18. Requisitos não funcionais relacionados: RNF1, RNF2, RNF3, RNF4, RNF5, RNF6.

- Implementar CLI de importação/recuperação, ajuda, validação de argumentos e códigos de saída conforme o contrato operacional.
- Sincronizar início antes de conectar, adquirir exclusão antes de registrar no banco/reconciliar e validar snapshot/cabeçalho antes de gravar domínio.
- Registrar posição em tentativa antes da unidade e confirmação local após commit; falhas de relatório interrompem antes da próxima unidade.
- Reconciliar ledger sob lock, preservar estado terminal persistido e reconhecer tentativa abandonada sem inventar horário de término.
- Tratar sinais e erros não capturados com encerramento idempotente, preservando unidade corrente, confirmações anteriores e incerteza quando necessário.

</requirements>

## Subtarefas

- [ ] 7.1 Implementar schemas de opções, entradas CLI, --help e comandos npm de desenvolvimento e build.
- [ ] 7.2 Compor import-service na ordem operacional da TechSpec, incluindo diário antes do banco e reconciliação automática.
- [ ] 7.3 Integrar snapshot/parser ao record-service, contabilizando linhas ignoradas e continuidade somente após rejeições recuperáveis.
- [ ] 7.4 Implementar recovery-service e recover-import para reconciliação explícita e automática sob exclusão.
- [ ] 7.5 Implementar shutdown idempotente, fechamento de recursos e códigos de saída observados, sem prometer relatório final para SIGKILL.
- [ ] 7.6 Completar os casos de integração iniciados nas tarefas anteriores e testar falhas antes, durante e depois do commit com sincronização explícita.
- [ ] 7.7 Validar importação sem HTTP externo, diagnóstico mesmo sem banco e scripts do comando compilado em preparação aos E2E.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Arquitetura do sistema → Sequência operacional**, **Principais interfaces → Contrato operacional, Exclusão e sessão e Atomicidade**, **Pontos de integração → Recuperação detalhada**, **Monitoramento e observabilidade** e **Abordagem de testes**. Respeitar diferenças entre estado terminal já confirmado e tentativa abandonada, commit incerto e unidade comprovadamente não confirmada.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

- CA-06
- CA-07
- CA-08
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

- [ ] TU-12 — Reconciliação e resultado operacional
  - Completar: resultados, códigos, reconciliação e estados desconhecidos no fluxo integrado.
- [ ] TU-13 — Sanitização de logs e erros
  - Completar: saída, logs e erros das bordas CSV, banco, CLI e recuperação sem dados sensíveis.
- [ ] TU-14 — Configuração, argumentos e shutdown
  - Completar: argumentos, ajuda sem tentativa, falhas antes de escrita e shutdown idempotente sem nova unidade após sinal.

### Testes de integração (se aplicável)

- [ ] TI-01 — Cabeçalho e BOM
  - Completar: cabeçalhos inválidos não gravam domínio; cabeçalho sem dados é tratado no fluxo completo.
- [ ] TI-02 — UTF-8 estrito e chunks
  - Completar: codificação inválida em qualquer trecho do snapshot impede processamento e escrita de domínio.
- [ ] TI-04 — Linhas vazias versus registro vazio
  - Completar: linhas ignoradas fora dos totais, registro vazio rejeitado e espaços preservados.
- [ ] TI-05 — Quantidade incorreta de campos
  - Completar: registro delimitado com número errado de campos rejeitado, próximo válido persistido.
- [ ] TI-06 — Aspas irrecuperáveis interrompem
  - Completar: erro irrecuperável interrompe, preserva commits prévios e não importa o restante por suposição.
- [ ] TI-09 — Duplicação no arquivo e entre arquivos
  - Completar: duplicação dentro de arquivos reais e entre arquivos/tentativas preserva ID e origem.
- [ ] TI-13 — Falhas antes, durante e depois de commit
  - Completo: falhas antes, durante e depois de commit; ledger resolve resultado incerto sem dupla contagem ou perda.
- [ ] TI-14 — Exclusão entre processos e liberação
  - Integrar ao comando: segunda carga recusada antes de escrita e liberação após término/morte.
- [ ] TI-15 — Perda e substituição da sessão Prisma
  - Integrar à recuperação: sessão substituída não escreve e nova tentativa somente avança após exclusão.
- [ ] TI-16 — Diário truncado e publicação de relatório falha
  - Completar: reconstrução e reconciliação sob lock, diário truncado, falha de publicação e estado terminal preservado.
- [ ] TI-17 — Fonte inacessível, mutável ou interrompida
  - Completar: diagnóstico local mesmo sem banco e impossibilidade de consumir fonte diferente do snapshot identificado.
- [ ] TI-18 — Vazios e apenas rejeições
  - Completo: arquivo com cabeçalho sem dados sai zero com aviso; somente inválidos sai 2, ambos sem domínio novo.
- [ ] TI-19 — Configuração e isolamento das dependências
  - Completar: importação depende somente de filesystem/PostgreSQL, com rede externa bloqueada e artefatos sem secrets.

### Testes E2E (se aplicável)

Não há novos casos desta camada nesta tarefa; os E2E são implementados na tarefa 8.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Registrar comandos e resultados; não marcar variantes dependentes de tarefas futuras como aprovadas. Os E2E completos serão executados na tarefa 8.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `backend/src/cli/import-csv.ts`
- `backend/src/cli/recover-import.ts`
- `backend/src/cli/shutdown.ts`
- `backend/src/schemas/import-options-schema.ts`
- `backend/src/services/import-service.ts`
- `backend/src/services/recovery-service.ts`
- `backend/src/services/report-service.ts`
- `backend/src/services/record-service.ts`
- `backend/src/cli/*.test.ts`
- `backend/src/services/import-service*.test.ts`
- `backend/src/services/recovery-service*.test.ts`
- `backend/package.json`
- `backend/README.md`
