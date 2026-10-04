# Estrutura de pastas

Este documento define a organização esperada para o frontend, o backend e os testes do projeto. Os diretórios de código ficam dentro de `src/`, salvo quando indicado de outra forma.

## Visão geral

```text
.
├── frontend/
├── backend/
└── e2e/
```

O frontend e o backend são aplicações independentes e mantêm seus próprios arquivos de configuração, dependências e scripts. A pasta `e2e/` fica na raiz do projeto e contém os testes de ponta a ponta.

## Backend

O backend é organizado por camada técnica nas pastas e por recurso nos arquivos. Uma camada representa uma responsabilidade, como receber uma requisição HTTP, executar regras de negócio ou acessar o banco. Um recurso representa um conjunto de operações relacionadas do produto, como autenticação ou consulta de processos. Assim, as operações de autenticação são distribuídas entre `auth-router.ts`, `auth-controller.ts`, `auth-service.ts`, `auth-repository.ts` e `auth-schema.ts`, conforme a responsabilidade de cada camada.

Dentro de cada módulo, funções nomeadas exportadas representam as operações públicas do recurso, e funções privadas implementam seus passos auxiliares. Tipos compartilhados relacionados ficam juntos em arquivos de contexto em `types/`. Essa organização permite localizar as operações de um recurso e seus contratos sem percorrer um arquivo diferente para cada função, rota ou tipo.

As responsabilidades, convenções e critérios de divisão necessários para aplicar essa organização estão descritos neste documento. Novas tarefas e refatorações devem seguir estas definições. A árvore descreve a estrutura de destino; arquivos de funcionalidades pendentes devem ser criados somente quando sua implementação for necessária.

```text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── database-client.ts
│   │   ├── database.ts
│   │   ├── environment-schema.ts
│   │   ├── envs.ts
│   │   ├── http-environment-schema.ts
│   │   ├── logger.ts
│   │   ├── sanitize-log-context.ts
│   │   └── index.ts
│   ├── controllers/
│   │   ├── auth-controller.ts
│   │   ├── health-controller.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── application-error.ts
│   │   ├── configuration-error.ts
│   │   └── index.ts
│   ├── middlewares/
│   │   ├── error-middleware.ts
│   │   ├── origin-middleware.ts
│   │   ├── request-context-middleware.ts
│   │   ├── validation-middleware.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── auth-repository.ts
│   │   ├── movement-repository.ts
│   │   ├── process-repository.ts
│   │   └── index.ts
│   ├── routers/
│   │   ├── auth-router.ts
│   │   ├── health-router.ts
│   │   └── index.ts
│   ├── schemas/
│   │   ├── auth-schema.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── auth-service.ts
│   │   ├── security-service.ts
│   │   ├── resend-service.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── config.ts
│   │   ├── database.ts
│   │   ├── errors.ts
│   │   ├── http.ts
│   │   ├── process.ts
│   │   ├── resend.ts
│   │   ├── seed.ts
│   │   └── index.ts
│   ├── seed/
│   │   ├── csv-record-parser.ts
│   │   ├── parse-seed-file.ts
│   │   ├── persist-seed.ts
│   │   ├── seed-row-mapper.ts
│   │   └── seed.ts
│   ├── generated/
│   │   └── prisma/
│   ├── app.ts
│   ├── main.ts
│   ├── server.ts
│   └── shutdown.ts
├── .env.development.example
├── .env.test.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

- `prisma/schema.prisma`: modelos e datasource do banco. `prisma/migrations/`: migrations geradas pelo Prisma; não devem ser editadas manualmente.
- `config/`: carregamento e validação das variáveis de ambiente por `NODE_ENV`, exportadas como `env` (`envs.ts`), instância única do `PrismaClient` (`database.ts`), factory do cliente (`database-client.ts`) e adaptador de logging (`logger.ts`).
- `routers/`: registra as rotas de um recurso, encadeando middlewares e o controller correspondente. Não contém lógica.
- `middlewares/`: autenticação, validação de `body` com schemas e tratamento centralizado de erros, que converte erros da aplicação em status HTTP.
- `schemas/`: schemas Joi de validação das entradas e validadores relacionados, agrupados por recurso e tipados com contratos de `types/`.
- `controllers/`: extraem dados da requisição, chamam o service e montam a resposta HTTP. Não contêm regras de negócio.
- `services/`: regras de negócio. Lançam erros de `errors/` e não dependem de `Request` ou `Response`.
- `repositories/`: único ponto de acesso ao banco, via Prisma. Agrupam operações por recurso, inclusive as transações e garantias de consistência que envolvem várias tabelas desse recurso.
- `errors/`: erros e factories agrupados por contexto, com nome e metadados públicos tipados. Um módulo pode exportar várias factories relacionadas.
- `types/`: contratos compartilhados agrupados por contexto. Um arquivo contém vários tipos relacionados; não criar um arquivo para cada tipo. Tipos privados permanecem junto à implementação.
- `seed/`: leitura, transformação e persistência da importação CSV. Contratos compartilhados da importação ficam em `types/seed.ts`.
- `generated/prisma/`: código gerado pelo Prisma; não editar manualmente nem aplicar a ele a organização dos módulos escritos pela aplicação.
- `app.ts`: cria e configura o Express (env, CORS, JSON, rotas e middleware de erros) e exporta a instância, sem chamar `listen`.
- `main.ts`: ponto de entrada da aplicação.
- `server.ts`: compõe e inicia o servidor HTTP com a configuração validada e registra os sinais de encerramento. `shutdown.ts` implementa a rotina de desligamento e liberação de recursos.
- As pastas de camadas, `config/`, `errors/` e `types/` expõem sua API pública por `index.ts`, com reexports explícitos. Não adicionar barrels a `seed/` ou ao código gerado apenas por uniformidade.
- Os arquivos de camadas seguem `<recurso>-<camada>.ts`, como `auth-router.ts`, `auth-controller.ts`, `auth-service.ts`, `auth-repository.ts` e `auth-schema.ts`. Em `types/`, usar o nome do contexto, como `auth.ts`.

### Agrupamento por recurso

Cada recurso concentra suas operações em um módulo de cada camada. Novas rotas de autenticação ampliam os módulos `auth` existentes. Funções auxiliares coesas permanecem no mesmo arquivo; uma função, uma rota ou uma tabela adicional não exige um novo módulo.

Ao acrescentar uma operação, registrar seu caminho e middlewares no router do recurso, definir seu handler no controller, implementar suas regras no service, declarar a validação de entrada no schema e adicionar as consultas necessárias ao repository. Criar somente as partes que a operação exigir. Por exemplo, cadastro e reenvio têm handlers e funções próprios, mas compartilham os arquivos de autenticação de cada camada.

Exportar somente as funções consumidas por outros módulos. Auxiliares usados exclusivamente pelo próprio service permanecem privados no mesmo arquivo. Contratos utilizados em várias camadas ficam no arquivo de tipos do contexto correspondente; por exemplo, entradas de cadastro e reenvio ficam juntas em `types/auth.ts`. Para um novo recurso, aplicar o mesmo padrão de nomes e responsabilidades aos módulos necessários.

| Módulo | Responsabilidade |
| --- | --- |
| `auth-service.ts` | Cadastro e reenvio, incluindo auxiliares desses fluxos. Confirmação, login, sessão e logout serão acrescentados neste módulo quando suas tarefas forem implementadas. |
| `security-service.ts` | Hash e comparação de senhas, fila de derivação, geração, validação e digest de tokens. |
| `resend-service.ts` | Integração com o provedor de e-mail, classificação da resposta e composição da mensagem de confirmação. |
| `auth-repository.ts` | Persistência de usuários, sessões e confirmações, reserva de emissões, limites transacionais e controle de concorrência. |
| `auth-schema.ts` | Schemas das entradas de autenticação e validações compartilhadas de e-mail e senha. |
| `auth-controller.ts` | Handlers HTTP das operações de autenticação. |
| `auth-router.ts` | Registro das rotas de autenticação com os middlewares e handlers correspondentes. |

Services, controllers e repositories devem expor operações como funções nomeadas exportadas. Controllers chamam as funções do service do recurso, e services chamam as funções dos repositories. Preservar a injeção de dependências necessária para banco, envio e relógio, permitindo testes isolados; evitar factories e interfaces que apenas envolvam operações sem necessidade concreta.

Separar módulos quando houver uma responsabilidade própria, como criptografia e envio de e-mail. Respeitar os limites de 300 linhas por arquivo e 30 linhas por função definidos em `code-standards.md` e no ESLint. Se um módulo atingir o limite, extrair uma responsabilidade coesa, mantendo as operações públicas do recurso no service correspondente. Não desabilitar os limites nem comprimir código para contorná-los.

### Tipos compartilhados

| Arquivo | Contratos agrupados |
| --- | --- |
| `types/auth.ts` | Entradas, resultados e contratos de conta, sessão e confirmação de e-mail. |
| `types/config.ts` | Configuração de ambiente, HTTP e contexto de logging. |
| `types/database.ts` | Contratos compartilhados de cliente e transação do banco. |
| `types/errors.ts` | Códigos, campos e metadados dos erros públicos; implementações ficam em `errors/`. |
| `types/http.ts` | Contratos HTTP compartilhados, respostas e composição da aplicação. |
| `types/process.ts` | Contratos de processos e movimentações. |
| `types/resend.ts` | Entrada de envio, resultado de entrega e contrato do remetente. |
| `types/seed.ts` | Processos e movimentações preparados para importação. |

Usar `import type` e derivar contratos dos modelos do Prisma com `Pick` ou `Omit` quando aplicável. Manter cada contrato compartilhado em um único arquivo de contexto em `types/` e não duplicá-lo nos módulos de implementação.

Esta regra define a estrutura atual do backend e orienta como adaptar TechSpecs e listas de arquivos que descrevam outra organização. Ao fazê-lo, preservar os requisitos funcionais e as garantias de segurança e concorrência.

### Testes dos módulos

Testes permanecem adjacentes à implementação: `<recurso>-<camada>.test.ts` para unidade e `<recurso>-<camada>.integration.test.ts` para integração. A consolidação dos módulos acima deve agrupar os cenários existentes nestes arquivos:

```text
services/
├── auth-service.test.ts
├── auth-service.integration.test.ts
├── security-service.test.ts
└── resend-service.test.ts
repositories/
├── auth-repository.test.ts
└── auth-repository.integration.test.ts
schemas/
└── auth-schema.test.ts
routers/
└── auth-router.integration.test.ts
middlewares/
└── validation-middleware.test.ts
```

Organizar os cenários das funções públicas em blocos `describe`; exercitar auxiliares privados pelo comportamento público, sem exportá-los apenas para testes. Os demais testes existentes continuam junto aos seus módulos. Se necessário para respeitar o limite de tamanho, dividir testes por grupos coesos de cenários, mantendo o nome do módulo como prefixo.

Preservar os cenários críticos durante a consolidação e seguir `tests.md`, incluindo cobertura mínima de 80%. Ao concluir uma refatoração do backend, executar nele `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`.

### Fluxo esperado

```text
requisição HTTP → routers → middlewares → controllers → services → repositories → banco
```

As dependências de negócio seguem esse fluxo, sem imports da camada anterior. `config/`, `errors/` e `types/` podem ser utilizados pelas camadas e não dependem delas. Middlewares podem consumir services para autenticação e schemas para validação. Services podem consumir outros services de responsabilidade própria, como segurança e envio de e-mail. Dentro da mesma camada, importar o módulo específico, nunca o `index.ts` da própria pasta, evitando ciclos. Erros de domínio são lançados nos services e convertidos em respostas HTTP pelo middleware de erros.

## Frontend

```text
frontend/
├── public/
├── src/
│   ├── components/
│   ├── views/
│   ├── services/
│   ├── hooks/
│   ├── assets/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

- `components/`: componentes reutilizáveis de interface. Componentes específicos de uma tela podem permanecer organizados em subpastas próprias.
- `views/`: telas e páginas da aplicação, responsáveis por compor componentes e coordenar o estado da tela.
- `services/`: acesso ao backend, incluindo clientes HTTP, chamadas de endpoints e transformação de respostas da API.
- `hooks/`: hooks React reutilizáveis e lógica de estado ou comportamento compartilhado entre componentes e views.
- `assets/`: imagens, ícones, fontes e outros recursos importados pelo código da aplicação.
- `types/`: tipos usados pelo frontend. Cada tipo deve ficar em um arquivo próprio, com nome correspondente ao conceito representado.
- `public/`: arquivos estáticos servidos diretamente, sem processamento pelo bundler.
- `*.test.ts` e `*.test.tsx`: testes unitários e de componentes devem ficar próximos ao código testado, dentro de `src/`, quando aplicável.

### Fluxo esperado

```text
view → components/hooks → services → backend
```

Componentes e views não devem duplicar a lógica de acesso ao backend; esse acesso deve ser encapsulado em `services/`.

## Testes E2E

```text
e2e/
└── *.spec.ts
```

Os testes E2E usam Playwright e validam fluxos completos pela perspectiva do usuário. Devem ficar fora de `frontend/` e `backend/`. Testes unitários e de integração permanecem junto ao código da aplicação, em `frontend/src/` ou `backend/src/`.

## Convenções

- Crie uma pasta nova somente quando ela representar uma responsabilidade clara e recorrente.
- Evite colocar regras de negócio em `routers`, `controllers`, `components` ou `views`.
- Evite acessar o backend diretamente a partir de `components` ou `views`; use `services/`.
- Mantenha os arquivos de configuração na raiz do aplicativo ao qual pertencem.
