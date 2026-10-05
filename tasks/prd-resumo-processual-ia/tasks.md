# Resumo das tarefas de implementação de resumo processual por IA

## Tarefas

- [x] 1.0 [Fonte integral, contratos, prompt e validação](./task_1.md)
- [x] 2.0 [Persistência, versionamento e concorrência](./task_2.md)
- [x] 3.0 [Provedor, execução, API, avaliações e métricas](./task_3.md)
- [x] 4.0 [Interface de geração, referências e avaliação](./task_4.md)
- [x] 5.0 [E2E, regressão e avaliação semântica](./task_5.md)

## Escopo aprovado

Planejamento em cinco entregas incrementais, conforme [prd.md](./prd.md) e [techspec.md](./techspec.md). As tarefas 1.0–5.0 estão concluídas. A avaliação real final passou nos 20 casos sintéticos, com GPT-4.1 e regras v14; a análise foi realizada pelo agente por determinação do usuário. QA aprovado em [qa.md](./qa.md), testes e cobertura aprovados, tabelas confirmadas no banco de desenvolvimento. Gasto estimado acumulado: US$ 0,3151232 de US$ 0,50 autorizados.

- Avaliação sem comprovante HMAC de apresentação; servidor mantém sessão, acesso, vínculo e versão atual. A exibição prévia é uma condição da interface.
- Referências por frase com data e título, conferidas manualmente no histórico. Sem endpoint de localização, salto, expansão ou foco automático.
- Capacidade local de quatro execuções, com implantação inicial em uma única instância executora de IA. Coordenação global deve ser implementada antes de habilitar múltiplas instâncias; deduplicação por chave e cooldown continuam persistidos.
- Permanecem fonte integral, snapshots imutáveis, geração única, prazo de 30 segundos, autenticação, persistência dos votos, testes e gate semântico real.

## Dependências e skills

| Tarefa | Depende de | Skills na execução |
| --- | --- | --- |
| 1 | Domínio e histórico existentes | executar-task |
| 2 | 1 e banco de testes isolado | executar-task |
| 3 | 1 e 2 | executar-task |
| 4 | 3 | executar-task, react |
| 5 | 1–4; acesso ao provedor e revisão semântica pelo agente autorizada pelo usuário | executar-task, react, executar-qa |

A tarefa 3 reúne mais trabalho: suas subtarefas separam adaptador, executor, service, HTTP, observabilidade e composição. Os testes pertencem a cada incremento; a tarefa 5 não substitui testes unitários/de integração das tarefas 1–4.

## Rastreabilidade dos requisitos

| Requisitos | Tarefas principais |
| --- | --- |
| RF1–RF3 | 3, 4, 5 |
| RF4–RF8 | 1, 2, 3, 4, 5 |
| RF9–RF12 | 1, 3, 4, 5 |
| RF13–RF16 | 2, 3, 4, 5 |
| RF17–RF20 | 1, 2, 3, 4, 5 |
| RF21–RF23 | 2, 3, 4, 5 |
| RF24–RF26 | 1, 2, 3, 5 |
| RF27 | 3, 4, 5 |
| RF28–RF29 | 1, 3, 4, 5 |

## Rastreabilidade dos critérios e testes

A TechSpec é a fonte de verdade dos 37 casos: 18 unitários, 14 de integração e 5 E2E. TU-15, TU-17, TI-10 e TI-11 foram ajustados aos cortes aprovados, mantendo seus IDs. O gate semântico permanece adicional. Casos compartilhados entre tarefas 2 e 3 têm o recorte de repository e o complemento de service/HTTP/executor descritos nos arquivos individuais.

| Caso | Tarefa(s) | Critérios do PRD |
| --- | --- | --- |
| TU-01 | 1 | CA-05, CA-10 |
| TU-02 | 1 | CA-03, CA-04 |
| TU-03 | 1 | CA-06 |
| TU-04 | 1 | CA-02, CA-08 |
| TU-05 | 1 | CA-08 |
| TU-06 | 1 | CA-02, CA-08, CA-18 |
| TU-07 | 1 | CA-07 |
| TU-08 | 1 | CA-07, CA-08 |
| TU-09 | 3 | CA-11, CA-13 |
| TU-10 | 3 | CA-13 |
| TU-11 | 3 | CA-09, CA-12 |
| TU-12 | 4 | CA-01, CA-04, CA-06, CA-19 |
| TU-13 | 4 | CA-11, CA-13, CA-20 |
| TU-14 | 4 | CA-15, CA-17 |
| TU-15 | 4 | CA-19, CA-22 |
| TU-16 | 3 | CA-21 |
| TU-17 | 3 | CA-16, CA-20 |
| TU-18 | 1, 5 | CA-02, CA-03, CA-07 |
| TI-01 | 3 | CA-16, CA-20 |
| TI-02 | 3 | CA-01, CA-02, CA-05, CA-18 |
| TI-03 | 2, 3 | CA-09, CA-11 |
| TI-04 | 2, 3 | CA-10, CA-11 |
| TI-05 | 2, 3 | CA-09, CA-11, CA-13 |
| TI-06 | 3 | CA-08, CA-12, CA-13 |
| TI-07 | 2, 3 | CA-14 |
| TI-08 | 2, 3 | CA-15, CA-16, CA-17 |
| TI-09 | 2, 3 | CA-10, CA-18 |
| TI-10 | 3 | CA-05, CA-18, CA-19 |
| TI-11 | 3 | CA-11, CA-13, CA-21 |
| TI-12 | 3 | CA-21 |
| TI-13 | 2, 3 | CA-10, CA-12, CA-18 |
| TI-14 | 2, 3 | CA-11, CA-13, CA-23 |
| E2E-01 | 5 | CA-01, CA-02, CA-05, CA-09, CA-15, CA-19 |
| E2E-02 | 5 | CA-10, CA-11, CA-18 |
| E2E-03 | 5 | CA-04, CA-06, CA-13, CA-14, CA-17 |
| E2E-04 | 5 | CA-11, CA-20 |
| E2E-05 | 5 | CA-19, CA-22, CA-23 |

| Critério | Tarefas relacionadas |
| --- | --- |
| CA-01 | 3, 4, 5 |
| CA-02 | 1, 3, 4, 5 |
| CA-03 | 1, 3, 5 |
| CA-04 | 1, 3, 4, 5 |
| CA-05 | 1, 2, 3, 5 |
| CA-06 | 1, 3, 4, 5 |
| CA-07 | 1, 3, 5 |
| CA-08 | 1, 3, 5 |
| CA-09 | 2, 3, 4, 5 |
| CA-10 | 1, 2, 3, 4, 5 |
| CA-11 | 2, 3, 4, 5 |
| CA-12 | 2, 3, 5 |
| CA-13 | 2, 3, 4, 5 |
| CA-14 | 2, 3, 4, 5 |
| CA-15 | 2, 3, 4, 5 |
| CA-16 | 2, 3, 4, 5 |
| CA-17 | 2, 3, 4, 5 |
| CA-18 | 1, 2, 3, 5 |
| CA-19 | 3, 4, 5 |
| CA-20 | 3, 4, 5 |
| CA-21 | 3, 5 |
| CA-22 | 4, 5 |
| CA-23 | 1, 2, 3, 4, 5 |

## Condições de conclusão

- Todos os casos mapeados implementados e aprovados, com número de chamadas/efeitos persistidos nas integrações; cobertura mínima de 80% por aplicativo em linhas, funções, branches e statements.
- Em cada aplicativo: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`. Em `frontend/`: também `npm run test:e2e`, com banco/harness isolados.
- Avaliação real explícita de 20 resumos ou de todos os casos elegíveis se houver menos, com avaliação semântica aprovada pelo agente, conforme instrução do usuário, configuração identificada e evidências protegidas. Mocks não concluem esse gate.
- Implantação documentada para uma instância executora, tratamento de dados do provedor verificado e ausência de conteúdo processual/segredos em logs.
- Checklists atualizados somente após validação, commits locais coesos conforme as regras e relatório de QA com evidências para CA-01–CA-23. Sem dashboard ou geração automática adicional.
