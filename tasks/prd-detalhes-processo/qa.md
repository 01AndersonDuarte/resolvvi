# Relatório de QA — Detalhes do processo

As evidências de navegador desta execução estão em `tasks/prd-detalhes-processo/evidences/`.

## Resumo

- Data: 2026-10-04
- Status: BLOQUEADO
- Total de critérios de aceitação: 22
- Critérios de aceitação atendidos: 21
- Bugs encontrados: 1 (corrigido)
- Bloqueio restante: CA-20 requer verificação visual manual com zoom nativo do navegador a 200%. O Playwright validou viewport e ampliação CSS de 200%, que não comprovam o zoom nativo.

## Critérios de aceitação verificados

| ID | Critério de aceitação | Casos de teste | Status | Evidência |
|----|-----------------------|----------------|--------|-----------|
| CA-01 | Dados gerais correspondem à base, sem inferências, com aviso da fonte. | TU-03, TI-01, TI-07, E2E-01 | PASSOU | [Dados desktop](./evidences/processo-desktop-dados.png) |
| CA-02 | CNJ, valor e data mantêm a formatação definida e independente de fuso. | TU-03, TU-04, TI-01, TI-07 | PASSOU | TI-01, TI-07 |
| CA-03 | Troca de processo não mistura dados ou movimentações de respostas obsoletas. | TU-10, TU-13, TI-08 | PASSOU | Testes automatizados |
| CA-04 | Eventos seguem ordem decrescente com desempate estável entre páginas. | TU-06, TI-02, TI-07 | PASSOU | TI-02 percorreu 1.000 eventos em 50 páginas |
| CA-05 | Conteúdo vazio mantém data e título, sem expansão, conforme a base. | TU-05, TU-15, TI-07 | PASSOU | TI-07; teste de apresentação TU-15 |
| CA-06 | Prévia, expansão e texto integral preservam grafemas e conteúdo. | TU-08, TU-09, TI-07, E2E-01 | PASSOU | [Dados desktop](./evidences/processo-desktop-dados.png) |
| CA-07 | Ausências defensivas preservam dados válidos, zero e ordem de itens sem data. | TU-03, TU-04, TU-05, TU-10, TU-15 | PASSOU | Testes automatizados |
| CA-08 | Histórico vazio mantém os detalhes e não exibe paginação. | TU-15, TI-03 | PASSOU | [Histórico vazio](./evidences/processo-desktop-historico-vazio.png) |
| CA-09 | Limites de 1, 20, 21 e 120 eventos geram páginas corretas. | TU-02, TU-07, TI-02, TI-03 | PASSOU | Testes automatizados |
| CA-10 | Histórico de 1.000 eventos é acessível sem omissões ou limite artificial. | TU-07, TI-02 | PASSOU | 1.000 itens, 50 páginas, 127.877 bytes; 1.073 ms observados nesta execução |
| CA-11 | Falha de paginação preserva a página atual e permite retentativa. | TU-12, TI-05, E2E-03 | PASSOU | [Erro de histórico](./evidences/processo-desktop-erro-historico.png) |
| CA-12 | Acesso direto e recarga carregam os detalhes sem busca anterior. | TU-11, TI-01, TI-08, E2E-02 | PASSOU | E2E-02 |
| CA-13 | Carga inicial indica espera sem declarar ausência prematuramente. | TU-11, TU-13, E2E-02 | PASSOU | TU-11; E2E-02 |
| CA-14 | Destino inválido e processo ausente têm estados e retorno distintos. | TU-01, TU-02, TU-11, TI-01, TI-03, E2E-02 | PASSOU | E2E-02 |
| CA-15 | Falha recuperável oferece nova tentativa e mantém detalhes quando possível. | TU-12, TI-05, E2E-03 | PASSOU | [Erro de histórico](./evidences/processo-desktop-erro-historico.png) |
| CA-16 | Sessão inválida bloqueia dados protegidos e segue para entrada. | TU-13, TU-14, TU-18, TI-04, E2E-04 | PASSOU | E2E-04 |
| CA-17 | Retorno preserva CNJ existente e acesso direto volta à consulta sem histórico inventado. | TI-08, E2E-01, E2E-02 | PASSOU | E2E-01 e E2E-02 |
| CA-18 | Títulos e conteúdos são tratados como texto literal. | TU-16 | PASSOU | TU-16 |
| CA-19 | Títulos, ações e navegação funcionam por teclado com foco visível. | TU-09, TU-17, E2E-01, E2E-03, E2E-05 | PASSOU | E2E-05 |
| CA-20 | Layout se mantém utilizável em celular, desktop e ampliação. | E2E-05 | BLOQUEADO | [Celular](./evidences/processo-mobile-dados.png), [CSS 200%](./evidences/processo-mobile-zoom-css-200.png); zoom nativo pendente |
| CA-21 | Leituras não alteram registros nem consultam serviços externos. | TU-16, TU-18, TU-19, TI-06, TI-07 | PASSOU | TI-06 e TI-07 |
| CA-22 | Suítes, builds e cobertura mínima passam nos aplicativos afetados. | TU-01–TU-19, TI-01–TI-08, E2E-01–E2E-05 | PASSOU | Gates registrados abaixo |

## Testes E2E executados

| ID | Fluxo | Resultado | Observações |
|----|-------|-----------|-------------|
| E2E-01 | Consulta, detalhes, expansão, paginação e retorno preservando o CNJ. | PASSOU | Backend real e fixture E2E. |
| E2E-02 | Acesso direto, recarga, destino inválido e processo ausente. | PASSOU | Sessão autenticada. |
| E2E-03 | Falha isolada de histórico, preservação de detalhes e retry. | PASSOU | Segunda requisição concluiu a página solicitada. |
| E2E-04 | Expiração de sessão durante leitura protegida. | PASSOU | Detalhes removidos e encaminhamento à entrada. |
| E2E-05 | Teclado, celular/desktop e ampliação CSS de 200%. | PASSOU | Zoom nativo do navegador continua sem comprovação. |
| QA visual | Estados com dados, vazio, erro e viewport móvel. | PASSOU | Cenário temporário de captura passou; imagens preservadas na pasta de evidências. |

## Testes automatizados e cobertura

| Camada | ID | Resultado | Validação/comando | Observações |
|--------|----|-----------|-------------------|------------|
| Unidade/integração frontend | TU-01–TU-17 | PASSOU | `frontend/npm test` | 131 testes em 22 arquivos. |
| Unidade/integração backend | TU-01–TU-07, TU-18–TU-19, TI-01–TI-07 | PASSOU | `backend/npm test` | 167 testes em 32 arquivos. |
| Integração frontend | TI-08 | PASSOU | `frontend/npm test` | View, contexto, cliente HTTP e transporte controlado. |
| E2E | E2E-01–E2E-05 | PASSOU | `frontend/npm run test:e2e` | 10 E2E do repositório; execução final incluiu também o cenário temporário de captura (11 no total). |
| Frontend | Gates | PASSOU | `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build` | Todos executados em `frontend/`. |
| Backend | Gates | PASSOU | `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build` | Todos executados em `backend/`. |

- Cobertura frontend: statements 93,53%; branches 91,26%; funções 95,65%; linhas 95,88%.
- Cobertura backend: statements 87,98%; branches 85,50%; funções 86,86%; linhas 90,16%.
- Medição de TI-02: 1.000 movimentações, 50 páginas, 127.877 bytes e 1.073 ms nesta execução. É observacional, sem meta de latência acordada.

## Acessibilidade

- [x] Teclado: Tab e Enter operaram expansão, paginação e retorno; retry por teclado também coberto por TU-17.
- [x] Elementos interativos: botões e links têm nomes acessíveis; navegação possui rótulo descritivo.
- [x] Imagens: não há imagens de conteúdo na tela de detalhes.
- [x] Contraste: inspeção visual das capturas encontrou texto e controles legíveis nos fundos usados.
- [x] Formulários: não há campos de formulário na tela de detalhes.
- [x] Erros: mensagem de histórico usa `role="alert"` e inclui ação nomeada para nova tentativa.
- [x] Fonte e quebra: textos permanecem legíveis e títulos/conteúdos longos quebram em viewport de 320 px.

## Bugs encontrados e corrigidos

| ID | Descrição | Severidade | Status | Correção | Teste de regressão | Evidência |
|----|-----------|------------|--------|----------|--------------------|-----------|
| BUG-01 | A mensagem do histórico vazio divergia do texto exigido pelo RF11/CA-08. | Baixa | Corrigido | Atualizada em `ProcessMovements` para “Nenhuma movimentação disponível na base para este processo.” | Teste de apresentação em `process-movements-view.test.tsx` e captura Playwright do estado vazio. | [Histórico vazio](./evidences/processo-desktop-historico-vazio.png) |

## Conclusão

Os testes automatizados, builds, lint, tipos e cobertura passaram. O defeito de texto do estado vazio foi corrigido e revalidado. Os estados com dados, vazio e erro, além de celular, foram capturados. O QA fica **BLOQUEADO** porque CA-20 exige a checagem visual de zoom nativo a 200%, e esta execução só pôde comprovar ampliação CSS via Playwright. As instruções e evidências anteriores da tarefa 7 também registram essa checagem manual como pendente. Após essa verificação nativa, CA-20 poderá ser fechado e o parecer final recalculado.

### Ambiente e limpeza

- API E2E: `http://127.0.0.1:3050`; controle: `http://127.0.0.1:3051`; frontend: `http://127.0.0.1:5100`.
- Banco E2E isolado existente: `dev_test_resolvvi_e2e_test` em `127.0.0.1:55432`; 100 processos carregados. O container já estava ativo antes do QA e foi preservado.
- Os servidores temporários iniciados pelo Playwright foram encerrados ao fim das execuções.
