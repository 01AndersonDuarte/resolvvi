# Especificação técnica

## Resumo

Esta especificação descreve cadastro com e-mail e senha, sessões autenticadas e consulta CNJ sobre a base existente. O e-mail é validado pela forma sintática local e funciona como identificador; não há dependência de caixa postal ou serviço de mensagens.

## Arquitetura

```text
React SPA ── /api ── Express API ── serviços ── repositórios Prisma ── PostgreSQL
```

O frontend mantém estado de formulário e sessão. O backend é a autoridade para validação, hash de senha, identidade, sessão, autorização e busca. O proxy do Vite encaminha `/api` ao backend em desenvolvimento; em produção, a implantação encaminha o mesmo prefixo.

### Componentes principais

| Componente | Responsabilidade |
|---|---|
| `backend/src/config/http-environment-schema.ts` | Validar porta e origem pública do frontend. |
| `backend/src/schemas/auth-schema.ts` | Validar payloads de cadastro/login, formato de e-mail e senha. |
| `backend/src/services/security-service.ts` | Derivar/verificar senha e criar/digerir segredos de sessão. |
| `backend/src/services/auth-service.ts` | Criar conta, autenticar, consultar e revogar sessão. |
| `backend/src/repositories/auth-repository.ts` | Persistir usuários e sessões pelo Prisma. |
| `backend/src/routers/auth-router.ts` | Expor rotas de cadastro, login, sessão e saída. |
| `backend/src/routers/process-router.ts` | Proteger busca e leitura mínima do processo. |
| `frontend/src/hooks/useRegistration.ts` | Validar e enviar cadastro; levar ao login após sucesso. |
| `frontend/src/hooks/useLogin.ts` | Autenticar, concluir sessão e apresentar erros. |
| `frontend/src/contexts/AuthProvider.tsx` | Restaurar e invalidar estado de sessão na SPA. |
| `frontend/src/hooks/useProcessSearch.ts` | Controlar busca, prazo, erro e entrada CNJ. |
| `e2e/authentication-and-search.spec.ts` | Cobrir cadastro/login/consulta e expiração por jornada. |

## Modelo de dados

### `User`

| Campo | Tipo | Regra |
|---|---|---|
| `id` | UUID | Chave primária gerada pelo banco. |
| `email` | `VARCHAR(254)` | Único; normalizado para minúsculas e sem espaços externos. |
| `passwordHash` | string | Hash scrypt versionado, nunca a senha em texto claro. |
| `createdAt` | timestamptz | Preenchido pelo banco. |

### `Session`

| Campo | Tipo | Regra |
|---|---|---|
| `id` | UUID | Identificador público não autenticador. |
| `userId` | UUID | Referência a `User`, cascade em exclusão. |
| `tokenHash` | char(64) | Digest SHA-256 único do segredo aleatório do cookie. |
| `createdAt` | timestamptz | Instante de criação. |
| `expiresAt` | timestamptz | Validade absoluta de oito horas. |
| `revokedAt` | timestamptz ou null | Instante de revogação. |

Índices existentes cobrem `userId`, `expiresAt` e unicidade de `tokenHash`. Uma sessão válida precisa pertencer a um usuário, não estar revogada e ter `expiresAt > agora`.

## Validação e segurança

- Normalizar o e-mail com `trim().toLowerCase()` e validar com Joi, limite de 254 caracteres e sintaxe de endereço sem consulta externa. Não reescrever aliases nem consultar DNS.
- Senha entre 8 e 128 pontos de código Unicode; sem trim, normalização ou truncamento.
- Derivar com scrypt assíncrono, salt aleatório de 16 bytes, chave de 64 bytes, parâmetros versionados `N=131072`, `r=8`, `p=1` e comparação em tempo constante. Fila limitada evita saturação sem bloquear o event loop.
- Para conta ausente no login, verificar hash fictício e retornar o mesmo erro de credenciais.
- Segredo de sessão aleatório de 32 bytes em base64url. Persistir apenas SHA-256 e enviar o segredo somente em cookie.
- Produção exige HTTPS e cookie `__Host-session` com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e sem `Domain`. Desenvolvimento HTTP usa `session` sem `Secure`.
- POST exige JSON e origem igual a `PUBLIC_APP_URL`; respostas de autenticação e busca usam `Cache-Control: no-store`.
- Logs não registram credenciais, cookies, corpos, e-mail, CNJ ou segredos.

## Contratos HTTP

Todas as rotas ficam sob `/api`. POST exige `Origin` válido.

| Método | Rota | Entrada | Resposta |
|---|---|---|---|
| POST | `/auth/register` | `{ "email": string, "password": string }` | 201 e `{ "message": string }`; não cria sessão. |
| POST | `/auth/login` | `{ "email": string, "password": string }` | 200 e dados públicos da sessão; segredo apenas no cookie. |
| GET | `/auth/session` | Cookie de sessão | 200 e `{ sessionId, expiresAt, serverTime }`. |
| POST | `/auth/logout` | Cookie de sessão | 204 após revogação e limpeza do cookie. |
| POST | `/processes/search` | `{ "cnj": string }` | Processo mínimo encontrado, erro de validação ou ausência. |
| GET | `/processes/:id` | ID inteiro positivo e cookie | Dados mínimos conforme contrato do domínio. |
| GET | `/health` | — | Status de liveness da API. |

### Erros públicos

| Código | HTTP | Uso |
|---|---:|---|
| `INVALID_INPUT` | 400 | E-mail, senha, CNJ ou payload inválido; campo indicado quando aplicável. |
| `CNJ_REQUIRED` | 400 | Número CNJ ausente. |
| `CNJ_FORMAT_INVALID` | 400 | Estrutura CNJ inválida. |
| `PROCESS_NOT_FOUND` | 404 | Nenhum CNJ exato na base. |
| `INVALID_CREDENTIALS` | 401 | E-mail inexistente ou senha incorreta, resposta indistinguível. |
| `ACCOUNT_ALREADY_EXISTS` | 409 | E-mail já utilizado; o cadastro duplicado nunca muda a senha. |
| `SESSION_INVALID` | 401 | Sessão ausente, inválida, expirada ou revogada. |
| `SERVICE_UNAVAILABLE` | 503 | Falha recuperável de infraestrutura. |

Erros têm formato `{ "error": { "code", "message", "field", "retryAfterSeconds" } }`; campos opcionais usam `null`. Não incluir detalhes internos.

### Fluxo de cadastro

1. `parseRegistrationInput` rejeita campos ausentes, tipos incorretos e propriedades extras.
2. `register` normaliza e valida e-mail e senha.
3. Consulta existência pelo e-mail normalizado; se existir, retorna `ACCOUNT_ALREADY_EXISTS` sem derivar ou alterar a senha.
4. Deriva a senha e cria `User`. A restrição única do banco protege a corrida concorrente; conflito P2002 também retorna conta existente.
5. Responde 201 sem cookie. O frontend navega a `/entrar`, envia o e-mail via `location.state` e anuncia sucesso.

### Fluxo de sessão

1. Login valida credenciais e verifica o hash com scrypt.
2. Gera novo segredo, armazena seu digest e revoga atomicamente a sessão anterior válida enviada pelo mesmo cookie.
3. Define cookie HTTP-only com duração limitada ao vencimento absoluto de oito horas.
4. Middleware consulta e valida a sessão no banco em cada rota protegida; falha retorna `SESSION_INVALID`.
5. Logout revoga a sessão e limpa o cookie somente após concluir a operação.

## Rotas do frontend

- `/entrar`: login com valores iniciais recebidos via estado de navegação.
- `/criar-conta`: cadastro com e-mail e senha.
- `/consulta`: busca CNJ protegida.
- `/processos/:id`: destino mínimo protegido.
- Qualquer outra rota redireciona para consulta se a sessão estiver ativa, caso contrário para login.

Após cadastro bem-sucedido, `useRegistration` navega a `/entrar` com `{ email, registrationCompleted: true }`. A senha não é carregada para a tela seguinte; a pessoa a informa novamente.

## Testes

- **Unitários:** formato/normalização do e-mail; limites e preservação da senha; cadastro aceito/inválido/duplicado; hash e verificação; login válido/inválido; criação, expiração e revogação de sessão; validação CNJ e respostas.
- **Integração:** persistência e unicidade de usuário; concorrência de registro; contrato das rotas, cookie, autorização, consulta exata e preservação da base.
- **E2E:** cadastro com e-mail sintético, redirecionamento com e-mail preenchido, login com senha, duplicidade sem troca de senha, busca/retorno e expiração de sessão.
- Integrações usam PostgreSQL isolado com `NODE_ENV=test`, `DATABASE_LABEL` e banco terminados em `_test`. E2E usa o harness de controle para expiração de sessão e fixtures controladas.
- Executar testes e cobertura dos aplicativos afetados; mínimo exigido de 80% por aplicativo. Frontend: lint, typecheck, testes e build. Backend: lint, typecheck, testes, cobertura e build.

## Operação e migrações

`PUBLIC_APP_URL` deve ser uma origem HTTP(S), sem caminho, credenciais, query ou fragmento; em produção deve usar HTTPS. Configuração HTTP não depende de credenciais de terceiros. A migration de autenticação preserva usuários, hashes e sessões existentes, removendo somente os campos/tabela que deixaram de fazer parte do modelo.

O teste e o seed usam os scripts locais de cada aplicativo. Não há dependência de conta externa, serviço de envio ou rede para cadastro e autenticação.
