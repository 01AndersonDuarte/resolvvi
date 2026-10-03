# Relatório de QA — Fundação do domínio e ingestão inicial do CSV

As evidências de execução estão em [`evidences/`](evidences/).

## Resumo

- Data: 3 de outubro de 2026
- Status: **APROVADO**
- Total de critérios de aceitação: 6
- Critérios de aceitação atendidos: 6
- Bugs encontrados: 1 (documentação; corrigido)
- Bugs pendentes: 0

## Critérios de aceitação verificados

| ID | Critério de aceitação | Casos de teste | Status | Evidência |
| --- | --- | --- | --- | --- |
| CA-01 | Seed em base vazia cria 100 processos e 5.568 movimentações. | TU-01, TI-04 | PASSOU | [seed-cli.log](evidences/seed-cli.log), [field-verification.log](evidences/field-verification.log) |
| CA-02 | Os campos persistidos correspondem ao CSV, incluindo zeros, acentos, quebras de linha e conteúdo vazio. | TU-01, TU-02, TI-01 | PASSOU | [vitest-test.log](evidences/vitest-test.log), [field-verification.log](evidences/field-verification.log) |
| CA-03 | Movimentações ficam vinculadas e são ordenáveis por data e ordem de origem. | TU-03, TI-01, TI-03 | PASSOU | [vitest-test.log](evidences/vitest-test.log), [field-verification.log](evidences/field-verification.log) |
| CA-04 | O banco preserva a unicidade do CNJ. | TI-02 | PASSOU | [vitest-test.log](evidences/vitest-test.log) |
| CA-05 | Arquivo ausente/incompatível ou falha transacional resulta em erro sem persistência parcial. | TU-01, TI-05 | PASSOU | [vitest-test.log](evidences/vitest-test.log) |
| CA-06 | A suíte protege os comportamentos relevantes e respeita a cobertura mínima de 80%. | TU-01–TU-03, TI-01–TI-05 | PASSOU | [vitest-coverage.log](evidences/vitest-coverage.log) |

Na comparação direta, os 100 processos e as 5.568 movimentações persistidas corresponderam campo a campo ao CSV. A ordenação do repository correspondeu à data crescente e a `sourceOrder` em todos os 100 processos. A amostra da versão fornecida contém 1.312 conteúdos vazios e 2.527 conteúdos multilinha. Ela não contém CNJs iniciados por zero; o teste unitário TU-01 verifica que o mapeamento preserva esse formato textual.

## Testes E2E executados

| ID | Fluxo | Resultado | Observações |
| --- | --- | --- | --- |
| — | — | NÃO APLICÁVEL | O PRD e a TechSpec não definem interface, endpoint público ou fluxo externo. O seed foi exercitado por teste de integração e pelo comando real. |

## Testes automatizados e cobertura

| Camada | ID | Resultado | Validação/comando | Observações |
| --- | --- | --- | --- | --- |
| Unidade | TU-01 | PASSOU | `npm test` | Mapeia as oito colunas, acentos e CNJ com zeros iniciais. |
| Unidade | TU-02 | PASSOU | `npm test` | Converte data, valor e quantidade; casos inválidos são rejeitados. |
| Unidade | TU-03 | PASSOU | `npm test` | Repository ordena por data e `sourceOrder`. |
| Integração | TI-01 | PASSOU | `npm test` | Persiste processo e movimentações com os campos esperados. |
| Integração | TI-02 | PASSOU | `npm test` | Segundo processo com o mesmo CNJ é rejeitado pelo banco. |
| Integração | TI-03 | PASSOU | `npm test` | Movimentação sem processo é rejeitada pela chave estrangeira. |
| Integração | TI-04 | PASSOU | `npm test` e `npm run seed` | 100 processos e 5.568 movimentações. |
| Integração | TI-05 | PASSOU | `npm test` | Falha da transação não deixa os registros do seed parcialmente persistidos. |
| Qualidade | CA-06 | PASSOU | `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build` | 29 testes passaram; nenhum teste foi ignorado com o PostgreSQL de QA. |

- Cobertura: 98,24% statements, 96,84% branches, 100% functions e 100% lines. Meta mínima: 80% em cada métrica.

## Acessibilidade

Não aplicável: não há telas ou controles de interface nesta entrega. A TechSpec declara os testes E2E e de interface como não aplicáveis.

## Verificação visual e responsividade

Não aplicável: o PRD exclui interface gráfica e jornada de operador.

## Bugs encontrados e corrigidos

| ID | Descrição | Severidade | Status | Correção | Teste de regressão | Evidência |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-01 | `task_2.md` indicava estado pendente no cabeçalho e conclusão no final. | Baixa | Corrigido | Estado do cabeçalho alinhado à conclusão registrada. | Conferência dos estados de todas as tarefas, sem estado pendente. | [task-status-consistency.log](evidences/task-status-consistency.log) |

## Ambiente e encerramento

- PostgreSQL 17 descartável no projeto Compose `qa-fundacao-ingestao-csv`, porta `55439`; a porta foi conferida livre antes da inicialização.
- Migration `20261003204206_process_movement` aplicada antes dos testes.
- Nenhum backend HTTP ou frontend foi iniciado, pois não são necessários nesta funcionalidade.
- O container, volume, rede e arquivo Compose temporário foram removidos; a porta `55439` foi liberada. Consulte [environment.log](evidences/environment.log) e [cleanup.log](evidences/cleanup.log).
- O SHA-256 do CSV permaneceu `ff787b0e95aaca3dca88943bf8606a3c96fa0f00b4218844545790f9656697c9`. Evidência: [csv-sha256.log](evidences/csv-sha256.log).

## Conclusão

QA **APROVADO**. Todos os critérios CA-01 a CA-06 foram verificados e atendidos. Os 29 testes passaram no PostgreSQL descartável, a cobertura superou a meta mínima, o comando real carregou o CSV e a comparação campo a campo confirmou os dados e a ordenação. A única inconsistência documental encontrada foi corrigida; não há bugs pendentes.
