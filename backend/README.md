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

Configure `PORT` e `PUBLIC_APP_URL` no `.env.development`. O servidor valida essas opções antes de abrir a porta; `PUBLIC_APP_URL` deve ser uma origem sem caminho, credenciais, query ou fragmento.

O cadastro valida somente a estrutura sintática do e-mail. O endereço não precisa existir ou receber mensagens; a conta é criada com e-mail e senha e pode entrar imediatamente.

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

## Jornadas E2E

As jornadas Playwright usam uma base PostgreSQL dedicada. Crie `dev_test_resolvvi_e2e_test` no PostgreSQL local, aplique as migrations e carregue a fixture processual antes de executar `npm run test:e2e` em `frontend/`. O servidor E2E inicia um endpoint de controle separado, limitado a `127.0.0.1:3051`, para expirar sessões durante os testes; esse endpoint não faz parte da API de produção.

```bash
docker exec dev_test_resolvvi-postgres-1 createdb -U dev_test_resolvvi dev_test_resolvvi_e2e_test
cd backend
NODE_ENV=test DATABASE_LABEL=dev_test_resolvvi_e2e_test DATABASE_URL=postgresql://dev_test_resolvvi:dev_test_resolvvi@localhost:55432/dev_test_resolvvi_e2e_test npx prisma migrate deploy
NODE_ENV=test DATABASE_LABEL=dev_test_resolvvi_e2e_test DATABASE_URL=postgresql://dev_test_resolvvi:dev_test_resolvvi@localhost:55432/dev_test_resolvvi_e2e_test npm run seed
cd ../frontend
npm run test:e2e
```

O Playwright inicia API, endpoint de controle e SPA nas portas 3050, 3051 e 5100. Confirme que estão livres antes da execução; ajuste `E2E_API_PORT`, `E2E_CONTROL_PORT`, `E2E_APP_URL` e `E2E_DATABASE_URL` se o ambiente usar outros valores. O PostgreSQL existente é compartilhado como serviço, mas a base de dados acima é isolada das bases de desenvolvimento e integração.
