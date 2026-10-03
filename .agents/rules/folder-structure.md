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

```text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   ├── routers/
│   ├── middlewares/
│   ├── schemas/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── errors/
│   ├── protocols.ts
│   ├── app.ts
│   └── server.ts
├── .env.development.example
├── .env.test.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

- `prisma/schema.prisma`: modelos e datasource do banco. `prisma/migrations/`: migrations geradas pelo Prisma; não devem ser editadas manualmente.
- `config/`: carregamento e validação das variáveis de ambiente por `NODE_ENV`, exportadas como `env` (`envs.ts`), instância única do `PrismaClient` (`database.connection.ts`) e adaptador de logging (`logger.ts`).
- `routers/`: registra as rotas de um recurso, encadeando middlewares e o controller correspondente. Não contém lógica.
- `middlewares/`: autenticação, validação de `body` com schemas e tratamento centralizado de erros, que converte erros da aplicação em status HTTP.
- `schemas/`: schemas Joi de validação das entradas, tipados com os tipos de `protocols.ts`.
- `controllers/`: extraem dados da requisição, chamam o service e montam a resposta HTTP. Não contêm regras de negócio.
- `services/`: regras de negócio. Lançam erros de `errors/` e não dependem de `Request` ou `Response`.
- `repositories/`: único ponto de acesso ao banco, via Prisma.
- `errors/`: uma factory por erro de domínio, retornando `ApplicationError` (`name` e `message`).
- `protocols.ts`: tipos compartilhados da aplicação, preferencialmente derivados dos modelos do Prisma (`Omit`, `Pick`).
- `app.ts`: cria e configura o Express (env, CORS, JSON, rotas e middleware de erros) e exporta a instância, sem chamar `listen`.
- `server.ts`: inicia o servidor na porta de `env.port` e trata o graceful shutdown.
- Cada pasta de `src/` expõe seus módulos por um `index.ts`. Os arquivos seguem o padrão `<recurso>-<camada>.ts`, como `team-router.ts`, `team-controller.ts`, `team-service.ts`, `team-repository.ts` e `team-schema.ts`.
- `*.test.ts`: testes unitários e de integração devem ficar próximos ao código testado, dentro de `src/`, quando aplicável.

### Fluxo esperado

```text
requisição HTTP → routers → middlewares → controllers → services → repositories → banco
```

Cada camada depende apenas da seguinte. Erros são lançados nos `services` e tratados exclusivamente pelo middleware de erros.

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
