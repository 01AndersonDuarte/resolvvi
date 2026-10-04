# Backend de processos judiciais

O backend fornece a base para persistir processos e movimentações processuais. O arquivo `lawsuits_movements.csv` será usado uma única vez como seed inicial, sem criar uma rotina geral de importação.

## Pré-requisitos

- Node.js 24.11.0 e npm 11, conforme `.nvmrc` e `package-lock.json`.
- Docker com Compose para o PostgreSQL local.

## Instalação e banco local

```bash
npm ci
cp .env.development.example .env.development
cp .env.test.example .env.test
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate -- --name process-movement
```

Os arquivos `.env` reais não são versionados. O Compose inicia o projeto e o banco `dev_test_resolvvi` em `127.0.0.1:55432`, com o usuário local `dev_test_resolvvi`. O arquivo `.env.test` aponta para `dev_test_resolvvi_test_template`; aplique a migration nesse banco antes de rodar os testes de integração:

```bash
NODE_ENV=test npx prisma migrate deploy
```

## Servidor HTTP

Configure `PORT` e `PUBLIC_APP_URL` no `.env.development`. O servidor valida essas opções antes de abrir a porta; `PUBLIC_APP_URL` deve ser uma origem sem caminho, credenciais, query ou fragmento. O seed e as migrations usam apenas a configuração de banco e não exigem credenciais do Resend.

```bash
npm run dev
```

O health check `GET /health` confirma somente que o processo HTTP está respondendo. Solicitações de escrita exigem `Origin` igual a `PUBLIC_APP_URL`, conteúdo `application/json` e corpo de até 8 KiB.

Encerre o PostgreSQL local com `docker compose down`.

## Carga inicial do CSV

Depois de aplicar a migration, execute a partir de `backend/` para carregar o arquivo `lawsuits_movements.csv` na base indicada por `DATABASE_URL`:

```bash
npm run seed
```

O seed é uma carga única para uma base vazia e grava os processos e movimentos em uma transação. Não o execute novamente em uma base já populada; o comando não implementa reexecução nem atualização incremental.

Na validação de 3 de outubro de 2026, a carga em uma base vazia criou 100 processos e 5.568 movimentos. A conferência comparou os campos persistidos com os registros do CSV, incluindo textos, datas e conteúdo ausente, e verificou a ordenação por data e ordem de origem.

## Validações

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

`npm test` e `npm run test:coverage` exigem `.env.test` com `NODE_ENV=test`, `DATABASE_URL` e um `DATABASE_LABEL` terminado em `_test`. A suíte falha explicitamente se o banco isolado não estiver configurado; ela não ignora testes de integração silenciosamente.
