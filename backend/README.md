# Backend

API HTTP em Node.js, Express 5 e TypeScript. O PostgreSQL é acessado por Prisma; as migrações ficam em `prisma/migrations/` e o seed inicial importa `../lawsuits_movements.csv`.

Consulte o [README da raiz](../README.md) para requisitos, configuração dos ambientes, execução via Docker Compose ou local, preparação dos bancos, testes e fluxo E2E.

O Compose completo fica em `../compose.yaml` e deve ser iniciado a partir da raiz do repositório.

Comandos principais executados dentro de `backend/`:

```bash
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Os testes de integração exigem `NODE_ENV=test`, `.env.test` e um banco isolado cujo nome contenha `_test` e cujo `DATABASE_LABEL` termine em `_test`.
