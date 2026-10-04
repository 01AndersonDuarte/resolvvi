# Resumo das tarefas de implementação de detalhes do processo

## Tarefas

- [x] 1.0 [API de detalhes do processo](./task_1.md)
- [x] 2.0 [API de movimentações paginadas](./task_2.md)
- [x] 3.0 [Auditoria da base importada pelos novos contratos](./task_3.md)
- [x] 4.0 [Cliente HTTP e hooks de detalhes e histórico](./task_4.md)
- [x] 5.0 [Página de informações gerais e estados de detalhes](./task_5.md)
- [ ] 6.0 [Interface de movimentações e integração da página](./task_6.md)
- [ ] 7.0 [Jornadas E2E e validação final](./task_7.md)

## Escopo e dependências

Estrutura aprovada pelo usuário. Fonte: [PRD](./prd.md) e [TechSpec](./techspec.md). As tarefas 1.0 a 4.0 foram implementadas e validadas; as tarefas 5.0 a 7.0 continuam pendentes.

A fundação de dados, a autenticação e a busca CNJ existentes são pré-requisitos. As tarefas 1.0 a 4.0 foram implementadas e validadas; as tarefas 5.0 a 7.0 continuam pendentes. A ordem abaixo coloca as dependências antes de seus consumidores.

| Tarefa | Dependências diretas | Skills aplicáveis |
| --- | --- | --- |
| 1.0 | Fundação, autenticação e busca existentes | executar-task; rules do backend |
| 2.0 | 1.0 | executar-task; rules do backend |
| 3.0 | 1.0, 2.0 | executar-task; rules do backend |
| 4.0 | 1.0, 2.0 | executar-task; react |
| 5.0 | 4.0 | executar-task; react |
| 6.0 | 4.0, 5.0 | executar-task; react |
| 7.0 | 3.0, 6.0 | executar-task; react se alterar frontend; executar-qa quando invocada |

## Rastreabilidade dos requisitos

| Requisito do PRD | Tarefas responsáveis |
| --- | --- |
| RF1 | 1.0, 2.0, 3.0, 6.0, 7.0 |
| RF2 | 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0 |
| RF3 | 1.0, 3.0, 5.0, 6.0, 7.0 |
| RF4 | 1.0, 3.0, 5.0, 7.0 |
| RF5 | 5.0, 7.0 |
| RF6 | 2.0, 3.0, 6.0, 7.0 |
| RF7 | 2.0, 3.0, 6.0, 7.0 |
| RF8 | 3.0, 6.0, 7.0 |
| RF9 | 2.0, 3.0, 6.0, 7.0 |
| RF10 | 2.0, 6.0, 7.0 |
| RF11 | 2.0, 6.0, 7.0 |
| RF12 | 2.0, 4.0, 6.0, 7.0 |
| RF13 | 2.0, 3.0, 6.0, 7.0 |
| RF14 | 2.0, 4.0, 6.0, 7.0 |
| RF15 | 1.0, 4.0, 5.0, 7.0 |
| RF16 | 4.0, 5.0, 6.0, 7.0 |
| RF17 | 1.0, 2.0, 4.0, 5.0, 6.0, 7.0 |
| RF18 | 1.0, 2.0, 4.0, 5.0, 6.0, 7.0 |
| RF19 | 1.0, 2.0, 4.0, 5.0, 6.0, 7.0 |
| RF20 | 1.0, 4.0, 5.0, 7.0 |
| RF21 | 2.0, 3.0, 6.0, 7.0 |

## Rastreabilidade dos critérios de aceitação

As tarefas 1 a 6 produzem as entregas e evidências específicas; a tarefa 7 consolida a validação final. O QA verifica os critérios contra o PRD.

| Critério | Tarefas responsáveis |
| --- | --- |
| CA-01 | 1.0, 3.0, 5.0, 7.0 |
| CA-02 | 1.0, 2.0, 3.0, 5.0, 7.0 |
| CA-03 | 2.0, 4.0, 5.0, 6.0, 7.0 |
| CA-04 | 2.0, 3.0, 6.0, 7.0 |
| CA-05 | 2.0, 3.0, 6.0, 7.0 |
| CA-06 | 3.0, 6.0, 7.0 |
| CA-07 | 1.0, 2.0, 4.0, 5.0, 6.0, 7.0 |
| CA-08 | 2.0, 6.0, 7.0 |
| CA-09 | 2.0, 6.0, 7.0 |
| CA-10 | 2.0, 6.0, 7.0 |
| CA-11 | 2.0, 4.0, 6.0, 7.0 |
| CA-12 | 1.0, 4.0, 5.0, 6.0, 7.0 |
| CA-13 | 4.0, 5.0, 6.0, 7.0 |
| CA-14 | 1.0, 2.0, 4.0, 5.0, 6.0, 7.0 |
| CA-15 | 1.0, 2.0, 4.0, 5.0, 6.0, 7.0 |
| CA-16 | 1.0, 2.0, 4.0, 5.0, 6.0, 7.0 |
| CA-17 | 5.0, 6.0, 7.0 |
| CA-18 | 6.0, 7.0 |
| CA-19 | 5.0, 6.0, 7.0 |
| CA-20 | 5.0, 6.0, 7.0 |
| CA-21 | 1.0, 2.0, 3.0, 6.0, 7.0 |
| CA-22 | 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0 |

## Rastreabilidade dos casos de teste

Inventário completo: 19 casos unitários, oito de integração e cinco E2E. As variantes de casos compartilhados são complementares e estão delimitadas nas tarefas.

| Caso da TechSpec | Tarefas responsáveis |
| --- | --- |
| TU-01 — Identificador de detalhes distingue formato inválido | 1.0 |
| TU-02 — Query aceita somente página inteira permitida | 2.0 |
| TU-03 — Dados gerais preservam identidade e formatação | 1.0 |
| TU-04 — Dia civil independe de fuso | 2.0 |
| TU-05 — Texto ausente difere de texto significativo | 2.0 |
| TU-06 — Consulta paginada usa ordenação e vínculo corretos | 2.0 |
| TU-07 — Contagem determina páginas e limites | 2.0 |
| TU-08 — Prévia respeita 500 grafemas | 6.0 |
| TU-09 — Expansão afeta apenas o evento acionado | 6.0 |
| TU-10 — Leitor de resposta valida vínculo e estrutura | 4.0 |
| TU-11 — Carga inicial não simula ausência | 5.0 |
| TU-12 — Falha de histórico preserva detalhes | 4.0, 6.0 |
| TU-13 — Resposta obsoleta não repõe dados | 4.0, 5.0 |
| TU-14 — Sessão inválida tem prioridade sobre recuperação local | 4.0, 5.0 |
| TU-15 — Eventos vazios e incompletos têm apresentação explícita | 6.0 |
| TU-16 — Conteúdo é renderizado literalmente | 6.0 |
| TU-17 — Controles nativos permitem operação por teclado | 6.0 |
| TU-18 — Controller revalida antes de responder | 1.0, 2.0 |
| TU-19 — Falhas de persistência recebem envelope público | 1.0, 2.0 |
| TI-01 — Detalhes HTTP correspondem à persistência | 1.0 |
| TI-02 — Histórico preserva vínculo e ordem entre páginas | 2.0 |
| TI-03 — Processo vazio difere de ausente e página inválida | 2.0 |
| TI-04 — Duas leituras preservam proteção de sessão | 2.0 |
| TI-05 — Falhas e timeout preservam o contrato HTTP | 2.0 |
| TI-06 — Leitura não modifica registros processuais | 2.0 |
| TI-07 — Fixture CSV inteira permanece consultável | 3.0 |
| TI-08 — View e cliente HTTP preservam recuperação e retorno | 6.0 |
| E2E-01 — Consulta até detalhes, expansão, paginação e retorno | 7.0 |
| E2E-02 — Acesso direto e recarga independem da busca | 7.0 |
| E2E-03 — Histórico recupera falha sem apagar processo | 7.0 |
| E2E-04 — Expiração durante detalhes bloqueia paginação | 7.0 |
| E2E-05 — Detalhes permanecem utilizáveis por teclado e com ampliação | 7.0 |

## Condições de conclusão

- Cada tarefa implementa seus testes junto com a entrega e registra os resultados das validações do aplicativo afetado.
- CA-22 exige lint, typecheck, testes, cobertura e build em ambos os aplicativos, mais E2E pelo frontend; preservar no mínimo 80% nas quatro métricas de cada aplicativo e globalmente.
- Preservar busca, autenticação, listagem crescente existente, CSV e registros persistidos; sem novas migrations, dependências ou integrações externas.
- Fixtures defensivas não alteram constraints. A auditoria real reutiliza o teste de seed existente. Volume inclui 1.000 eventos/50 páginas e medições sem novo SLA.
- Acessibilidade segue o limite do PRD: semântica, teclado, responsividade e zoom nativo de 200%, distinguindo-o de CSS zoom automatizado.
- Marcar checklists somente após a conclusão e validação do incremento; seguir os commits locais previstos nas rules.

A implementação está em andamento. A próxima tarefa pendente é a 6.0.
