# Regras para Node.js

Estas regras se aplicam ao backend Node.js deste projeto e a qualquer código executado no servidor. A organização das camadas citadas aqui está definida em [`folder-structure.md`](folder-structure.md).

## Preferir async/await

Use `async/await` para operações assíncronas. Evite callbacks aninhados, pois eles dificultam a leitura, o tratamento de erros e a composição de operações.

Evite:

```ts
fs.readFile(filePath, 'utf8', (error, content) => {
  if (error) {
    logger.error('Falha ao ler arquivo', error);
    return;
  }

  processContent(content);
});
```

Prefira:

```ts
import { readFile } from 'node:fs/promises';

async function loadFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}
```

## Propagação de erros

Os `services` lançam erros de domínio criados pelas factories de `errors/`. `controllers` e `repositories` não usam `try/catch` para converter erros em resposta; essa conversão é feita exclusivamente pelo middleware de erros.

```ts
// services/team-service.ts
export async function getTeamById(teamId: number) {
  const team = await teamRepository.findTeamById(teamId);
  if (!team) throw notFoundError('Team not found');

  return team;
}

// controllers/team-controller.ts
export async function getTeamById(req: Request, res: Response) {
  const team = await teamService.getTeamById(Number(req.params.teamId));
  res.status(200).send(team);
}
```

O Express 5 encaminha ao middleware de erros as promises rejeitadas nos handlers. Não instale `express-async-errors`.

Erros sem mapeamento em `errors/` são inesperados: registre-os com o `logger` e responda `500` com mensagem genérica. Nunca envie ao cliente o objeto de erro original, sua mensagem interna ou o stack.

```ts
// middlewares/error-handling-middleware.ts
const statusByErrorName: Record<string, number> = {
  InvalidDataError: 400,
  UnauthorizedError: 401,
  NotFoundError: 404,
};

export function handleApplicationErrors(
  error: ApplicationError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = statusByErrorName[error.name];
  if (status) return res.status(status).send({ name: error.name, message: error.message });

  logger.error('Erro inesperado', error);
  return res.status(500).send({ message: 'Internal server error' });
}
```

## Não bloquear o event loop

Não execute operações síncronas ou cálculos pesados no fluxo da requisição. Isso impede que o processo atenda outras requisições enquanto a operação estiver em execução.

Evite chamadas como `readFileSync`, `writeFileSync`, `execSync` e loops longos no handler HTTP. Prefira APIs assíncronas para I/O:

```ts
import { readFile } from 'node:fs/promises';

const content = await readFile(filePath, 'utf8');
```

Para cálculos intensivos de CPU, como criptografia, compressão, processamento de imagens ou grandes agregações, use `worker_threads`, um processo separado ou uma fila de trabalho. A operação deve deixar o event loop livre para continuar atendendo requisições.

Exemplo com `worker_threads`:

```ts
import { Worker } from 'node:worker_threads';

export function runHeavyCalculation(input: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./heavy-calculation-worker.js', import.meta.url), {
      workerData: input,
    });

    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker finalizado com código ${code}`));
    });
  });
}
```

O exemplo assume ESM e um worker já compilado para `.js` em `dist/`. Confirme o formato de módulo e o caminho do arquivo gerado pelo build antes de usar workers, inclusive na execução com `tsx` em desenvolvimento.

Defina limites de tamanho, tempo e concorrência para operações pesadas. Quando a tarefa puder demorar, prefira processá-la de forma assíncrona e retornar um identificador para acompanhamento.

## Variáveis de ambiente com dotenv

Coloque configurações variáveis por ambiente em arquivos `.env` e carregue-as com `dotenv`. Não deixe portas, credenciais, tokens ou URLs específicas de ambiente fixos no código.

O carregamento e a validação ficam em `config/envs.ts`, que escolhe o arquivo pelo `NODE_ENV` e exporta um objeto `env` tipado. O restante da aplicação lê somente `env`, nunca `process.env` diretamente. Como o carregamento ocorre na avaliação do módulo, qualquer arquivo que importe `env` recebe valores já carregados, independentemente da ordem dos imports.

```ts
// config/envs.ts
import dotenv from 'dotenv';

const envFiles: Record<string, string> = {
  development: '.env.development',
  test: '.env.test',
};

dotenv.config({ path: envFiles[process.env.NODE_ENV ?? ''] ?? '.env' });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada`);

  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
};
```

Não versione arquivos `.env` com segredos. Mantenha `.env.development.example` e `.env.test.example` com as chaves necessárias e valores fictícios:

```dotenv
PORT=3000
DATABASE_URL=postgres://usuario:senha@localhost:5432/app
```

Variáveis obrigatórias ausentes devem interromper a inicialização antes de o servidor HTTP abrir.

## Graceful shutdown

Todo servidor HTTP deve tratar `SIGTERM` e `SIGINT`. No desligamento, pare de aceitar novas conexões, aguarde as requisições em andamento dentro de um prazo e feche recursos como banco de dados, filas e consumidores. Esse código fica em `server.ts`.

Erros não capturados (`unhandledRejection` e `uncaughtException`) deixam o processo em estado inconsistente: registre-os e encerre pela mesma rotina, com código de saída `1`.

```ts
// server.ts
const server = app.listen(env.port, () => {
  logger.info(`Servidor iniciado na porta ${env.port}`);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Sinal ${signal} recebido; iniciando desligamento`);

  const forceExit = setTimeout(() => {
    logger.error('Prazo de desligamento excedido');
    process.exit(1);
  }, 10_000);

  server.close(async (error) => {
    if (error) {
      logger.error('Falha ao fechar servidor HTTP', error);
      process.exitCode = 1;
    }

    await prisma.$disconnect();
    clearTimeout(forceExit);
    process.exit();
  });
}

function crash(origin: string, error: unknown): void {
  logger.error(`Erro não tratado (${origin})`, error);
  process.exitCode = 1;
  void shutdown(origin);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => crash('unhandledRejection', reason));
process.on('uncaughtException', (error) => crash('uncaughtException', error));
```

O desligamento deve ser idempotente: sinais repetidos não podem iniciar várias rotinas de encerramento. Em produção, o prazo deve ser compatível com o ambiente de execução.

## Logging centralizado

Use `console.log` e `console.error` somente dentro do adaptador `config/logger.ts`. O restante da aplicação deve depender desse adaptador, permitindo padronizar formato, contexto e futura integração com uma ferramenta de observabilidade.

```ts
// config/logger.ts
type LogContext = Record<string, unknown>;

function formatMessage(message: string, context?: LogContext): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    message,
    ...context,
  });
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.log(formatMessage(message, context));
  },
  error(message: string, error?: unknown, context?: LogContext): void {
    const details = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
    console.error(formatMessage(message, { ...details, ...context }));
  },
};
```

Não registre senhas, tokens, chaves privadas ou dados pessoais desnecessários. Inclua contexto útil, como identificador da requisição, rota e duração, sem expor informações sensíveis.

## Lock files

Prefira o uso do `npm` para instalar e gerenciar bibliotecas neste projeto. Use `npm install <pacote>` para adicionar uma dependência de produção e `npm install --save-dev <pacote>` para adicionar uma dependência de desenvolvimento:

```bash
npm install dotenv
npm install --save-dev vitest
```

Não misture gerenciadores de pacotes no mesmo aplicativo. Evite executar `yarn add` ou `pnpm add` em aplicações que utilizam npm, pois isso pode criar lock files concorrentes e instalações inconsistentes.

Versione o lock file correspondente a cada aplicativo (`package-lock.json`, `yarn.lock` ou `pnpm-lock.yaml`). Como frontend e backend são aplicações independentes, cada pasta deve manter seu próprio lock file.

Use o `package-lock.json` gerado pelo npm. Em CI, prefira a instalação reprodutível com `npm ci` e atualize o lock file junto com alterações nas dependências.

Não ignore ou remova lock files para resolver conflitos de instalação. Revise as alterações geradas e confirme que `package.json` e o lock file permanecem consistentes.

Use `prisma migrate dev` somente em desenvolvimento. Em CI e produção, aplique as migrations com `prisma migrate deploy`, que não gera migrations nem recria o banco.

## Evitar referências circulares

As dependências seguem uma única direção, definida em `folder-structure.md`:

```text
routers → middlewares → controllers → services → repositories
```

Uma camada nunca importa a camada anterior: `repositories` não importam `services`, e `services` não importam `controllers`. `config/`, `errors/` e `protocols.ts` podem ser importados por qualquer camada e não importam nenhuma delas.

Os `index.ts` de cada pasta são a principal fonte de ciclos. Dentro da mesma camada, importe o arquivo específico, nunca o `index.ts` da própria pasta:

```ts
// services/team-service.ts

// Evite: o barrel reexporta team-service.ts, criando um ciclo
import * as authService from '../services';

// Prefira
import * as authService from './auth-service';
```

Extraia contratos compartilhados para `protocols.ts` e funções comuns para módulos independentes. Cada módulo deve ter uma responsabilidade clara e não depender do módulo que o instancia.

Antes de concluir uma alteração, verifique se a nova importação não cria um ciclo indireto. Referências circulares podem produzir objetos parcialmente inicializados, comportamento dependente da ordem de importação e erros difíceis de diagnosticar.
