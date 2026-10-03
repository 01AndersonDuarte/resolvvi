# Backend do importador CSV

Este aplicativo conterá o comando operacional de ingestão descrito na TechSpec. Nesta primeira tarefa estão disponíveis a configuração, o logging, a infraestrutura de testes e o PostgreSQL local. Os comandos de importação serão adicionados na tarefa 7.

## Pré-requisitos

- Node.js 24.11.0 e npm 11, conforme `.nvmrc` e `package-lock.json`.
- Docker com Compose para o PostgreSQL 17 usado no desenvolvimento e nos testes de integração futuros.

## Instalação

```bash
npm ci
cp .env.development.example .env.development
```

Os arquivos `.env` reais não são versionados. `DATABASE_LABEL` identifica o destino em diagnósticos sem revelar a URL ou credenciais. O diretório de relatórios é resolvido a partir da raiz de `backend/`.

## PostgreSQL local

```bash
docker compose up -d postgres
docker compose down
```

Por padrão, o banco fica disponível somente em `127.0.0.1:55432`. Em outra worktree, defina `COMPOSE_PROJECT_NAME` e `POSTGRES_PORT` exclusivos antes de iniciar o Compose. Não compartilhe uma base de teste entre workers: a infraestrutura em `test-support/database-fixture.ts` gera nomes por worker e recusa criar ou remover bancos sem o prefixo `harness_test_`.

## Validações

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

A cobertura usa V8 e falha abaixo de 80% em linhas, instruções, funções ou ramificações. O Playwright está configurado como runner de CLI, sem instalação de navegador; os testes E2E e `npm run test:e2e` serão implementados na tarefa 8.

