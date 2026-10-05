# Resolvvi

Aplicação web para consulta de processos judiciais e movimentações. O projeto contém uma interface React, uma API Node.js/Express e um banco PostgreSQL gerenciado pelo Prisma. O backend também oferece cadastro e autenticação de usuários e geração opcional de resumos processuais por IA.

## Funcionalidades

- Cadastro, login, leitura de sessão e logout de usuários.
- Consulta de processos por número CNJ e visualização paginada das movimentações.
- Geração opcional de resumos processuais por IA e registro de feedback.
- Importação inicial dos processos e movimentações a partir de `lawsuits_movements.csv`.
- Verificação de disponibilidade da API pelo endpoint `GET /health`.

As rotas da API ficam sob `/api`; as operações de autenticação, processos e resumos exigem sessão, exceto cadastro e login. O endereço `/health` é servido fora desse prefixo.

## Formas de executar

Há dois caminhos para desenvolvimento. Nos dois, configure os arquivos de ambiente antes de iniciar a aplicação ou executar testes.

| Caminho | Quando usar | Serviços |
| --- | --- | --- |
| [Docker Compose](#opção-1-docker-compose) | Subir a aplicação e o banco com um comando | PostgreSQL, migrações, seed, backend e frontend em containers |
| [Execução local](#opção-2-execução-local) | Executar frontend e backend com Node.js e usar PostgreSQL local na porta 5432 | Frontend e backend no host; PostgreSQL instalado localmente |

O repositório não tem `package.json` na raiz. Instale dependências e execute scripts dentro de `frontend/` ou `backend/`.

## Requisitos

- Node.js 24.11.x e npm 11 para a execução local.
- PostgreSQL acessível em `localhost:5432` para a execução local.
- Docker com Docker Compose para a opção em containers.
- Git para clonar o repositório.

## Configuração obrigatória

Crie os arquivos locais a partir dos exemplos:

```bash
cp -n backend/.env.development.example backend/.env.development
cp -n backend/.env.test.example backend/.env.test
cp -n frontend/.env.development.example frontend/.env.development.local
```

Edite `backend/.env.development` e `backend/.env.test` com as credenciais do PostgreSQL e os nomes dos bancos que você criou. O arquivo de desenvolvimento deve apontar para o banco de desenvolvimento; o arquivo de teste deve apontar para uma base isolada cujo nome contenha `_test` e cujo `DATABASE_LABEL` termine em `_test`. Nunca use o banco de desenvolvimento ou produção para executar os testes de integração.

Se os arquivos já existirem, preserve os valores atuais e compare-os com os exemplos para incluir variáveis novas. Em particular, o Compose exige `DATABASE_URL_DOCKER`, `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` em `backend/.env.development`.

`backend/.env.development.example` já mostra um usuário local de exemplo e `localhost:5432`. Troque usuário, senha e nomes de bancos se forem diferentes na sua máquina. Para a opção Docker, mantenha sincronizados `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `DATABASE_URL_DOCKER`; essa URL usa o nome de serviço `postgres`, acessível dentro da rede do Compose. `COMPOSE_POSTGRES_PORT` escolhe a porta publicada no host.

Os arquivos `.env` são ignorados pelo Git. Não inclua credenciais reais em commits. A geração de resumos por IA vem desabilitada (`SUMMARY_ENABLED=false`); para habilitá-la, configure uma chave em `SUMMARY_API_KEY` e revise as configurações do provedor.

Se usuário ou senha do PostgreSQL contiverem caracteres reservados de URL, codifique-os nas variáveis `DATABASE_URL` e `DATABASE_URL_DOCKER`.

## Opção 1: Docker Compose

O Compose na raiz inicia o PostgreSQL, espera o banco ficar pronto, aplica as migrações Prisma, carrega o CSV inicial em uma base vazia e então inicia API e interface.

Depois de criar e configurar os arquivos de ambiente da seção anterior, execute na raiz:

```bash
docker compose --env-file backend/.env.development up --build
```

Abra:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000>
- Health check: <http://localhost:3000/health>
- PostgreSQL: `localhost:${COMPOSE_POSTGRES_PORT}` (5432 por padrão)

O PostgreSQL usa o volume persistente `resolvvi_postgres-data`. Em inicializações seguintes, o Prisma aplica apenas migrações pendentes e o seed não duplica registros: ele é ignorado quando já existe ao menos um processo. Para começar com outro banco vazio, configure outro volume/projeto ou remova intencionalmente os dados existentes.

Comandos úteis:

```bash
# Acompanhar logs
docker compose --env-file backend/.env.development logs -f

# Parar os serviços, mantendo o banco e seus dados
docker compose --env-file backend/.env.development down

# Parar e apagar também o volume persistente do PostgreSQL
docker compose --env-file backend/.env.development down --volumes
```

Se a porta 5432 já estiver ocupada, ajuste `COMPOSE_POSTGRES_PORT` em `backend/.env.development`, por exemplo para `5433`, e execute o Compose novamente. Dentro dos containers, o backend continua usando `postgres:5432`; essa alteração afeta apenas a porta publicada no host.

## Opção 2: execução local

Esta opção executa frontend e backend diretamente na máquina e conecta a um PostgreSQL local em `localhost:5432`.

### 1. Preparar PostgreSQL

Crie um usuário e bancos separados para desenvolvimento, testes de integração e E2E. Os comandos abaixo são um exemplo para PostgreSQL local; ajuste usuário e senha aos valores configurados nos arquivos `.env`:

```bash
psql -h localhost -p 5432 -U postgres
```

No prompt do `psql`:

```sql
CREATE ROLE dev_test_resolvvi LOGIN PASSWORD 'dev_test_resolvvi';
CREATE DATABASE dev_test_resolvvi OWNER dev_test_resolvvi;
CREATE DATABASE dev_test_resolvvi_test_template OWNER dev_test_resolvvi;
CREATE DATABASE dev_test_resolvvi_e2e_test OWNER dev_test_resolvvi;
```

Se o papel já existir, não o crie novamente. Garanta que as URLs e os nomes de banco em `backend/.env.development` e `backend/.env.test` correspondam às bases criadas.

### 2. Instalar dependências

Use `npm ci` em cada aplicativo para instalar as versões registradas nos lockfiles:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

`npm run install` não é um script deste projeto; o comando padrão para instalar dependências é `npm install` (ou `npm ci` para reproduzir o lockfile).

### 3. Aplicar migrações e carregar o seed de desenvolvimento

No banco indicado por `backend/.env.development`:

```bash
cd backend
npm run prisma:generate
npx prisma migrate deploy
npm run seed
```

O seed lê `lawsuits_movements.csv` e deve ser executado em uma base vazia. Ele pula a carga quando já encontra processos, para permitir reiniciar a aplicação sem duplicar os dados.

### 4. Iniciar backend e frontend

Em um terminal:

```bash
cd backend
npm run dev
```

Em outro terminal:

```bash
cd frontend
npm run dev
```

A interface fica em <http://localhost:5173> e a API em <http://localhost:3000>. O proxy Vite encaminha `/api` para a API; ajuste `VITE_API_PROXY_TARGET` em `frontend/.env.development.local` caso o backend esteja em outro endereço.

## Testes e validações

Configure `backend/.env.test` antes de executar os testes do backend. A URL e `DATABASE_LABEL` devem identificar uma base isolada de testes; os testes de integração verificam `_test` no nome da base e no final de `DATABASE_LABEL`.

### Backend

Prepare o banco de teste e aplique as migrações uma vez:

```bash
cd backend
NODE_ENV=test npm run prisma:generate
NODE_ENV=test npx prisma migrate deploy
```

Execute os testes e verificações:

```bash
NODE_ENV=test npm test
NODE_ENV=test npm run test:coverage
npm run lint
npm run typecheck
npm run build
```

### Frontend

```bash
cd frontend
npm test
npm run test:coverage
npm run lint
npm run typecheck
npm run build
```

### Testes E2E (Playwright)

Os testes E2E usam uma terceira base, `dev_test_resolvvi_e2e_test`, distinta das bases de desenvolvimento e de integração. A base precisa existir, ter as migrações aplicadas e conter os dados do CSV. Instale também o Chromium do Playwright com `npx playwright install chromium` dentro de `frontend/`. A configuração padrão usa PostgreSQL em `localhost:5432`; informe `E2E_DATABASE_URL` se sua instância usar outra porta ou credenciais:

```bash
cd backend
NODE_ENV=test npm run prisma:generate
E2E_DATABASE_URL=postgresql://dev_test_resolvvi:dev_test_resolvvi@127.0.0.1:5432/dev_test_resolvvi_e2e_test \
  NODE_ENV=test DATABASE_LABEL=dev_test_resolvvi_e2e_test \
  DATABASE_URL=postgresql://dev_test_resolvvi:dev_test_resolvvi@127.0.0.1:5432/dev_test_resolvvi_e2e_test \
  npx prisma migrate deploy

NODE_ENV=test DATABASE_LABEL=dev_test_resolvvi_e2e_test \
  DATABASE_URL=postgresql://dev_test_resolvvi:dev_test_resolvvi@127.0.0.1:5432/dev_test_resolvvi_e2e_test \
  npm run seed

cd ../frontend
E2E_DATABASE_URL=postgresql://dev_test_resolvvi:dev_test_resolvvi@127.0.0.1:5432/dev_test_resolvvi_e2e_test \
  npm run test:e2e
```

Se suas credenciais contiverem caracteres especiais, codifique-os para URL antes de colocá-los em `DATABASE_URL` ou `E2E_DATABASE_URL`. O Playwright inicia a API, o endpoint de controle E2E e o frontend nas portas 3050, 3051 e 5100 por padrão; elas precisam estar livres.

## Configurações relevantes

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL para execução local, carregada pelo ambiente backend correspondente |
| `DATABASE_URL_DOCKER` | URL PostgreSQL interna usada pelo backend dentro do Compose |
| `DATABASE_LABEL` | Nome/identificador do banco, usado também para proteger testes de integração |
| `PORT` | Porta HTTP do backend; padrão `3000` |
| `PUBLIC_APP_URL` | Origem permitida para requisições de escrita; padrão local `http://localhost:5173` |
| `VITE_API_PROXY_TARGET` | Destino do proxy `/api` do Vite |
| `SUMMARY_ENABLED` | Habilita ou desabilita resumo processual por IA |
| `SUMMARY_API_KEY` | Credencial do provedor quando a geração de resumo estiver habilitada |
| `E2E_DATABASE_URL` | URL da base isolada usada pelo Playwright |

## Estrutura do repositório

```text
.
├── backend/              # API Express, Prisma, migrações, seed e testes
├── frontend/             # Interface React/Vite, testes e configuração Playwright
├── compose.yaml          # Stack local completa em containers
└── lawsuits_movements.csv # Dados usados pelo seed inicial
```

Os diretórios `backend/` e `frontend/` têm `package.json`, lockfile e scripts próprios. Consulte também [backend/README.md](backend/README.md) e [frontend/README.md](frontend/README.md).
