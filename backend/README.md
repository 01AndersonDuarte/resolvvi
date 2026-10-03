# Backend de processos judiciais

O backend fornece a base para persistir processos e movimentações processuais. O arquivo `lawsuits_movements.csv` será usado uma única vez como seed inicial, sem criar uma rotina geral de importação.

## Pré-requisitos

- Node.js 24.11.0 e npm 11, conforme `.nvmrc` e `package-lock.json`.
- Docker com Compose para o PostgreSQL local.

## Instalação

```bash
npm ci
cp .env.development.example .env.development
```

Os arquivos `.env` reais não são versionados. `DATABASE_LABEL` identifica o banco em diagnósticos sem expor a URL.

## PostgreSQL local

```bash
docker compose up -d postgres
docker compose down
```

Por padrão, o banco fica disponível somente em `127.0.0.1:55432`.

## Validações

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

O seed e o modelo de dados serão implementados nas próximas tarefas da funcionalidade.
