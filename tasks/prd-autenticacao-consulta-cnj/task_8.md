# Tarefa 8.0: Telas de cadastro e login

## Visão geral

Conectar cadastro e login do frontend à API. Manter e-mail e senha nos dois formulários. Quando o cadastro for aceito, abrir login com o e-mail preenchido e pedir que a pessoa informe a senha.

## Subtarefas

- [x] 8.1 Implementar as telas e rotas `/criar-conta` e `/entrar`.
- [x] 8.2 Integrar os formulários à API e preservar a senha sem trim ou normalização.
- [x] 8.3 Após sucesso, navegar ao login com e-mail preenchido e mensagem clara.
- [x] 8.4 Apresentar erros de campo, conta existente e falha recuperável.
- [x] 8.5 Cobrir fluxos de cadastro/login e navegação com testes automatizados.

## Critérios de aceitação relacionados

- CA-01–CA-06 do PRD: cadastro, validação, duplicidade, encaminhamento ao login e autenticação.

## Arquivos relevantes

- `frontend/src/App.tsx`
- `frontend/src/services/auth-service.ts`
- `frontend/src/hooks/useRegistration.ts`
- `frontend/src/hooks/useLogin.ts`
- `frontend/src/services/auth-navigation.ts`
- `frontend/src/views/SignUpView.tsx`
- `frontend/src/views/LoginView.tsx`
- `frontend/src/views/auth-views.test.tsx`
