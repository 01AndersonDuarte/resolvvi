# Relatório de QA — Autenticação e consulta CNJ

## Escopo verificado

Cadastro com e-mail sintaticamente válido e senha, encaminhamento ao login com e-mail preenchido, preservação de senha em cadastro duplicado, autenticação, sessões e consulta CNJ protegida.

## Critérios de aceitação

| Critério | Resultado | Evidência |
|---|---|---|
| CA-01–CA-03 — cadastro, e-mail sintético e validação | PASSOU | Testes de serviço e rotas; E2E-01. |
| CA-04 — cadastro duplicado não troca senha | PASSOU | Teste unitário; E2E-02 autentica com a senha original após a duplicidade. |
| CA-05 — login recebe e-mail preenchido após cadastro | PASSOU | Teste `auth-views`; E2E-01. |
| CA-06–CA-08 — login, sessão e saída | PASSOU | Testes unitários/de integração; E2E-04. |
| CA-09–CA-13 — autorização, busca, retorno e integridade | PASSOU | Testes de integração; E2E-01, E2E-03 e E2E-04. |
| CA-14–CA-15 — qualidade e segurança | PASSOU | Builds, lint, typecheck, testes e cobertura acima do mínimo. |

## Testes automatizados

- Backend: 31 arquivos, 130 testes aprovados. Cobertura: 86,41% de statements, 83,49% de branches, 85,51% de funções e 89,13% de linhas.
- Frontend: 15 arquivos, 100 testes aprovados. Cobertura: 92,69% de statements, 89,81% de branches, 94,73% de funções e 95,13% de linhas.
- E2E Playwright: cinco jornadas aprovadas — cadastro/login/consulta, e-mail sintético e duplicidade, validação e falhas de consulta, expiração/saída e jornada por teclado em viewport estreita.
- Backend e frontend: lint, typecheck e builds de produção aprovados.
- Migration aplicada nos bancos isolados `dev_test_resolvvi_test_template` e `dev_test_resolvvi_e2e_test`; a fixture E2E de 100 processos foi preservada.

## Ambiente e limpeza

Playwright iniciou API, SPA e endpoint de controle nas portas 3050, 5100 e 3051. Todos foram encerrados pela execução da suíte. Os serviços pré-existentes nas portas 3000, 5173 e PostgreSQL foram mantidos.

## Conclusão

APROVADO. Os fluxos testados correspondem ao cadastro com e-mail usado como identificador sintático e senha, seguido de login explícito.
