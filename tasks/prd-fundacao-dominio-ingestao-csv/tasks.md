# Resumo das tarefas de implementação de fundação do domínio e ingestão CSV

## Tarefas

- [x] 1.0 [Preparar o backend e a infraestrutura de testes](./task_1.md)
- [ ] 2.0 [Implementar as regras de domínio](./task_2.md)
- [ ] 3.0 [Criar persistência e controle de sessão](./task_3.md)
- [ ] 4.0 [Implementar o processamento transacional](./task_4.md)
- [ ] 5.0 [Implementar a leitura segura do CSV](./task_5.md)
- [ ] 6.0 [Implementar diário e relatórios persistentes](./task_6.md)
- [ ] 7.0 [Integrar os comandos de importação e recuperação](./task_7.md)
- [ ] 8.0 [Validar a operação completa e documentar](./task_8.md)

## Escopo e fontes

Estrutura de oito entregas aprovada pelo solicitante. Fontes: [PRD](./prd.md), [TechSpec](./techspec.md), [AGENTS.md](../../AGENTS.md) e as seis rules em `.agents/rules/`. Este plano cobre RF1–RF18, RNF1–RNF6, CA-01–CA-21 e as 36 famílias de testes da TechSpec: 14 unitárias, 19 de integração e 3 E2E.

A entrega é um importador operacional em backend/, preparado a partir de um checkout sem aplicações executáveis. Não inclui frontend ou HTTP. O CSV original permanece inalterado. As decisões da TechSpec sobre PostgreSQL/Prisma, regras determinísticas, snapshot, exclusão por sessão, transação por registro, ledger e relatórios versionados são distribuídas abaixo; não são redefinidas neste plano.

## Dependências e entregas

| Tarefa | Dependências diretas | Entrega verificável |
| --- | --- | --- |
| [1.0](./task_1.md) | — | Criar a base executável independente em backend/, com configuração validada e ambiente de testes reproduzível. A entrega permite compilar, verificar tipos e testar o código inicial, preparando PostgreSQL real para as próximas tarefas. |
| [2.0](./task_2.md) | [1.0](./task_1.md) | Entregar validadores e decisões puras para transformar um registro decodificado em dados canônicos ou diagnósticos acumulados. Nenhuma regra de domínio depende de banco, rede, locale ou relógio. |
| [3.0](./task_3.md) | [1.0](./task_1.md) | Entregar schema, migrations e acesso à persistência, com exclusão de importações na mesma base e verificação da identidade da sessão. A estabilidade da sessão Prisma é comprovada antes de integrar o fluxo de gravação de domínio. |
| [4.0](./task_4.md) | [2.0](./task_2.md), [3.0](./task_3.md) | Entregar o processamento de um registro com classificação confirmada no banco. Validação, conflito, duplicidade e criação respeitam uma única unidade de confirmação, preservando a primeira origem e a ordem de aceitação. |
| [5.0](./task_5.md) | [1.0](./task_1.md), [2.0](./task_2.md) | Entregar snapshot identificado e leitura sequencial do CSV, mantendo valores e posições da fonte. O adaptador distingue registros recuperáveis de estrutura irrecuperável e valida toda a codificação antes do processamento. |
| [6.0](./task_6.md) | [3.0](./task_3.md), [4.0](./task_4.md) | Entregar rastros locais duráveis e relatórios versionados a partir dos resultados confirmados. A camada de relatório deve funcionar também para tentativas que só existem localmente, sem expor conteúdo processual ou segredos. |
| [7.0](./task_7.md) | [4.0](./task_4.md), [5.0](./task_5.md), [6.0](./task_6.md) | Entregar os comandos operacionais completos, integrando fonte, exclusão, processamento, diário e relatórios. A execução deve recuperar fatos confirmados após falha e permitir reimportação integral sem duplicação. |
| [8.0](./task_8.md) | [7.0](./task_7.md) | Entregar evidências automatizadas do comando compilado para corpus, diagnósticos e recuperação após morte abrupta, além da documentação operacional final. Esta tarefa conclui a verificação do escopo implementado nas entregas anteriores. |

A numeração é uma ordem válida de execução. Dependência direta não implica delegação ou execução paralela. Cada tarefa entrega código com seus testes; testes que atravessam componentes têm etapas explicitadas nos arquivos individuais e conclusão atribuída na matriz abaixo.

## Rastreabilidade dos requisitos

| Requisito | Tarefas relacionadas |
| --- | --- |
| RF1 | [2.0](./task_2.md), [3.0](./task_3.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF2 | [2.0](./task_2.md), [3.0](./task_3.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF3 | [2.0](./task_2.md), [4.0](./task_4.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF4 | [2.0](./task_2.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF5 | [2.0](./task_2.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF6 | [2.0](./task_2.md), [3.0](./task_3.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF7 | [2.0](./task_2.md), [3.0](./task_3.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF8 | [2.0](./task_2.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF9 | [1.0](./task_1.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF10 | [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF11 | [2.0](./task_2.md), [4.0](./task_4.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF12 | [3.0](./task_3.md), [4.0](./task_4.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF13 | [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF14 | [3.0](./task_3.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF15 | [1.0](./task_1.md), [5.0](./task_5.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF16 | [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF17 | [1.0](./task_1.md), [3.0](./task_3.md), [4.0](./task_4.md), [5.0](./task_5.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RF18 | [3.0](./task_3.md), [4.0](./task_4.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RNF1 | [3.0](./task_3.md), [4.0](./task_4.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RNF2 | [2.0](./task_2.md), [4.0](./task_4.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RNF3 | [2.0](./task_2.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RNF4 | [1.0](./task_1.md), [3.0](./task_3.md), [5.0](./task_5.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RNF5 | [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |
| RNF6 | [1.0](./task_1.md), [2.0](./task_2.md), [3.0](./task_3.md), [4.0](./task_4.md), [5.0](./task_5.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) |

## Rastreabilidade dos critérios de aceitação

O texto normativo de cada critério permanece no PRD. Tarefas relacionadas contribuem para sua comprovação; a tarefa 8 reúne as evidências finais da suíte e a validação de aceite pertence ao QA.

| Critério | Tarefas relacionadas | Casos da TechSpec |
| --- | --- | --- |
| CA-01 | [3.0](./task_3.md), [8.0](./task_8.md) | TI-07, E2E-01 |
| CA-02 | [2.0](./task_2.md), [3.0](./task_3.md), [8.0](./task_8.md) | TU-01, TI-07 |
| CA-03 | [2.0](./task_2.md), [8.0](./task_8.md) | TU-02, TU-08, E2E-02 |
| CA-04 | [2.0](./task_2.md), [3.0](./task_3.md), [8.0](./task_8.md) | TU-03, TI-07 |
| CA-05 | [2.0](./task_2.md), [3.0](./task_3.md), [8.0](./task_8.md) | TU-04, TU-05, TI-07 |
| CA-06 | [2.0](./task_2.md), [3.0](./task_3.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-06, TU-07, TI-02, TI-03, TI-07, E2E-02 |
| CA-07 | [2.0](./task_2.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-09, TI-09, E2E-01 |
| CA-08 | [2.0](./task_2.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-06, TU-09, TI-09 |
| CA-09 | [2.0](./task_2.md), [4.0](./task_4.md), [8.0](./task_8.md) | TU-06, TU-09, TI-10 |
| CA-10 | [2.0](./task_2.md), [4.0](./task_4.md), [8.0](./task_8.md) | TU-11, TI-12, E2E-01 |
| CA-11 | [2.0](./task_2.md), [4.0](./task_4.md), [8.0](./task_8.md) | TU-10, TI-11, E2E-02 |
| CA-12 | [2.0](./task_2.md), [4.0](./task_4.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-07, TU-08, TI-04, TI-05, TI-11, E2E-02 |
| CA-13 | [3.0](./task_3.md), [4.0](./task_4.md), [7.0](./task_7.md), [8.0](./task_8.md) | TI-08, TI-15, E2E-03 |
| CA-14 | [4.0](./task_4.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) | TI-06, TI-08, TI-13, E2E-03 |
| CA-15 | [1.0](./task_1.md), [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-14, TI-01, TI-02, TI-17 |
| CA-16 | [5.0](./task_5.md), [7.0](./task_7.md), [8.0](./task_8.md) | TI-05, TI-06, E2E-02 |
| CA-17 | [5.0](./task_5.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-12, TI-01, TI-04, TI-18, E2E-02 |
| CA-18 | [3.0](./task_3.md), [7.0](./task_7.md), [8.0](./task_8.md) | TI-14, TI-15, E2E-03 |
| CA-19 | [1.0](./task_1.md), [2.0](./task_2.md), [5.0](./task_5.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-08, TU-12, TU-13, TU-14, TI-04, TI-13, TI-16, TI-17, TI-18, E2E-01, E2E-02 |
| CA-20 | [1.0](./task_1.md), [3.0](./task_3.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-12, TU-14, TI-13, TI-15, TI-16, E2E-03 |
| CA-21 | [1.0](./task_1.md), [3.0](./task_3.md), [6.0](./task_6.md), [7.0](./task_7.md), [8.0](./task_8.md) | TU-13, TI-19, E2E-01, E2E-03 |

## Rastreabilidade dos testes

A coluna de conclusão identifica a tarefa que deve fechar todas as variantes previstas para a família. Tarefas anteriores implementam recortes explicitados nos arquivos individuais; concluir uma delas não significa que a família compartilhada já passou integralmente. A tarefa 8 executa a suíte completa como validação final.

| Caso | Nome na TechSpec | Tarefas com implementação/integração do caso | Conclusão da família |
| --- | --- | --- | --- |
| TU-01 | CNJ mascarado e canônico preservam zeros | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-02 | CNJ inválido recebe categoria específica | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-03 | Calendário civil e bissextos | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-04 | Decimal exato sem limite de precisão arbitrário | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-05 | Quantidade de autores é inteiro positivo | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-06 | Normalização preserva diferenças reais | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-07 | Conteúdo ausente e obrigatoriedade | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-08 | Todos os erros independentes, sem cascata | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-09 | Identidade usa os quatro componentes | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-10 | Conflitos precedem duplicidade | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-11 | Projeção cronológica e empate | [2.0](./task_2.md) | [2.0](./task_2.md) |
| TU-12 | Reconciliação e resultado operacional | [6.0](./task_6.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TU-13 | Sanitização de logs e erros | [1.0](./task_1.md), [6.0](./task_6.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TU-14 | Configuração, argumentos e shutdown | [1.0](./task_1.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-01 | Cabeçalho e BOM | [5.0](./task_5.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-02 | UTF-8 estrito e chunks | [5.0](./task_5.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-03 | CSV com aspas, vírgulas e multilinha | [5.0](./task_5.md) | [5.0](./task_5.md) |
| TI-04 | Linhas vazias versus registro vazio | [5.0](./task_5.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-05 | Quantidade incorreta de campos | [5.0](./task_5.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-06 | Aspas irrecuperáveis interrompem | [5.0](./task_5.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-07 | Persistência exata e vínculos | [3.0](./task_3.md) | [3.0](./task_3.md) |
| TI-08 | Transação desfaz processo e primeira movimentação | [4.0](./task_4.md) | [4.0](./task_4.md) |
| TI-09 | Duplicação no arquivo e entre arquivos | [4.0](./task_4.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-10 | Hash coincidente com identidades distintas | [4.0](./task_4.md) | [4.0](./task_4.md) |
| TI-11 | Conflito impede movimento novo ou duplicado | [4.0](./task_4.md) | [4.0](./task_4.md) |
| TI-12 | Cronologia em cargas reordenadas | [4.0](./task_4.md) | [4.0](./task_4.md) |
| TI-13 | Falhas antes, durante e depois de commit | [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-14 | Exclusão entre processos e liberação | [3.0](./task_3.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-15 | Perda e substituição da sessão Prisma | [3.0](./task_3.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-16 | Diário truncado e publicação de relatório falha | [6.0](./task_6.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-17 | Fonte inacessível, mutável ou interrompida | [5.0](./task_5.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-18 | Vazios e apenas rejeições | [7.0](./task_7.md) | [7.0](./task_7.md) |
| TI-19 | Configuração e isolamento das dependências | [1.0](./task_1.md), [3.0](./task_3.md), [7.0](./task_7.md) | [7.0](./task_7.md) |
| E2E-01 | Corpus completo e repetição pelo comando compilado | [8.0](./task_8.md) | [8.0](./task_8.md) |
| E2E-02 | Arquivo misto e diagnóstico operacional | [8.0](./task_8.md) | [8.0](./task_8.md) |
| E2E-03 | Morte após commit e carga completa recuperada | [8.0](./task_8.md) | [8.0](./task_8.md) |

## Regras transversais de execução

- Usar [executar-task](../../.agents/skills/executar-task/SKILL.md) na implementação. As skills executar-review e executar-qa orientam etapas posteriores quando solicitadas; React e skills de interface não se aplicam.
- Seguir a [abordagem de testes da TechSpec](./techspec.md#abordagem-de-testes): FIRST, Vitest, PostgreSQL real para atomicidade/unicidade, base independente por worker e falhas sincronizadas por eventos/barreiras. Não introduzir flags de falha em produção.
- Cobertura de todo src autoral com quatro thresholds de 80%, incluindo CLI, adaptadores e erros não importados pela suíte. Excluir somente testes, declarações sem execução e cliente gerado.
- Executar lint, typecheck, testes, cobertura e build em backend/ em cada entrega de código. Na tarefa 8, executar também test:e2e sobre o comando compilado, com Playwright configurado no backend e specs em e2e/.
- Preservar corpus, texto original, precisão numérica, origem e desempate. Relatórios e evidências não contêm conteúdo processual completo ou segredos.
- A tarefa 8 registra duração/ambiente sem SLA inventado, verifica datas em UTC e America/Fortaleza e atualiza a documentação operacional e o AGENTS.md.

## Estado da entrega documental

Somente tasks.md e task_1.md a task_8.md são produzidos nesta etapa. Todas as tarefas estão pendentes; implementação, execução de testes e evidências operacionais ocorrerão nas etapas seguintes. Conforme o passo 4 da [skill criar-tasks](../../.agents/skills/criar-tasks/SKILL.md), aguardar confirmação do usuário antes de iniciar qualquer implementação.
