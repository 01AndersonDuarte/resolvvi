# Especificação técnica

## Resumo

Esta especificação atende ao [PRD de autenticação e consulta CNJ](./prd.md), especialmente RF1–RF23 e CA-01–CA-28. A solução acrescenta uma API Express 5 ao backend existente e cria um frontend React 19 com TypeScript, Vite e Tailwind. Contas, confirmações e sessões revogáveis ficam no PostgreSQL via Prisma 7. O envio de confirmação usa a API do Resend; a consulta reutiliza o repositório de processos, com resposta restrita ao identificador e ao CNJ formatado.

Exploração realizada em 03/10/2026: há persistência, seed, configuração e testes no backend; não há frontend, servidor HTTP, autenticação nem validador reutilizável de CNJ. O usuário confirmou a publicação sob uma mesma origem HTTPS, com cookie HttpOnly e revogação no PostgreSQL, e a disponibilização do validador como pré-requisito da fundação. **A integração real da consulta depende desse validador; este documento define seu contrato esperado, mas não declara a dependência resolvida nem inclui sua implementação.** Mantêm-se as premissas P1–P7 do PRD. Os objetivos, o escopo e as métricas de aceitação permanecem definidos no PRD.

## Arquitetura do sistema

### Visão dos componentes

Fluxo principal: navegador → API de autenticação → serviços → repositórios → PostgreSQL. Após confirmação e login: navegador → middleware de sessão → validação CNJ → serviço de consulta → repositório existente → resposta mínima. O serviço de confirmação chama o Resend somente após concluir a transação local de emissão do link.

| Componente e localização | Situação | Responsabilidade e relações |
| --- | --- | --- |
| `backend/src/app.ts`, `server.ts` | Novos | Compor Express sem `listen` em `app.ts`; iniciar HTTP e desligamento em `server.ts`. Injetar dependências na composição para permitir testes. |
| `backend/src/config/envs.ts`, `environment-schema.ts`, `protocols.ts` | Modificados | Preservar configuração da fundação e acrescentar opções HTTP tipadas. Ler ambiente somente na configuração. |
| `backend/src/config/http-environment.ts`, `http-environment-schema.ts` | Novos | Validar opções obrigatórias de HTTP e Resend antes de abrir o servidor, sem exigir credenciais de envio de migrations ou seed. |
| `backend/src/config/database.ts`, `database-client.ts` | Reutilizados | Singleton Prisma e factory do adaptador PostgreSQL existentes. |
| `backend/src/config/logger.ts`, `sanitize-log-context.ts` | Modificados | Registrar eventos HTTP por lista permitida de campos; proteger cookies, e-mail, CNJ e material de confirmação. |
| `backend/src/routers/{auth,process,health}-router.ts` | Novos | Registrar os nove endpoints especificados abaixo. |
| `backend/src/middlewares/` | Novos | `session-middleware.ts`, `origin-middleware.ts`, `validation-middleware.ts`, `error-middleware.ts`, `request-context-middleware.ts`: sessão, origem, schemas, erros e prazo/correlação. |
| `backend/src/controllers/` | Novos | `registration-controller.ts`, `verification-controller.ts`, `session-controller.ts`, `process-controller.ts`, `health-controller.ts`; extrair entrada, chamar serviço e responder. |
| `backend/src/schemas/` | Novos | Schemas Joi de cadastro, login, confirmação, reenvio, CNJ e ID de processo, rejeitando campos desconhecidos e coerção de tipos. |
| `backend/src/services/` | Novos | `registration-service.ts`, `verification-service.ts`, `session-service.ts`, `process-query-service.ts`; regras de conta, limites, sessão e busca. |
| `backend/src/services/password-service.ts`, `token-service.ts` | Novos | Hash assíncrono de senha; geração aleatória e digest de segredos. |
| `backend/src/services/resend-service.ts`, `verification-email.ts` | Novos | Adaptador de envio HTTPS e composição de HTML/texto; não dependem de Express nem acessam banco. |
| `backend/src/services/cnj-input-service.ts` | Novo adaptador | Validar entrada estrutural, consumir o validador da fundação e produzir a máscara usada na persistência. O algoritmo verificador não pertence a este adaptador. |
| `backend/src/repositories/{user,session,verification}-repository.ts` | Novos | Acesso a contas/sessões/emissões e operações transacionais coesas; único ponto de acesso ao banco. |
| `backend/src/repositories/process-repository.ts` | Modificado | Preservar `create`/`findByCnj`; acrescentar `findSummaryById`, projetando apenas `id`/`cnj`. |
| `backend/src/errors/`, `protocols.ts` | Modificados | Factories de erros `Error` com nome e metadados públicos tipados; contratos derivados dos modelos quando aplicável. Dividir contratos em módulos coesos caso atinjam 100 linhas. |
| `backend/prisma/schema.prisma`, `prisma/migrations/` | Adição | Criar `User`, `Session` e `EmailVerification`; não alterar modelos ou registros de processos/movimentações. |
| `frontend/src/App.tsx`, `main.tsx`, `index.css` | Novos | Compor rotas, provedor de sessão e estilos Tailwind. |
| `frontend/src/views/` | Novas | `LoginView`, `SignUpView`, `VerificationPendingView`, `EmailVerificationView`, `ResendVerificationView`, `ProcessSearchView`, `ProcessFoundView`. |
| `frontend/src/components/` | Novos | `AuthProvider`, `ProtectedRoute`, `FormField`, `AsyncMessage`, `PageHeading`, `LogoutButton`; composição em componentes pequenos. |
| `frontend/src/hooks/` | Novos | `useSession`, `useRegistration`, `useVerification`, `useLogin`, `useProcessSearch`, `useProcessDetails`, `useRequest`: estado, cancelamento, prazos e descarte de respostas antigas. |
| `frontend/src/services/`, `types/` | Novos | Cliente HTTP, serviços auth/process e contratos de resposta/erro, um tipo por arquivo. |
| Manifests, configs, exemplos de ambiente e READMEs por aplicativo | Novos/modificados | Dependências, scripts, configuração reproduzível, execução e aceite. |
| `frontend/playwright.config.ts`, `e2e/*.spec.ts`, `e2e/support/` | Novos | Orquestração da jornada com backend real, banco isolado e Resend simulado. Dependências E2E no frontend; sem manifest na raiz. |

O frontend publicado acessa caminhos relativos `/api`; o proxy da implantação encaminha essas rotas ao backend e serve o fallback da SPA para navegação direta. Em desenvolvimento, Vite em `5173` encaminha `/api` ao backend em `3000`, com alvo configurável. Essa capacidade é documentada pelo [Vite](https://vite.dev/config/server-options#server-proxy). `GET /health` fica disponível diretamente no backend. Nenhuma consulta processual chama o Resend ou outra fonte externa.

## Design de implementação

### Principais interfaces

Exemplos de contratos, sem implementação:

```ts
interface AuthenticationService {
  register(input: CredentialsInput): Promise<MessageResponse>;
  login(input: CredentialsInput): Promise<SessionGrant>;
  getSession(secret: string): Promise<SessionContext>;
  logout(secret: string | null): Promise<void>;
}

interface VerificationService {
  confirm(input: ConfirmationInput): Promise<MessageResponse>;
  resend(input: EmailInput): Promise<MessageResponse>;
}
```

```ts
interface ProcessQueryService {
  search(input: CnjInput): Promise<ProcessSummary>;
  getById(id: number): Promise<ProcessSummary>;
}

interface CnjValidator {
  validate(digits: string): boolean;
}

interface VerificationSender {
  send(input: VerificationEmailInput): Promise<DeliveryResult>;
}
```

`CnjValidator` é a porta a conectar ao módulo da fundação ainda não localizado: recebe exatamente 20 dígitos textuais e verifica o dígito pelo contrato RN3. Ausência do adaptador deve impedir a disponibilização da consulta; jamais usar uma implementação que retorne sempre verdadeiro. O frontend antecipa apenas obrigatoriedade/formato e exibe a reprovação semântica recebida do backend, evitando duplicar o algoritmo.

**Entrada CNJ e busca.** Primeiro autorizar; depois remover espaços externos e aceitar exclusivamente 20 dígitos ASCII ou a máscara completa `NNNNNNN-DD.AAAA.J.TR.OOOO`. Distinguir vazio, formato e dígito inválido. Remover apenas a pontuação já validada; nunca usar limpeza genérica de caracteres. Depois do validador, reconstruir a máscara e chamar `findByCnj`. Não converter CNJ para `number`. A referência de domínio é a [Resolução CNJ nº 65](https://atos.cnj.jus.br/atos/detalhar/119), especialmente seu Anexo VIII. A busca não modifica dados nem consulta movimentações.

**Cadastro e concorrência.** Normalizar e-mail com remoção de espaços externos e conversão para minúsculas, sem regras específicas de Gmail ou alteração de pontos/aliases. Validar formato com Joi, domínio sem consulta DNS e limite técnico de 254 caracteres. Contar a senha em pontos de código Unicode, entre 8 e 128, sem normalização, remoção de espaços ou truncamento; rejeitar sequências Unicode inválidas. O login preserva o mesmo conteúdo. Criar usuário com índice único no e-mail normalizado; em conflito de unicidade, reler a conta e preservar senha/confirmação. Persistir conta antes da tentativa de emissão. Conta existente pendente segue a mesma emissão e os mesmos limites; conta confirmada retorna mensagem comum, sem envio.

**Senhas e segredos.** Usar `node:crypto` com `scrypt` assíncrono, salt aleatório de 16 bytes, chave de 64 bytes, parâmetros versionados `N=131072`, `r=8`, `p=1`, `maxmem=256 MiB`, e comparação em tempo constante. A escolha usa uma API disponível no Node 24 e parâmetros de referência de [armazenamento de senhas da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Limitar o trabalho a duas derivações simultâneas por processo, fila máxima de 16 e prazo total da requisição; saturação retorna indisponibilidade. Não bloquear o event loop: a [API assíncrona do Node](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback) executa a derivação fora dele. E-mail desconhecido verifica um hash fictício com os mesmos parâmetros antes da resposta comum. Sessão e confirmação usam segredos independentes de 32 bytes aleatórios em base64url; persistir somente SHA-256 de cada segredo. Não usar SHA-256 para senhas.

**Emissão e confirmação atômicas.** A emissão executa uma transação curta `Serializable`: reler a conta; se pendente, contar emissões no intervalo móvel `(agora − 1 hora, agora]`, verificar o intervalo de 60 segundos, invalidar links anteriores e inserir `EmailVerification`. O relógio usado para decisões transacionais é o do banco; testes controlam os instantes de emissão. Toda emissão reservada conta, inclusive falha, timeout e queda antes de chamar o provedor. Pedidos recusados pelo limite não consomem outra emissão. O tempo de espera é o maior entre o restante dos 60 segundos e o tempo até sair da janela a emissão que libera uma vaga.

A confirmação busca pelo digest e, na mesma transação, exige conta pendente, link não consumido/substituído e `agora < expiresAt`; atualiza `emailVerifiedAt` e `consumedAt` conjuntamente. Confirmações concorrentes permitem exatamente um sucesso. Confirmar e reenviar disputam a mesma sequência transacional: se a confirmação vencer, o reenvio não emite; se o reenvio vencer, o link antigo é inválido. Conflitos `P2034` permitem até duas novas tentativas dentro do prazo restante, sempre antes de qualquer envio externo. Ao esgotar, responder indisponibilidade. Transações e isolamento estão disponíveis no [Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions) e nos tipos gerados locais.

O Resend é chamado após o commit. Uma falha não restaura links antigos nem desfaz a conta. Queda após reservar a emissão resulta em estado desconhecido e recuperação por reenvio após o intervalo. Não há fila/outbox ou reenvio automático nesta etapa. Repetir cadastro não é uma substituição de credenciais; reenvio permitido é uma nova emissão, com novo token e nova chave de idempotência.

**Sessão e autorização.** Login verifica primeiro a senha e só então o estado de confirmação. Criar uma sessão com vencimento absoluto de oito horas, sem renovação; emitir cookie `__Host-session` em HTTPS com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sem `Domain`, e `Max-Age` limitado ao tempo restante. No desenvolvimento HTTP local usar `session`, sem `Secure`; essa exceção é proibida em produção. Os atributos seguem o contrato de [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie). Nunca enviar o segredo no JSON ou armazená-lo em Web Storage. Consultar sessão e confirmação no banco em toda chamada protegida; não manter cache de autorização. Revalidar antes de serializar o resultado se houve espera pela busca. O ID público da sessão não autentica.

Logout revoga a sessão no banco antes de responder `204`, expira o cookie e é idempotente. Na interface, a intenção de saída imediatamente aborta consultas, oculta dados e invalida a geração local. Em falha de rede/banco, não afirmar revogação concluída: mostrar `Não foi possível concluir a saída. Tente novamente.`, manter somente a tela pública com ação para concluir a saída e não restaurar conteúdo autenticado automaticamente. Persistir apenas um marcador de saída pendente, sem credenciais; na próxima inicialização, concluir a revogação antes de consultar a sessão. É impossível garantir revogação remota durante uma interrupção total de conexão; `CA-14` exige verificar o sucesso remoto e o comportamento de recuperação, não somente apagar estado visual.

**Proteção HTTP.** Todos os POST exigem JSON e `Origin` igual à origem pública configurada; recusar origem ausente, `null` ou divergente. Clientes de teste diretos fornecem esse cabeçalho. Não oferecer CORS com origem curinga; habilitar somente a origem configurada se necessário ao ambiente local. Essa verificação também protege login/logout/confirmação contra requisições induzidas por outro site. Corpo máximo de 8 KiB; métodos de leitura não alteram estado. Respostas auth/process usam `Cache-Control: no-store`; respostas e página de confirmação usam `Referrer-Policy: no-referrer`. Produção usa HTTPS, sem conteúdo ativo de terceiros nas páginas públicas/protegidas.

**Link e frontend.** O e-mail aponta a `PUBLIC_APP_URL/confirmar-email#token=...`. A SPA lê o fragmento para memória e o remove com `history.replaceState` antes de chamadas externas. Uma ação explícita `Confirmar e-mail` envia o token por POST, evitando consumo por pré-visualizações de e-mail ou efeitos repetidos do React. O link funciona em outro navegador; token inválido não revela destinatário. Reenvio permite informar e-mail. Nenhuma confirmação abre sessão automaticamente.

Rotas: `/entrar`, `/criar-conta`, `/confirmacao-pendente`, `/confirmar-email`, `/reenviar-confirmacao`, `/consulta` e `/processos/:id`. `/` resolve para consulta apenas após a checagem de sessão; caso contrário, login. Usar React Router em modo declarativo, conforme sua [documentação](https://reactrouter.com/start/declarative/installation). `ProtectedRoute` permanece em estado de verificação sem renderizar dados; a autorização definitiva é do backend. ID malformado recebe o estado de destino indisponível após verificar a sessão.

Estado de sessão: verificando, autenticada, anônima ou saída pendente. `useRequest` associa cada tentativa a um identificador e à geração da sessão; resposta só produz efeito se ambos ainda forem atuais e o prazo não expirou. `AbortController` e prazo de 15 segundos liberam os controles; abortar não implica rollback no servidor. O relógio da UI usa duração restante calculada com `serverTime`/`expiresAt`, sem depender exclusivamente do relógio civil do dispositivo. Expiração, `401`, saída, troca de sessão ou desmontagem descartam respostas tardias. Falha de cadastro/envio com resultado desconhecido conserva e-mail e oferece conferir a caixa, entrar ou reenviar.

`AuthProvider` mantém o último CNJ em memória e em `sessionStorage` associado ao ID público da sessão, somente após sessão validada. Não restaura esse valor antes da checagem; limpa ao sair, expirar ou trocar de sessão. Assim, retorno e recarga preservam a entrada na mesma aba/sessão. Um `BroadcastChannel` propaga somente eventos de saída/invalidação entre abas. Em `pageshow`, inclusive retorno do bfcache, e ao recuperar visibilidade, ocultar conteúdo e revalidar a sessão; antes de `pagehide`, retirar dados protegidos da apresentação. Não guardar resultados no histórico de navegação nem criar service worker de cache.

Formulários semânticos, rótulos permanentes, `autocomplete` apropriado, senha protegida, mensagens por `aria-describedby`/`aria-live`, foco no primeiro erro e título da nova página. A busca bloqueia campo e submissão durante carregamento; demais formulários impedem duplicidade e preservam e-mail. Toda tela deve funcionar a 320 px e zoom de 200%. As mensagens de produto são as da tabela de estados do PRD; códigos internos não aparecem na interface.

### Modelos de dados

Datas HTTP são ISO 8601 UTC; datas persistidas novas usam `timestamptz`. Campos anuláveis são representados por `null`. Os exemplos abaixo são ilustrativos e não contêm segredos utilizáveis.

#### `CredentialsInput` — cadastro e login

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `email` | string | sim | Validado e normalizado como descrito acima. |
| `password` | string | sim | 8–128 pontos de código no cadastro; login exige presença e respeita limite máximo, preservando conteúdo. |

Exemplo: `{"email":"pessoa@example.com","password":"senha fictícia 123"}`.

#### `EmailInput` — reenvio

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `email` | string | sim | Mesma identidade/validação de e-mail do cadastro. |

Exemplo: `{"email":"pessoa@example.com"}`.

#### `ConfirmationInput` — consumo do link

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `token` | string | sim | Base64url canônico de 32 bytes; sem coerção ou trim. |

Exemplo ilustrativo: `{"token":"<segredo recebido exclusivamente no e-mail>"}`. Formato malformado usa a mesma resposta de link inválido, sem consultar destinatários.

#### `CnjInput` — entrada da consulta

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `cnj` | string | sim | Entrada original; somente espaços externos são desconsiderados. |

Exemplo: `{"cnj":"1001399-31.2023.8.26.0070"}`.

#### `ProcessIdInput` — identificação do destino

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string de rota | sim | Inteiro decimal positivo até o limite de `Int` do PostgreSQL; rejeitar fração, sinal, sufixo e overflow. |

Exemplo: `{"id":"1"}`, sem prometer o ID da carga.

#### `ProcessSummary` — único payload processual

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | number inteiro | sim | ID persistido, usado em `/processos/:id`. |
| `cnj` | string | sim | CNJ completo na máscara canônica, pronto para exibição. |

Exemplo: `{"id":1,"cnj":"1001399-31.2023.8.26.0070"}`. Não retornar partes, fórum, valor ou movimentos. `null` do repositório vira `404`, não um objeto processual vazio.

#### `SessionResponse` — sessão pública

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `sessionId` | UUID string | sim | Identidade pública para vincular estado local; não é credencial. |
| `expiresAt` | ISO UTC | sim | Limite absoluto, fixado no login. |
| `serverTime` | ISO UTC | sim | Referência para calcular o tempo restante. |

Exemplo: `{"sessionId":"ce88692c-56ca-4e2e-a138-93ddf27aa081","expiresAt":"2026-10-04T04:00:00.000Z","serverTime":"2026-10-03T20:00:00.000Z"}`. `SessionContext` interno inclui também `userId` e o estado confirmado; `SessionGrant` interno agrega o segredo transitório para o controller emitir o cookie, sem serializá-lo no corpo.

#### `MessageResponse` — respostas públicas de autenticação

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `message` | string | sim | Texto de cadastro, reenvio ou confirmação definido pelo PRD. |

Exemplo cadastro: `{"message":"Confira seu e-mail para continuar. Se já possui conta confirmada, entre."}`.

Variante reenvio: `{"message":"Se houver confirmação pendente para este e-mail, enviaremos as instruções."}`.

Variante confirmação: `{"message":"E-mail confirmado. Agora você pode entrar."}`.

#### `ApiError` — envelope de erro

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `error.code` | string enumerada | sim | Código estável abaixo. |
| `error.message` | string | sim | Mensagem pública PT-BR; não contém erro original. |
| `error.field` | `email`, `password`, `cnj` ou null | sim | Campo ao qual associar feedback. |
| `error.retryAfterSeconds` | inteiro positivo ou null | sim | Espera mínima conhecida; acompanha `Retry-After` em 429. |

| Código | HTTP | Significado |
| --- | --- | --- |
| `INVALID_INPUT` | 400 | Campos, tipo ou JSON inválidos; mensagem específica para e-mail/senha quando pertinente. |
| `CNJ_REQUIRED` | 400 | `Informe o número do processo.` |
| `CNJ_FORMAT_INVALID` | 400 | `Confira o formato: digite os 20 números do processo, com ou sem pontos e traço.` |
| `CNJ_INVALID` | 422 | `Esse número de processo não é válido. Confira os números e tente novamente.` |
| `INVALID_CREDENTIALS` | 401 | Mensagem única de RF2; não invalida outra sessão por si só. |
| `SESSION_INVALID` | 401 | Sessão ausente, expirada, revogada ou conta sem confirmação; mesma resposta em rotas protegidas. |
| `EMAIL_UNCONFIRMED` | 403 | Credenciais corretas com conta pendente; `Confirme seu e-mail para entrar.` |
| `ORIGIN_FORBIDDEN` | 403 | Origem não permitida. |
| `PROCESS_NOT_FOUND` | 404 | Mensagem de RF14; no destino a UI usa a variante curta do PRD. |
| `VERIFICATION_INVALID` | 400 | Mensagem comum de link inválido/expirado/substituído/consumido. |
| `VERIFICATION_RATE_LIMITED` | 429 | `Aguarde para solicitar outro e-mail.` com tempo restante. |
| `CONFIRMATION_SEND_FAILED` | 502 | Conta preservada; `Não foi possível enviar a confirmação agora. Tente reenviar.` |
| `CONFIRMATION_SEND_UNKNOWN` | 504 | `Não foi possível confirmar o envio. Confira seu e-mail; se a mensagem não chegar, tente reenviar.` |
| `SERVICE_UNAVAILABLE` | 503 | Banco/configuração operacional indisponível ou saturação; mensagem contextual segura. |
| `REQUEST_TIMEOUT` | 504 | Prazo de processamento excedido; resultado da mutação pode ser desconhecido. |
| `PAYLOAD_TOO_LARGE` | 413 | Corpo acima do limite. |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | POST sem JSON. |
| `INTERNAL_ERROR` | 500 | Falha inesperada, sem stack ou detalhes. |

Exemplo: `{"error":{"code":"VERIFICATION_RATE_LIMITED","message":"Aguarde para solicitar outro e-mail.","field":null,"retryAfterSeconds":42}}`.

Variante sem espera: `{"error":{"code":"CNJ_REQUIRED","message":"Informe o número do processo.","field":"cnj","retryAfterSeconds":null}}`.

#### `User` — conta persistida

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | UUID | sim | Chave primária gerada pela aplicação. |
| `email` | varchar(254) | sim | Identidade normalizada, índice único. |
| `passwordHash` | text | sim | Formato versionado contendo algoritmo, parâmetros, salt e derivação. |
| `emailVerifiedAt` | timestamp ou null | sim | Ausência significa pendente; só confirmação válida preenche. |
| `createdAt` | timestamp | sim | Instante de criação. |

Exemplo: `{"id":"855fdc47-5975-41d6-9c0d-1dd3e69a50e1","email":"pessoa@example.com","passwordHash":"<scrypt versionado>","emailVerifiedAt":null,"createdAt":"2026-10-03T20:00:00.000Z"}`.

#### `Session` — sessão revogável persistida

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | UUID | sim | Chave primária pública, diferente do segredo. |
| `userId` | UUID FK | sim | Relação com `User`; exclusão em cascata somente entre entidades de autenticação. |
| `tokenHash` | char(64) | sim | SHA-256 hexadecimal único. |
| `createdAt` | timestamp | sim | Autenticação efetiva. |
| `expiresAt` | timestamp | sim | `createdAt` mais oito horas. |
| `revokedAt` | timestamp ou null | sim | Preenchido por logout. |

Exemplo: `{"id":"ce88692c-56ca-4e2e-a138-93ddf27aa081","userId":"855fdc47-5975-41d6-9c0d-1dd3e69a50e1","tokenHash":"<digest de 64 caracteres>","createdAt":"2026-10-03T20:00:00.000Z","expiresAt":"2026-10-04T04:00:00.000Z","revokedAt":null}`. Índices em `userId` e `expiresAt`, além da unicidade do digest.

#### `EmailVerification` — link e reserva de envio persistidos

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | UUID | sim | Chave primária e base da chave de idempotência do envio. |
| `userId` | UUID FK | sim | Conta destinatária; relação com `User`. |
| `tokenHash` | char(64) | sim | Digest único; segredo somente em memória durante emissão/envio. |
| `issuedAt` | timestamp | sim | Reserva da emissão e referência dos limites. |
| `expiresAt` | timestamp | sim | `issuedAt` mais 24 horas. |
| `consumedAt` | timestamp ou null | sim | Confirmação atômica concluída. |
| `invalidatedAt` | timestamp ou null | sim | Substituição por nova emissão. |
| `deliveryStatus` | enum | sim | `UNKNOWN`, `ACCEPTED` ou `FAILED`; nunca indica conta confirmada. |
| `providerMessageId` | string ou null | sim | ID retornado pelo Resend, sem exposição na API pública. |

Exemplo: `{"id":"2b930acc-6c72-405c-8d2d-1da0b5fd23f8","userId":"855fdc47-5975-41d6-9c0d-1dd3e69a50e1","tokenHash":"<digest de 64 caracteres>","issuedAt":"2026-10-03T20:00:00.000Z","expiresAt":"2026-10-04T20:00:00.000Z","consumedAt":null,"invalidatedAt":null,"deliveryStatus":"UNKNOWN","providerMessageId":null}`. Índices em `(userId, issuedAt)` e `expiresAt`; não excluir registros dentro da janela de limite. Não há relação entre `User` e `Process`.

#### `VerificationEmailInput` — entrada interna de envio

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `emissionId` | UUID | sim | Identidade da reserva. |
| `email` | string | sim | Destinatário da conta. |
| `confirmationUrl` | URL | sim | URL da aplicação com segredo no fragmento. |
| `expiresAt` | Date | sim | Validade a comunicar. |
| `deadline` | Date | sim | Limite restante da operação. |

Exemplo entrada: `{"emissionId":"2b930acc-6c72-405c-8d2d-1da0b5fd23f8","email":"pessoa@example.com","confirmationUrl":"https://app.example.com/confirmar-email#token=<segredo>","expiresAt":"2026-10-04T20:00:00.000Z","deadline":"2026-10-03T20:00:12.000Z"}`.

#### `DeliveryResult` — resultado interno de envio

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `status` | enum | sim | `accepted`, `failed` ou `unknown`. |
| `providerMessageId` | string ou null | sim | Preenchido somente quando conhecido. |

Exemplo resultado: `{"status":"unknown","providerMessageId":null}`.

#### Mapeamento Resend → contrato

| Origem (API/fonte) | Destino (contrato) |
| --- | --- |
| Resposta de sucesso com `id` válido | `accepted`, ID persistido; nenhuma alteração em `emailVerifiedAt`. |
| Rejeição explícita documentada do provedor | `failed`; API pública 502, sem encaminhar texto externo. |
| Falha de transporte, timeout, 5xx ou resposta incompatível | `unknown`; API pública 504; mensagem pode ter sido aceita. |
| 429 do provedor | Falha de envio 502; não confundir quota do Resend com limite local 429. |

#### Parâmetros fixos na origem

| API | Parâmetros principais |
| --- | --- |
| Resend `POST https://api.resend.com/emails` | Bearer da configuração backend; `from` configurado; `to` com um destinatário; `subject`, `html`, `text`; `Idempotency-Key=confirmation/<emissionId>`. |
| Transporte Resend | Prazo até 8 segundos, limitado pelo prazo restante da requisição; sem tentativas automáticas; sem anexos, rastreamento ou dados processuais. |

#### `HealthResponse` — disponibilidade HTTP

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `status` | `ok` | sim | Processo HTTP respondendo; não afirma disponibilidade do Resend ou banco. |

Exemplo: `{"status":"ok"}`.

### Endpoints da API (se aplicável)

#### Visão geral

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/register` | Criar conta pendente e solicitar confirmação. |
| POST | `/api/auth/verify-email` | Consumir confirmação. |
| POST | `/api/auth/resend-verification` | Solicitar nova confirmação. |
| POST | `/api/auth/login` | Autenticar e emitir cookie. |
| GET | `/api/auth/session` | Verificar sessão vigente. |
| POST | `/api/auth/logout` | Revogar sessão atual. |
| POST | `/api/processes/search` | Buscar por CNJ sem colocá-lo na URL. |
| GET | `/api/processes/:id` | Obter destino mínimo por ID. |
| GET | `/health` | Liveness sem dados sensíveis. |

Todos os erros usam `ApiError`. Regras transversais: POST pode retornar 403 de origem, 413 de tamanho e 415 de conteúdo; JSON inválido retorna 400. Falha inesperada retorna 500; prazo total do servidor de 12 segundos retorna 504, salvo código específico de envio desconhecido. O cliente encerra a tentativa em 15 segundos. Uma requisição vencida não inicia novos efeitos, não envia cookie tardio e não escreve resposta novamente; operações já confirmadas no banco/provedor não são presumidas desfeitas. Limites de conexão/statement do banco e de transação devem respeitar o orçamento restante.

---

#### `POST /api/auth/register`

Criar ou reconhecer conta sem expor sua existência na resposta de sucesso.

**Corpo**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `email`, `password` | strings | — | `CredentialsInput`; nenhum campo adicional. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 202 | `MessageResponse` de cadastro | Nova conta com envio aceito; conta pendente com emissão permitida; conta confirmada sem emissão. |
| 400 | `INVALID_INPUT` | E-mail/senha inválidos; nenhuma criação/envio. |
| 429 | `VERIFICATION_RATE_LIMITED` | Conta pendente atingiu limite; senha preservada. |
| 502 / 504 | `CONFIRMATION_SEND_FAILED` / `CONFIRMATION_SEND_UNKNOWN` | Conta já persistida, envio falhou ou ficou desconhecido. |
| 503 / 504 | `SERVICE_UNAVAILABLE` / `REQUEST_TIMEOUT` | Persistência/reserva indisponível ou resultado desconhecido; preservar e-mail e orientar recuperação. |

**Exemplo — sucesso:** `POST /api/auth/register` com exemplo de `CredentialsInput` → 202, exemplo de cadastro em `MessageResponse`.

**Exemplo — cenário alternativo:** mesmo e-mail com outra senha, conta confirmada → mesmo 202; nenhuma alteração ou mensagem de confirmação.

**Exemplo — erro:** senha com sete caracteres → 400 `INVALID_INPUT`, campo `password`, mensagem `Use uma senha de 8 a 128 caracteres.`.

> 202 significa processamento aceito, não entrega na caixa nem sessão aberta. Distinguir falha de criação de falha posterior de envio; jamais instruir a recriar conta como condição para recuperar o envio.

---

#### `POST /api/auth/verify-email`

Confirmar a conta associada a um link de uso único, sem login automático.

**Corpo**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `token` | string | — | `ConfirmationInput`; não requer cookie. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `MessageResponse` de confirmação | Consumo atômico válido antes do vencimento. |
| 400 | `VERIFICATION_INVALID` | Malformado, adulterado, ausente, expirado, substituído ou consumido. |
| 503 / 504 | `SERVICE_UNAVAILABLE` / `REQUEST_TIMEOUT` | Operação indisponível ou resultado desconhecido. |

**Exemplo — sucesso:** `POST /api/auth/verify-email` com token recebido → 200, exemplo de confirmação em `MessageResponse`.

**Exemplo — cenário alternativo:** repetir o token consumido → 400, mensagem de link inválido; conta continua confirmada.

**Exemplo — erro:** indisponibilidade do banco → 503, `Não foi possível concluir a confirmação agora. Abra o link novamente ou tente entrar se já confirmou seu e-mail.`.

> GET da página não confirma. A interface oferece entrada e reenvio tanto para link vencido quanto para consumo anterior; não precisa identificar qual caso ocorreu.

---

#### `POST /api/auth/resend-verification`

Solicitar uma nova emissão, compartilhando os limites com o cadastro.

**Corpo**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `email` | string | — | `EmailInput`. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 202 | `MessageResponse` de reenvio | Envio aceito, e-mail inexistente ou conta já confirmada. |
| 400 | `INVALID_INPUT` | E-mail inválido. |
| 429 | `VERIFICATION_RATE_LIMITED` | Espera local, com `Retry-After`. |
| 502 / 504 | Erro específico de envio | Rejeição ou resultado desconhecido após reserva. |
| 503 / 504 | Erro de serviço/prazo | Falha de persistência ou orçamento esgotado. |

**Exemplo — sucesso:** `POST /api/auth/resend-verification` com `EmailInput` → 202, variante de reenvio de `MessageResponse`.

**Exemplo — cenário alternativo:** endereço inexistente → mesmo 202, sem criar conta/enviar.

**Exemplo — erro:** pedido 18 segundos após última emissão → 429 com `retryAfterSeconds=42`, salvo espera maior pelo limite horário.

> Falhas de envio contam no limite; atingir 60 segundos permite nova tentativa apenas se também houver vaga na janela móvel. Neutralidade das respostas de sucesso não equivale a resistência completa à enumeração por timing ou falhas específicas; esse limite está registrado em riscos.

---

#### `POST /api/auth/login`

Verificar credenciais e confirmação antes de criar sessão.

**Corpo**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `email`, `password` | strings | — | `CredentialsInput`, regras de login. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `SessionResponse` e `Set-Cookie` | Credenciais corretas e conta confirmada. |
| 400 | `INVALID_INPUT` | Campos inválidos. |
| 401 | `INVALID_CREDENTIALS` | E-mail desconhecido ou senha incorreta. |
| 403 | `EMAIL_UNCONFIRMED` | Somente após verificar senha correta. |
| 503 / 504 | Erro de serviço/prazo | Banco, hash saturado ou timeout; não tratar como senha incorreta. |

**Exemplo — sucesso:** `POST /api/auth/login` → 200 com exemplo de `SessionResponse`; navegar para `/consulta`.

**Exemplo — cenário alternativo:** conta pendente e senha correta → 403, opção de reenvio com e-mail preservado.

**Exemplo — erro:** senha incorreta → 401 com mensagem RF2, sem cookie novo.

> Sessão anterior enviada no cookie é revogada ao concluir um novo login, na mesma transação de criação da nova sessão. Uma resposta de login que chega após timeout não deve restaurar a UI; o cliente marca saída pendente e tenta revogar eventual cookie recebido antes de permitir outra sessão.

---

#### `GET /api/auth/session`

Restaurar o estado visual somente após validar a sessão persistida.

**Parâmetros de consulta**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| Nenhum | — | — | Cookie transporta o segredo. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `SessionResponse` | Sessão válida e conta confirmada. |
| 401 | `SESSION_INVALID` | Ausente, expirada, revogada, inválida ou confirmação ausente. |
| 503 / 504 | Erro de serviço/prazo | Não restaurar dados nem afirmar credenciais incorretas. |

**Exemplo — sucesso:** `GET /api/auth/session` com cookie válido → 200; mesmos ID e vencimento do login.

**Exemplo — cenário alternativo:** sem cookie → 401; abertura inicial mostra login sem mensagem de expiração.

**Exemplo — erro:** sessão antes válida chega ao vencimento → 401 e mensagem RF16.

> Ler a sessão não prolonga vencimento nem emite cookie renovado.

---

#### `POST /api/auth/logout`

Revogar o acesso persistido da sessão atual.

**Corpo**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| Nenhum | objeto vazio | — | `{}`; segredo somente no cookie. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 204 | Sem corpo; expira cookie | Sessão revogada ou cookie ausente/inválido/já encerrado. |
| 503 / 504 | Erro de serviço/prazo | Não foi possível garantir revogação. |

**Exemplo — sucesso:** `POST /api/auth/logout` com `{}` → 204; cookie anterior passa a receber 401 na consulta.

**Exemplo — cenário alternativo:** repetir saída → 204.

**Exemplo — erro:** banco indisponível → 503; frontend oculta dados e mantém saída pendente.

> Não retornar sucesso nem apagar a única referência local necessária à nova tentativa antes de confirmar a revogação remota.

---

#### `POST /api/processes/search`

Busca exata, protegida e somente de leitura.

**Corpo**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `cnj` | string | — | `CnjInput`; autorização antes de validação do domínio e busca. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `ProcessSummary` | Correspondência exata. |
| 400 / 422 | Erros CNJ | Vazio, formato inválido ou verificador reprovado. |
| 401 | `SESSION_INVALID` | Nenhuma leitura de processos. |
| 404 | `PROCESS_NOT_FOUND` | CNJ válido ausente. |
| 503 / 504 | Erro de serviço/prazo | Falha de consulta; nunca converter em ausente. |

**Exemplo — sucesso:** `POST /api/processes/search` com exemplo de `CnjInput` → 200, `ProcessSummary`; navegar para `/processos/{id}`.

**Exemplo — cenário alternativo:** `1002271-82.2025.8.26.0003`, ausente da carga descrita no PRD → 404; manter entrada.

**Exemplo — erro:** `{"cnj":""}` com sessão válida → 400 `CNJ_REQUIRED`; sem sessão → 401 antes de buscar.

> Não há lista vazia, correspondência aproximada ou degradação com resultados parciais.

---

#### `GET /api/processes/:id`

Atender abertura direta e recarga da página mínima.

**Parâmetros de rota**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `id` | string | — | `ProcessIdInput`; validar após sessão. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `ProcessSummary` | ID existente. |
| 401 | `SESSION_INVALID` | Sem acesso; nenhum indicativo de existência. |
| 404 | `PROCESS_NOT_FOUND` | ID inválido ou não encontrado. |
| 503 / 504 | Erro de serviço/prazo | Serviço temporariamente indisponível. |

**Exemplo — sucesso:** `GET /api/processes/1` com fixture de ID 1 → exemplo de `ProcessSummary`.

**Exemplo — cenário alternativo:** `GET /api/processes/invalido` autenticado → 404; oferecer retorno.

**Exemplo — erro:** mesmo endereço sem sessão → 401, sem consultar processos.

> Sequencialidade do ID não representa autorização: qualquer conta confirmada autenticada tem o acesso de leitura previsto por P2. A UI nunca usa `location.state` como fonte definitiva do registro.

---

#### `GET /health`

Liveness pública do processo HTTP.

**Parâmetros de consulta**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| Nenhum | — | — | Não aceita credenciais nem consulta processos. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `HealthResponse` | Servidor em atendimento. |

**Exemplo — sucesso:** `GET /health` → `{"status":"ok"}`.

**Exemplo — cenário alternativo:** sem cookie → mesmo 200.

**Exemplo — erro:** processo parado → falha de conexão, sem resposta JSON; monitor não deve interpretá-la como 200.

> Disponibilidade do banco/Resend é observada por erros das operações; não fazer chamadas pagas ou enviar mensagens no health check.

---

## Pontos de integração

O adaptador Resend usa `fetch` nativo do Node com cancelamento por prazo, a API de [envio de e-mail](https://resend.com/docs/api-reference/emails/send-email) e chave Bearer somente no backend. Reutilizar HTTPS/JSON nativos para esta operação única evita uma dependência adicional e permite limitar explicitamente o tempo. A documentação de [envio com Node](https://resend.com/docs/send-with-nodejs) exige credencial e domínio verificado. O remetente deve pertencer ao domínio autorizado. HTML e texto identificam o produto, finalidade, validade de 24 horas e ação/link copiável; não contêm senha ou dados processuais. Desabilitar rastreamento de links para preservar o fragmento e validar seu funcionamento no aceite real.

Usar uma chave de idempotência por emissão; o Resend documenta retenção dessas chaves por 24 horas e rejeita reutilização com payload diferente. A aplicação não depende desse mecanismo para unicidade de contas ou limites locais. Não repetir automaticamente chamadas com resultado desconhecido. Uma futura repetição técnica da mesma emissão exigiria o mesmo payload/chave; o reenvio manual desta etapa cria uma emissão nova. Referência: [idempotência do Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

| Configuração | Consumo e validação |
| --- | --- |
| `DATABASE_URL`, `DATABASE_LABEL`, `NODE_ENV` | Preservar contratos atuais; nenhuma credencial de envio exigida de seed/Prisma CLI. |
| `PORT` | Inteiro de porta válido, padrão 3000, exigido somente no runtime HTTP. |
| `PUBLIC_APP_URL` | Origem absoluta, sem credenciais/query/fragmento/caminho; HTTPS em produção, HTTP local permitido no desenvolvimento/teste. Fonte de links e origem permitida. |
| `RESEND_API_KEY` | Obrigatória no runtime HTTP com envio real; nunca usar prefixo `VITE_`. |
| `RESEND_FROM` | Remetente verificado, validado antes de abrir servidor. |
| `PRODUCT_NAME` | Identificação usada no assunto/conteúdo, sem segredos. |
| `API_PROXY_TARGET` | Apenas configuração de desenvolvimento do Vite, padrão local configurado em exemplo; não embutir URL privada no bundle. |

O modo simulado é uma dependência injetada pelo harness de testes, não uma opção pública que confirma contas ou devolve tokens. O bootstrap de testes não exige Resend real. A configuração comum pode representar valores HTTP como opcionais, mas a validação de `http-environment.ts` os torna obrigatórios antes do `listen`. Não acessar `process.env` em services/controllers.

Prisma permanece na versão 7 do projeto e usa seu cliente gerado/adaptador PostgreSQL. Criar migration aditiva via Prisma em desenvolvimento e aplicar por `migrate deploy` nos ambientes de teste/publicação. Não executar novamente o seed da fundação em banco populado. Antes/depois da migration e da jornada de aceite, comparar conteúdo e relacionamentos de `Process`/`Movement`, não apenas contagens.

## Abordagem de testes

Vitest para unidade/integração; React Testing Library e ambiente DOM no frontend; Supertest para contrato Express; Playwright em `e2e/` para jornadas. Exigir no mínimo 80% de linhas, funções, branches e statements separadamente em cada aplicativo, preservando o rigor de `backend/vitest.config.ts`. Usar mocks/stubs de fronteiras externas e relógio/aleatoriedade; não substituir a persistência real nos testes de integração que verificam concorrência. Cada ID abaixo identifica um comportamento; variantes parametrizadas geram casos independentes.

### Testes de unidade (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TU-01 | Normalização e validação de identidade | CA-02, CA-21, CA-22 | Espaços externos/caixa equivalentes; formato inválido recusado; sem regras de alias. |
| TU-02 | Política de senha e preservação Unicode | CA-21 | Limites 7/8/128/129 pontos, espaços e multibyte; nenhuma transformação. |
| TU-03 | Verificação de senha e erro comum | CA-01, CA-02, CA-23 | Credenciais erradas indistinguíveis; pendência só após senha correta. |
| TU-04 | Entrada CNJ vazia e estrutura estrita | CA-05, CA-06, CA-07 | Vazio/formato separados; zeros preservados; espaços internos recusados. |
| TU-05 | Integração contratual do validador CNJ | CA-08 | Adaptador recusa reprovação antes de chamar busca; não calcula algoritmo alternativo. |
| TU-06 | Expiração absoluta e revogação | CA-03, CA-13, CA-14 | Instante anterior válido, igualdade de oito horas inválida; leitura não renova. |
| TU-07 | Limites móveis de emissão | CA-26 | 59,999 s recusado, 60 s permitido com vaga; sexta emissão recusada; fronteira de uma hora libera vaga. |
| TU-08 | Validade e estados do link | CA-24, CA-25 | Igualdade de 24 h expira; consumido/substituído inválidos. |
| TU-09 | Conteúdo de confirmação | CA-20, CA-28 | Produto, finalidade, validade, origem e link textual corretos; ausência de senha/CNJ. |
| TU-10 | Classificação do resultado Resend | CA-27 | Aceito/rejeitado/desconhecido separados; nunca confirma usuário. |
| TU-11 | Estados e recuperação de cadastro/reenvio | CA-20, CA-21, CA-26, CA-27 | Só dois campos no cadastro; e-mail preservado; repetição bloqueada; espera informada. |
| TU-12 | Consulta por Enter e prevenção de duplicidade | CA-07, CA-11, CA-16 | Um envio, campo bloqueado enquanto pendente e erro antigo removido ao tentar novamente. |
| TU-13 | Timeout e descarte de respostas obsoletas | CA-12, CA-13, CA-14, CA-27 | Após 15 s controles liberados; nenhum resultado tardio navega ou repõe sessão. |
| TU-14 | Destino, retorno e isolamento de sessão | CA-09, CA-10, CA-15 | Dados do contrato; CNJ preservado só na mesma sessão; troca/saída apaga. |
| TU-15 | Semântica, foco e mensagens acessíveis | CA-17 | Rótulos, erros associados, andamento anunciado, foco no título e senha colável. |
| TU-16 | Configuração, erros e logs seguros | CA-03, CA-19, CA-28 | Segredos/CNJ/cookies não registrados; 5xx genérico; seed não exige Resend. |
| TU-17 | Saída sem conexão e login com resposta tardia | CA-12, CA-14 | Estado público bloqueado e revogação retomada; nenhum sucesso remoto presumido. |

Os testes da própria matemática de CNJ pertencem ao pré-requisito da fundação. Nesta entrega, TU-05 verifica a adaptação e os testes de integração devem usar o validador real quando disponibilizado. Não satisfazer CA-08 exclusivamente com um stub.

### Testes de integração (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TI-01 | Cadastro persistido e envio inicial | CA-20, CA-28 | Conta pendente única, emissão persistida, chamada Resend correta e nenhum cookie. |
| TI-02 | Cadastro inválido por HTTP | CA-21 | 400 sem conta/emissão/chamada externa; incluir tipos/coerção/campos extras. |
| TI-03 | Cadastros simultâneos equivalentes | CA-22, CA-26 | Uma conta, senha original preservada e uma emissão no intervalo. |
| TI-04 | Confirmação pública válida | CA-24 | Atualizações atômicas; só destinatário confirmado; sem sessão. |
| TI-05 | Links inválidos e consumo concorrente | CA-25 | Nenhuma confirmação indevida; apenas um sucesso em disputa. |
| TI-06 | Reenvio concorrente e janela móvel | CA-26 | Intervalo/limite persistentes entre instâncias e reinícios, com `Retry-After` correto. |
| TI-07 | Disputa entre confirmação e reenvio | CA-24, CA-25, CA-26 | Resultado equivalente a uma ordem serial; nenhuma ressurreição de link. |
| TI-08 | Rejeição, timeout e queda após reserva | CA-27 | Conta e senha preservadas, reserva conta no limite; recuperação segura. |
| TI-09 | Reenvio inexistente/confirmado | CA-22, CA-26 | Resposta neutra, sem envio/criação. |
| TI-10 | Login, credenciais erradas e pendência | CA-01, CA-02, CA-23 | Status, mensagens, cookie e verificação da senha obedecem contrato. |
| TI-11 | Cookie, origem e proteção direta | CA-03, CA-19 | Sem sessão não há leitura de processos; origem indevida recusada; atributos corretos. |
| TI-12 | Expiração e logout revogável | CA-13, CA-14 | Token capturado deixa de funcionar após logout; oito horas e conta pendente recusadas. |
| TI-13 | CNJs equivalentes, inválidos e ausentes | CA-05, CA-06, CA-07, CA-08, CA-10 | Validador real antes da busca; máscara compatível com persistência. |
| TI-14 | Leitura mínima por CNJ e por ID | CA-04, CA-09, CA-15 | Duas contas acessam o mesmo registro; payload só id/cnj; ID inválido/ausente tratado. |
| TI-15 | Integridade da base processual | CA-18 | Snapshot integral de processos/movimentos inalterado após sucesso, ausência e falha. |
| TI-16 | Falhas de dependências e prazos HTTP | CA-12, CA-19, CA-27 | 5xx contextual, nunca 404 falso; cliente recuperável; sem cookies tardios. |
| TI-17 | Bootstrap e desligamento | CA-19 | Configuração inválida impede listen; sinais repetidos seguros; conexões encerradas. |

Provisionar banco/schema dedicado por execução/worker a partir das migrations; exigir explicitamente ambiente de teste e URL isolada. A suíte obrigatória deve falhar se não conseguir executar integração, sem sucesso por `describe.skip`. Preservar testes anteriores que exercitam carga/limpeza em suas bases isoladas. Fixtures: CNJ existente `1001399-31.2023.8.26.0070`, válido ausente `1002271-82.2025.8.26.0003`, mais um CNJ válido com zeros à esquerda confirmado pelo validador real. Nunca fixar o ID atribuído ao CSV; obter ID da fixture. Controlar tempos por relógio injetado em unidade e timestamps preparados no banco em integração; não aguardar horas reais.

### Testes E2E (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| E2E-01 | Cadastro até consulta e retorno | CA-01, CA-07, CA-09, CA-15, CA-20, CA-23, CA-24, CA-28 | Dois campos; login pendente bloqueado; confirmar em outro contexto; login explícito; processo correto; retorno preserva CNJ. |
| E2E-02 | Link expirado, reenvio e recuperação | CA-25, CA-26, CA-27 | Link antigo recusado; limite anunciado; novo link permite confirmação. |
| E2E-03 | Consulta inválida, ausente, falha e correção | CA-05, CA-06, CA-08, CA-10, CA-11, CA-12, CA-16 | Mensagens distintas; entrada preservada; Enter e repetição corretos; resposta tardia ignorada. |
| E2E-04 | Autorização, expiração e saída | CA-03, CA-13, CA-14, CA-15 | Navegação direta/recarga/voltar sem vazamento; outra aba invalidada; falha de logout recuperável. |
| E2E-05 | Jornada por teclado e viewport pequeno | CA-17, CA-19 | Fluxo completo a 320 px e ampliação de 200%, sem sobreposição ou rolagem horizontal necessária. |

Playwright inicia SPA e backend reais em portas controladas. O processo de teste injeta `VerificationSender` simulado; um coletor acessível apenas ao harness captura a mensagem para abrir o link, sem endpoint de produção que exponha tokens. A automação não usa Resend real nem altera domínio para confirmar contas. Testes de timeout podem atrasar transporte e banco controlados; os demais usam jornada real. A configuração fica em `frontend/playwright.config.ts`, apontando para `../e2e`, com script `test:e2e` no frontend.

Complementar E2E-05 com aceite documentado em leitor de tela e zoom real de navegador; axe/inspeções automatizadas não substituem essas evidências. Aceite controlado de CA-28: configurar Resend real, cadastrar endereço de uma caixa controlada, comprovar recebimento, abrir o link em outro navegador, confirmar, entrar e consultar a fixture. Registrar resultado e horário sem copiar token, senha ou API key. Esse aceite é uma dependência de entrega, não de cada execução da suíte.

Na implementação, executar `lint`, `typecheck`, `test`, `test:coverage` e `build` dentro de cada aplicativo, além de `test:e2e` no frontend. Configurar os scripts ainda ausentes; não excluir código novo para atingir cobertura. Esta entrega documental não executa nem declara aprovação dessas verificações de implementação.

## Sequenciamento do desenvolvimento

### Ordem de construção

1. Resolver a entrega do validador da fundação: identificar arquivo/pacote e evidências, adaptar a porta e confirmar fixtures. A consulta não pode ser considerada implementável até esse pré-requisito; autenticação pode avançar de forma independente.
2. Acrescentar modelos/migration de autenticação, contratos e repositórios transacionais; testar unicidade, confirmação e limites com concorrência.
3. Criar configuração HTTP, bootstrap Express, cookies, middleware de erros/origem/sessão e prazos; preservar execução de seed/migrations sem Resend.
4. Implementar hash, cadastro, confirmação, reenvio e adaptador Resend; validar falhas e recuperação antes de conectar a interface.
5. Implementar login, leitura/revogação da sessão e endpoints processuais mínimos, reutilizando a busca existente e testando autorização antes do acesso aos processos.
6. Criar frontend e infraestrutura de testes; implementar telas públicas, sessão, consulta/destino e comportamento acessível, com descarte de respostas antigas.
7. Integrar E2E, cobertura por aplicativo, documentação operacional e aceite real de e-mail. Validar integridade da fundação e registrar evidências CA-01–CA-28.

### Dependências técnicas

| Dependência | Situação e condição de conclusão |
| --- | --- |
| Validador de CNJ | Ausente. Usuário confirmou entrega como pré-requisito da fundação, com contrato `CnjValidator` e testes reais de dígitos. Bloqueia consulta/aceite CA-08, não a escrita desta TechSpec. |
| Topologia | Usuário confirmou mesma origem HTTPS com proxy `/api`, cookie HttpOnly e revogação no PostgreSQL. Outra topologia exige revisar cookies/CORS/origem antes de implementar. |
| Resend | Requer credencial protegida, domínio/remetente verificados, caixa de aceite e URL pública correta. Não necessário para suítes simuladas. |
| Banco | PostgreSQL 17 local existente, Prisma 7, migrations aditivas e ambientes isolados de teste. |
| Backend HTTP | Instalar Express 5, CORS e tipos; adicionar scripts `dev`/`start`, preservando os scripts de qualidade atuais. |
| Frontend | Criar React 19, React Router, Vite, Tailwind, TypeScript, ESLint/hooks, Vitest/V8, Testing Library, jsdom e Playwright; lock independente. |
| Dependências de teste backend | Adicionar Supertest/tipos; preservar Vitest existente. |

Fixar versões compatíveis no lock gerado por npm na implementação; não fazer atualização incidental do Prisma/Node da fundação. Tailwind com plugin Vite segue a [integração oficial](https://tailwindcss.com/docs/installation/using-vite); não criar configuração JavaScript vazia apenas porque aparece no exemplo de estrutura de pastas.

## Monitoramento e observabilidade

Reutilizar o logger centralizado. Eventos `info`: servidor iniciado/desligado, cadastro aceito, confirmação concluída, sessão criada/revogada e operação concluída. Eventos `warn`: limite atingido, link recusado, sessão inválida, envio desconhecido e timeout. Eventos `error`: falha inesperada, indisponibilidade de banco/provedor e configuração inválida. Registrar somente evento, request ID gerado no servidor, padrão de rota, duração, status e código de erro. Não registrar bodies, cabeçalhos, URL completa, parâmetros de consulta, senha, cookie, e-mail, CNJ, digest ou link de confirmação. Acrescentar essas categorias ao sanitizador como defesa adicional.

Observar contagens e duração de respostas por rota/status, proporção de falhas/timeout do Resend e recusas por limite a partir dos logs; não há requisito de plataforma nova de métricas ou analytics. `GET /health` fornece liveness. O desligamento trata `SIGTERM`, `SIGINT`, `unhandledRejection` e `uncaughtException`, deixa de aceitar requisições, aguarda até 15 segundos, fecha servidor/banco e termina com código 1 em falhas fatais. A rotina é idempotente.

## Considerações técnicas

### Principais decisões

- Sessões opacas persistidas oferecem revogação imediata após logout e vencimento absoluto verificável; evitar JWT sem registro de revogação e armazenamento de credenciais no navegador.
- PostgreSQL mantém confirmação e limites entre instâncias/reinícios. Um contador em memória não atende concorrência nem janela móvel. Uma tabela de emissões atende simultaneamente validade, auditoria técnica mínima e quota, sem Redis adicional.
- Cadastro e emissão têm fronteiras de persistência separadas; falha do e-mail não perde a conta. Resend fora da transação evita reter conexão durante espera externa.
- Usar a API HTTP Resend diretamente, com adapter testável e prazo explícito. Bibliotecas existentes Joi/Prisma/Vitest são reaproveitadas; não adicionar um framework completo de autenticação para substituir os contratos já definidos pelo PRD.
- Pesquisa por POST evita CNJ na URL de consulta; destino usa ID persistido estável. A resposta reduz os dados ao necessário para esta etapa.
- Frontend antecipa estrutura, backend decide validade/identidade. A autorização não depende de React Router ou de estado guardado pela UI.
- Interface respeita mensagens e estados do PRD. A confirmação tem ação explícita para evitar consumo acidental por navegação/efeitos; cadastro e confirmação nunca autenticam.
- Fontes técnicas foram consultadas durante a elaboração e vinculadas junto às decisões. A documentação atual sem versão do Prisma redirecionava para APIs de outra versão; a referência adotada foi especificamente Prisma 7 e os tipos locais.

### Riscos conhecidos

| Risco | Tratamento |
| --- | --- |
| Validador ausente versus pressuposto do PRD | Bloqueador explícito; localizar/entregar pela fundação antes da consulta. Se o usuário ampliar o escopo, revisar esta decisão e sua rastreabilidade. |
| E-mail aceito não entregue, respostas fora de ordem ou queda após reserva | Mensagens não prometem entrega; recuperação por reenvio com invalidação dos anteriores; aceite real comprova caixa e fragmento. |
| Reserva persistida sem envio por queda do processo | Estado inicial desconhecido; conta preservada e reenvio após intervalo. Outbox só se surgir requisito de entrega eventual automática. |
| Ataques de custo ao cadastro/login | Hash assíncrono com concorrência/fila limitadas e tamanho de entrada; definir rate limit operacional no proxy antes de exposição ampla, sem alterar os limites funcionais de confirmação. |
| Enumeração por timing, 429 ou falha de envio | PRD exige neutralidade de sucesso e falha específica do envio; garantir mensagens comuns, hash fictício no login e não declarar anonimato perfeito das contas. |
| Revogação quando rede/banco falham | Ocultar conteúdo imediatamente, sinalizar saída pendente e confirmar operação remota antes de reabilitar sessão. |
| Conteúdo preservado em bfcache ou respostas atrasadas | Limpeza de eventos/estado, revalidação na retomada e testes em navegador; `no-store` isolado não é critério suficiente. |
| Testes de integração ignorados por ausência de ambiente | Execução obrigatória com banco isolado e falha explícita se indisponível; não aceitar relatório com testes críticos pulados. |
| Acúmulo de sessões/emissões | Indexar vencimento; limpeza operacional pode remover expirados com margem maior que 24 h e sem apagar a janela de limites. Não requer scheduler nesta entrega. |
| Acesso compartilhado aos processos | Preservar P2/P3 do PRD; restrições por usuário exigiriam nova autorização de domínio antes de publicar dados incompatíveis com essa premissa. |

### Conformidade com o AGENTS.md e as rules

Lidos integralmente `AGENTS.md` e os seis arquivos presentes em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `folder-structure.md`, `tests.md` e `commit_guidelines.md`. A referência final do AGENTS a `./agents/rules/tests.md` foi conciliada com o arquivo existente `.agents/rules/tests.md`.

Adotar módulos ESM, tipagem explícita sem `any`, `const`, comparações estritas, funções nomeadas e callbacks arrow, guard clauses e ausência de comentários supérfluos. Manter arquivos TypeScript até 100 linhas, funções/componentes até 30 e até três parâmetros. A exceção necessária é o middleware de erro do Express, cuja assinatura exige quatro parâmetros; documentar a exceção local de lint. O Express 5 encaminha rejeições assíncronas ao middleware de erros, conforme sua [documentação](https://expressjs.com/en/guide/error-handling/); não instalar `express-async-errors`.

Preservar direção das camadas e acesso a banco somente pelos repositories; factories de erro criam instâncias `Error` com `name`/`message`, conciliando as regras de aplicação e JavaScript. Exportar módulos em `index.ts`, sem importar o barrel da própria camada. A organização real `config/database.ts` é mantida, embora o exemplo de estrutura use `database.connection.ts`; renomear esse arquivo não beneficia esta funcionalidade.

Separar frontend/backend e locks npm; configurações e scripts por aplicativo, E2E na raiz. Validar ambiente antes de listen, usar logging centralizado e desligamento controlado. Migrations geradas pelo Prisma, nunca editadas manualmente. Cobertura mínima de 80% com cenários relevantes, FIRST, unidade antes de integração e poucos E2E críticos.

O estado descritivo do AGENTS diverge do checkout: frontend/HTTP não existem, backend já possui lint/typecheck e não há `src/index.ts` com o erro citado. Usar a inspeção atual para planejar componentes, mantendo as regras normativas; atualizar a documentação operacional ao implementar. Commits seguem título Conventional Commits em inglês, identidade configurada e staging explícito; preservar alterações preexistentes e não fazer push sem autorização.

### Conformidade com skills

| Skill do projeto | Aplicação e desvios |
| --- | --- |
| `.agents/skills/criar-techspec/SKILL.md` | PRD lido, agente Explore utilizado, projeto/rules explorados e fontes pesquisadas. Perguntas feitas antes da redação e respostas do usuário incorporadas à versão final. Template seguido e testes associados a CA. A ferramenta disponível `request_user_input_async` substituiu `AskUserQuestion`; sem desvio de objetivo. |
| `.agents/skills/react/SKILL.md` | Lida junto de `references/react-best-practices.md`. Componentes até 30 linhas, props explícitas, hooks puros, efeitos só para sistemas externos com limpeza, lógica HTTP em services, Tailwind e acessibilidade. Pasta `services/` segue a rule do projeto, apesar do exemplo genérico `lib/api` da skill. Sem desvio funcional. |

Esta especificação não realiza implementação, revisão de código ou QA. O desenho visual detalhado pode aplicar `impeccable` na implementação; esta etapa define os contratos de interface e acessibilidade já exigidos pelo PRD.

### Arquivos relevantes e dependentes

| Arquivo/grupo | Papel |
| --- | --- |
| `tasks/prd-autenticacao-consulta-cnj/prd.md`, `CURRENT_PROMPT.md` | Requisitos e restrição de reuso da fundação. |
| `tasks/prd-fundacao-dominio-ingestao-csv/{prd,techspec,tasks}.md` | Contexto da etapa anterior; implementação atual prevalece para contratos existentes. |
| `AGENTS.md`, `.agents/rules/*.md`, `.agents/skills/react/` | Normas aplicáveis. |
| `backend/package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts` | Base de dependências/build/qualidade a ampliar. |
| `backend/prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/` | Modelos e migrations da fundação e novas entidades de autenticação. |
| `backend/src/config/`, `errors/`, `protocols.ts` | Configuração, banco, logger e contratos reutilizáveis. |
| `backend/src/repositories/process-repository.ts`, `movement-repository.ts` | Busca literal e persistência existente a preservar. |
| `backend/src/seed/`, `lawsuits_movements.csv` | Origem da base; sem recarga/alteração pela jornada. |
| `backend/compose.yaml`, `.env.development.example`, `.env.test.example`, `README.md` | Infra local e documentação de configuração/aceite. |
| Componentes novos listados em “Visão dos componentes” | Destinos concretos de implementação e testes adjacentes. |
| `frontend/package.json`, `package-lock.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `README.md`, `.env.development.example` | Novo aplicativo, qualidade e execução E2E. |
| `e2e/*.spec.ts`, `e2e/support/` | Jornadas reais com serviços controlados. |

Documento de arquitetura; não altera o PRD, não implementa código e não cria decomposição de tarefas. A conclusão da funcionalidade continua condicionada ao validador real e às evidências de aceitação definidas acima.
