# Tarefa 3.0: Cadastro de conta com e-mail e senha

## Visão geral

Implementar o cadastro público usando o e-mail apenas como identificador sintático único e mantendo a senha como credencial. Cadastro aceito cria uma conta imediatamente utilizável, não abre sessão e encaminha a pessoa ao login com o e-mail preenchido.

## Subtarefas

- [x] 3.1 Expor `POST /api/auth/register` com schema, controller e serviço para e-mail e senha.
- [x] 3.2 Normalizar e validar e-mail localmente, sem consultar existência do endereço.
- [x] 3.3 Derivar senha com o serviço de segurança existente e persistir somente o hash.
- [x] 3.4 Preservar unicidade e senha existente quando há e-mail duplicado, incluindo corrida de criação.
- [x] 3.5 Cobrir cadastro aceito, formato inválido, senha inválida, duplicidade e persistência com testes.

## Critérios de aceitação

- CA-01: cadastro válido cria conta sem criar sessão.
- CA-02: e-mail sintético em formato válido é aceito.
- CA-03: payload inválido não cria conta.
- CA-04: duplicidade não cria conta nova nem altera a senha original.

## Evidências de conclusão

- Testes unitários cobrem normalização, senha, duplicidade e falha de persistência.
- Testes de integração cobrem unicidade no PostgreSQL isolado.
- Teste E2E cobre duplicidade e autenticação posterior com a senha original.

## Arquivos relevantes

- `backend/src/schemas/auth-schema.ts`
- `backend/src/services/auth-service.ts`
- `backend/src/repositories/auth-repository.ts`
- `backend/prisma/schema.prisma`
- `frontend/src/hooks/useRegistration.ts`
- `frontend/src/views/SignUpView.tsx`
