# Relatório de QA — Autenticação e consulta CNJ

As evidências de navegador estão salvas em `tasks/prd-autenticacao-consulta-cnj/evidences/`.

## Resumo

- Data: 2026-10-04
- Status: **BLOQUEADO**
- Total de critérios de aceitação: 28
- Critérios atendidos: 27
- Critérios bloqueados por aceite externo: CA-28
- Bugs encontrados: 1 (corrigido)

CA-17 passou com a jornada por teclado e viewport de 320 px. CA-28 passou com o remetente Resend simulado, mas o envio e o recebimento reais em caixa controlada não foram executados; essa comprovação permanece como dependência explícita da tarefa 10.6.

## Critérios de aceitação verificados

| ID | Critério | Casos de teste | Status | Evidência |
|---|---|---|---|---|
| CA-01 | Login confirmado leva à consulta | TU-03, TI-10, E2E-01 | PASSOU | [E2E-01](evidences/qa-process-found.png) |
| CA-02 | Validação de entrada e recusa uniforme | TU-01, TU-03, TI-02, TI-10 | PASSOU | suítes frontend/backend |
| CA-03 | Consulta e processo protegidos | TU-06, TU-16, TI-11, TI-12, E2E-04 | PASSOU | E2E-04; testes HTTP diretos |
| CA-04 | Contas confirmadas acessam o mesmo processo | TI-14 | PASSOU | TI-14, executado na suíte backend |
| CA-05 | Campo vazio não inicia busca | TU-04, TI-13, E2E-03 | PASSOU | testes de entrada e E2E-03 |
| CA-06 | Estrutura CNJ inválida recusada | TU-04, TI-13, E2E-03 | PASSOU | testes de entrada e E2E-03 |
| CA-07 | CNJ pontuado e sem pontuação são equivalentes | TU-04, TU-12, TI-13, E2E-01/E2E-03 | PASSOU | testes CNJ e E2E-01 |
| CA-08 | Consulta exata sem cálculo de dígito verificador | TU-05, TI-13, E2E-03 | PASSOU | testes CNJ e TI-13 |
| CA-09 | Processo encontrado tem destino e ações corretos | TU-14, TI-14, E2E-01 | PASSOU | [processo encontrado](evidences/qa-process-found.png) |
| CA-10 | Processo ausente preserva a entrada e informa a base | TU-14, TI-13, E2E-03 | PASSOU | [estado sem resultado](evidences/qa-search-not-found.png) |
| CA-11 | Consulta pendente impede repetição | TU-12, E2E-03 | PASSOU | E2E-03 e teste de unidade |
| CA-12 | Falha/timeout permite nova tentativa e ignora resposta tardia | TU-13, TU-17, TI-16, E2E-03 | PASSOU | E2E-03 e testes de prazo |
| CA-13 | Sessão expira após oito horas e durante consulta não expõe dados | TU-06, TU-13, TI-12, E2E-04 | PASSOU | E2E-04 e testes de expiração |
| CA-14 | Logout revoga sessão e bloqueia retorno | TU-13, TU-17, TI-12, E2E-04 | PASSOU | E2E-04 |
| CA-15 | Destino direto/retorno preserva CNJ na mesma sessão | TU-14, TI-14, E2E-01/E2E-04 | PASSOU | E2E-01 e E2E-04 |
| CA-16 | Correção limpa o estado anterior | TU-12, E2E-03 | PASSOU | E2E-03 |
| CA-17 | Jornada por teclado e viewport 320 px | TU-15, E2E-05 | PASSOU | [tela móvel](evidences/qa-search-mobile.png) e E2E-05 |
| CA-18 | Processos e movimentações permanecem íntegros | TI-15 | PASSOU | TI-15 executado na suíte backend; snapshots íntegros |
| CA-19 | Qualidade, cobertura e fluxos críticos | TU-16, TI-11, TI-17, E2E-05 | PASSOU | lint, typecheck, testes, cobertura e builds abaixo |
| CA-20 | Cadastro solicita somente e-mail/senha, sem sessão | TU-09, TU-11, TI-01, E2E-01 | PASSOU | [cadastro](evidences/qa-registration.png), [pendência](evidences/qa-verification-pending.png) |
| CA-21 | Cadastro inválido não persiste nem envia | TU-01, TU-02, TU-11, TI-02 | PASSOU | suítes frontend/backend |
| CA-22 | Cadastro repetido preserva conta e senha | TU-01, TU-11, TI-03, TI-09 | PASSOU | integrações de unicidade e reenvio |
| CA-23 | Login de conta pendente é recusado | TU-03, TU-11, TI-10, E2E-01 | PASSOU | E2E-01 |
| CA-24 | Link válido confirma somente a conta associada | TU-08, TU-09, TI-04, TI-07, E2E-01 | PASSOU | E2E-01, confirmação em contexto separado |
| CA-25 | Link expirado, inválido ou consumido não confirma | TU-08, TI-05, TI-07, E2E-02 | PASSOU | E2E-02 |
| CA-26 | Reenvio aplica janela e limite móvel | TU-07, TU-11, TI-03, TI-06, TI-09, E2E-02 | PASSOU | E2E-02 e integrações |
| CA-27 | Falha/timeout de envio mantém conta pendente e permite recuperação | TU-10, TU-11, TU-13, TI-08, TI-16, E2E-02 | PASSOU | E2E-02 e testes com Resend simulado |
| CA-28 | E-mail de confirmação contém conteúdo e link corretos | TU-09, TU-16, TI-01, E2E-01 | BLOQUEADO | testes com remetente simulado passaram; falta envio/recebimento real pelo Resend |

## Testes E2E executados

| ID | Fluxo | Resultado | Observações |
|---|---|---|---|
| E2E-01 | Cadastro, confirmação em outro contexto, login, consulta e retorno | PASSOU | Jornada completa com remetente simulado. |
| E2E-02 | Link expirado, espera de reenvio e recuperação | PASSOU | Link antigo recusado e novo link confirmou a conta. |
| E2E-03 | CNJ inválido/ausente, falha, timeout e correção | PASSOU | Inclui regressão: no cenário ausente a 320 px, o valor não pode exceder a largura visível do campo. |
| E2E-04 | Rota protegida, expiração entre abas e saída | PASSOU | A API e a interface negaram acesso após expiração/logout. |
| E2E-05 | Jornada por teclado em viewport de 320 px | PASSOU | Fluxo concluído sem rolagem horizontal. |

## Testes automatizados e cobertura

| Camada | IDs | Resultado | Validação/comando | Observações |
|---|---|---|---|---|
| Unidade frontend | TU-01–TU-17 | PASSOU | `frontend/npm test` | 18 arquivos, 122 testes. |
| Unidade/integração backend | TU-01–TU-17, TI-01–TI-17 | PASSOU | `DATABASE_LABEL=dev_test_resolvvi_test NODE_ENV=test npm test` | 37 arquivos, 183 testes; PostgreSQL isolado e verificações HTTP executadas. |
| E2E | E2E-01–E2E-05 | PASSOU | `frontend/npm run test:e2e` | Playwright/Chromium; 5 testes, 41,7 s. |
| Frontend | — | PASSOU | `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build` em `frontend/` | Statements 95,21%; branches 90,52%; funções 97,11%; linhas 97,23%. |
| Backend | — | PASSOU | `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build` em `backend/` | Statements 85,89%; branches 81,25%; funções 88,43%; linhas 89,32%. |

Todos os quatro percentuais de cobertura superaram a meta mínima de 80% em ambos os aplicativos.

## Acessibilidade

- [x] Navegação por teclado com Tab e Enter verificada em E2E-05.
- [x] Rótulos e nomes acessíveis verificados nos formulários e nos seletores das jornadas.
- [x] Imagens: não há imagens de conteúdo nas telas cobertas; portanto, não há texto alternativo aplicável.
- [x] Contraste calculado a partir dos tokens usados: texto secundário sobre canvas 5,92:1; texto de erro sobre fundo de erro 9,52:1; texto branco sobre azul de ação 5,41:1.
- [x] Formulários têm rótulos associados, erros vinculados por `aria-describedby` e mensagens de estado anunciadas.
- [x] Mensagens de erro são textuais e indicam recuperação.
- [x] Texto de corpo e controles usam 16 px; rótulos permanecem identificáveis nas capturas de 320 px.
- [x] Sem rolagem horizontal da página a 320 px. Foi corrigido o corte dos últimos dígitos CNJ no campo: `scrollWidth/clientWidth` passou de 254/244 para 244/244.

## Bugs encontrados e corrigidos

| ID | Descrição | Severidade | Status | Correção | Teste de regressão | Evidência |
|---|---|---|---|---|---|---|
| BUG-01 | Em 320 px, o campo CNJ cortava o final do valor quando perdia foco após uma busca sem resultado. | Média | Corrigido | Reduzido o padding horizontal do campo em telas estreitas e preservado o espaçamento padrão a partir de `sm`. | E2E-03 agora exige `scrollWidth <= clientWidth`; antes da correção falhou com 254/244 e depois passou com 244/244. | [captura do estado sem resultado](evidences/qa-search-not-found.png) |

## Evidências visuais

- [Login — desktop](evidences/qa-login.png)
- [Cadastro — desktop](evidences/qa-registration.png)
- [Confirmação pendente — desktop](evidences/qa-verification-pending.png)
- [Consulta — viewport de 320 px](evidences/qa-search-mobile.png)
- [Processo ausente — viewport de 320 px](evidences/qa-search-not-found.png)
- [Processo encontrado](evidences/qa-process-found.png)

## Ambiente e limpeza

- API E2E: `127.0.0.1:3050`; coletor de confirmação simulado: `127.0.0.1:3051`; SPA: `127.0.0.1:5100`.
- Banco E2E: `dev_test_resolvvi_e2e_test`, separado das bases de desenvolvimento e integração. PostgreSQL já estava ativo antes da execução.
- O Playwright encerrou API, coletor e SPA. As portas 3050, 3051 e 5100 estavam livres ao final. O serviço PostgreSQL preexistente permaneceu ativo.
- A suíte inicial do frontend teve uma falha isolada no teste de login pendente; o caso passou isoladamente e em duas execuções completas posteriores. A suíte final passou integralmente.
- A primeira invocação de testes do backend sem variáveis de teste falhou por configuração ausente; a repetição com o banco isolado configurado passou integralmente.

## Conclusão

**BLOQUEADO para aprovação final.** As cinco jornadas automatizadas passaram, 27 critérios foram atendidos e o único defeito encontrado foi corrigido com teste de regressão. As suítes/builds dos dois aplicativos passaram acima da cobertura mínima. A aprovação depende do aceite de envio/recebimento real pelo Resend com caixa controlada (CA-28), conforme a tarefa 10.6.
