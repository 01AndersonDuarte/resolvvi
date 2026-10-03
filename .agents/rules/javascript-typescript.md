# Regras de JavaScript e TypeScript

Estas regras se aplicam a todo código JavaScript e TypeScript do frontend e do backend. Em caso de conflito, siga a regra mais específica do contexto, desde que ela não reduza a segurança ou a clareza do código.

## Preferir `const`

Use `const` por padrão. Use `let` somente quando a variável precisar receber um novo valor. Nunca use `var`, pois ele possui escopo de função e pode permitir reatribuições difíceis de rastrear.

Evite:

```ts
var total = 0;
let name = 'Ana';
name = 'Bia';
```

Prefira:

```ts
const total = 0;
let name = 'Ana';
name = 'Bia';
```

Mesmo objetos e arrays declarados com `const` podem ter seu conteúdo alterado. Para evitar mutações acidentais, prefira criar novos valores com `map`, `filter` e spread:

```ts
type User = {
  id: string;
  name: string;
  active: boolean;
  isAdmin: boolean;
};

function activateUser(user: User): User {
  return { ...user, active: true };
}
```

## Comparações explícitas

Use sempre `===` e `!==`. Nunca use `==` ou `!=`, pois a conversão implícita de tipos pode produzir resultados inesperados.

Evite:

```ts
if (userId == 0 || status != 'active') {
  return false;
}
```

Prefira:

```ts
if (userId === 0 || status !== 'active') {
  return false;
}
```

Para valores opcionais, avalie explicitamente a condição necessária. Use `??` quando a intenção for tratar somente `null` e `undefined`, e use `||` somente quando valores falsy, como string vazia ou zero, também forem inválidos:

```ts
const displayName = user.name ?? 'Usuário sem nome';
const pageSize = configuredPageSize || DEFAULT_PAGE_SIZE;
```

## Tipagem explícita e segura

Evite `any`. Prefira tipos concretos do domínio e use `unknown` para valores externos ou desconhecidos, validando-os antes do uso.

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getMessage(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.message !== 'string') {
    return undefined;
  }

  return value.message;
}
```

Tipar explicitamente parâmetros e retornos que envolvam objetos. Prefira tipos nomeados a objetos anônimos repetidos:

```ts
type CreateProductInput = {
  name: string;
  priceInCents: number;
};

type Product = CreateProductInput & {
  id: string;
};

function createProduct(input: CreateProductInput): Product {
  return { id: crypto.randomUUID(), ...input };
}
```

Tipar retornos primitivos quando isso tornar o contrato mais claro. Funções assíncronas devem declarar `Promise<T>`:

```ts
async function loadProduct(id: string): Promise<Product> {
  return productRepository.findById(id);
}
```

Use genéricos somente em abstrações realmente reutilizáveis, com nomes descritivos como `TData` ou `TResult`. Para casos específicos, prefira tipos concretos do domínio.

Use `any` apenas quando tecnicamente inevitável, mantendo-o isolado, documentado e impedindo sua propagação pelo restante da aplicação.

## Arrow functions

Prefira arrow functions em callbacks, como os usados por `map`, `filter`, `reduce`, `sort` e `Promise.then`:

```ts
const activeNames = users
  .filter((user: User) => user.active)
  .map((user: User) => user.name);
```

Não substitua funções principais nomeadas por arrow functions apenas por preferência estilística. Funções principais de módulos, serviços e handlers devem continuar declaradas com `function` quando isso melhorar sua identificação e stack trace:

```ts
function listActiveUsers(users: User[]): string[] {
  return users.filter((user: User) => user.active).map((user: User) => user.name);
}
```

Evite callbacks aninhados. Extraia a lógica para funções nomeadas ou use `async/await`, conforme as regras de Node.js.

## Ternários simples

Use ternário somente para uma decisão curta e direta. Nunca aninhe ternários e não use ternários como operadores de atribuição condicional ou para executar efeitos colaterais.

Evite:

```ts
const label = isAdmin ? (isActive ? 'Administrador ativo' : 'Administrador inativo') : 'Usuário';
isReady ? startProcess() : stopProcess();
```

Prefira:

```ts
const label = isAdmin ? 'Administrador' : 'Usuário';

if (isReady) {
  startProcess();
} else {
  stopProcess();
}
```

Quando houver mais de uma condição, use `if`, cláusulas de guarda ou extraia uma função com nome expressivo:

```ts
function getAccessLabel(user: User): string {
  if (!user.active) {
    return 'Inativo';
  }

  return user.isAdmin ? 'Administrador' : 'Usuário';
}
```

## Imutabilidade e operações de coleção

Não altere parâmetros, estado ou coleções compartilhadas diretamente. Retorne novos objetos e arrays. Use `map` para transformar, `filter` para selecionar, `find` para buscar um elemento e `reduce` somente quando a redução representar claramente a intenção.

Evite:

```ts
function addTag(tags: string[], tag: string): string[] {
  tags.push(tag);
  return tags;
}
```

Prefira:

```ts
function addTag(tags: string[], tag: string): string[] {
  return [...tags, tag];
}
```

Não mutile objetos recebidos como argumentos. Quando a ordenação for necessária, copie a coleção antes de usar `sort`:

```ts
function sortByName(users: User[]): User[] {
  return [...users].sort((first: User, second: User) => first.name.localeCompare(second.name));
}
```

## Tratamento de erros

Lance instâncias de `Error` com mensagens úteis. Não capture um erro apenas para ignorá-lo e não converta automaticamente todo valor capturado em `Error` sem preservar o contexto:

```ts
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

async function loadData(): Promise<Data> {
  try {
    return await dataRepository.load();
  } catch (error: unknown) {
    throw new Error(`Falha ao carregar dados: ${getErrorMessage(error)}`, { cause: error });
  }
}
```

Use `unknown` no parâmetro de `catch` quando essa opção estiver disponível. Trate o erro na camada que tiver contexto suficiente para decidir a resposta ou a recuperação.

## Imports, módulos e nomes

Use módulos ES com `import` e `export`. Remova imports não utilizados e evite exportar símbolos que não façam parte do contrato do módulo.

Prefira nomes completos e expressivos. Use `is`, `has` e `can` para funções booleanas, como `isValidEmail`, `hasPermission` e `canPublish`. Evite abreviações que não sejam universalmente compreendidas.

Mantenha funções curtas, com uma única responsabilidade, e extraia constantes para números, strings e expressões regulares que representem regras de negócio. Respeite também os limites de tamanho definidos em `code-standards.md`.

## Validação obrigatória

Ao concluir qualquer tarefa que altere código JavaScript ou TypeScript, execute o linter do aplicativo afetado. Neste repositório, use:

```bash
cd frontend
npm run lint
```

O backend ainda não possui script de lint. Quando um linter for configurado nele, execute o comando correspondente ao final de cada alteração. O linter não substitui `typecheck`, build ou testes; execute também as validações exigidas pelo aplicativo e pela natureza da mudança.
