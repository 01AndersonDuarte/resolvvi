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

Encerre o PostgreSQL local com `docker compose down`.

## Validações

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

`npm test` e `npm run test:coverage` executam os testes de integração no PostgreSQL quando `.env.test` existe e contém `DATABASE_URL`.
