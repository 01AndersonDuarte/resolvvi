# Especificação técnica

## Resumo

Esta especificação deriva do [PRD](./prd.md) e define somente o modelo de processos, o modelo de movimentações e o seed inicial do CSV fornecido. A solução usa PostgreSQL com Prisma no backend TypeScript e um comando de execução única.

O seed lê o arquivo conhecido, transforma seus registros em entidades e grava processo e movimentações em uma transação. Não há entidade, relatório, diário, lock ou serviço de recuperação de importação.

## Arquitetura do sistema

### Visão dos componentes

| Componente | Responsabilidade |
| --- | --- |
| `backend/src/config/` | Carregar a URL e o identificador do banco e fornecer logging básico. |
| `backend/prisma/schema.prisma` | Declarar Processo, Movimentação e seus vínculos. |
| `backend/src/domain/` | Tipos e transformações pequenas do domínio, sem acesso a I/O. |
| `backend/src/seed/` | Ler o CSV conhecido, mapear registros e executar a transação do seed. |
| `backend/src/repositories/` | Encapsular o Prisma para persistir processos e movimentações. |
| `backend/src/**/*.test.ts` | Testes unitários do mapeamento e testes de integração da persistência. |

O fluxo é `comando de seed → leitura do CSV → mapeamento → transação Prisma → PostgreSQL`. O seed agrupa os registros pelo CNJ apenas para criar cada processo uma vez durante essa execução; isso não é uma regra de deduplicação de movimentações nem uma capacidade de reexecução.

## Design de implementação

### Principais interfaces

O contrato do mapeamento deve ser pequeno e específico para o arquivo desta etapa:

```text
parseSeedFile(filePath: string) -> SeedData[]
persistSeed(data: SeedData[]) -> Promise<void>
```

`SeedData` representa um processo e suas movimentações já convertidos para os tipos persistidos. O parser deve configurar explicitamente as oito colunas conhecidas e aceitar aspas e quebras de linha dentro de campos, conforme o CSV fornecido.

### Modelos de dados

#### `Process` — processo judicial

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | `Int` | sim | Identificador interno da relação. |
| `cnj` | `String` | sim | Número CNJ, com restrição única. |
| `forum` | `String` | sim | Foro informado pela fonte. |
| `court` | `String` | sim | Vara informada pela fonte. |
| `lawsuitValue` | `Decimal` | sim | Valor da ação sem conversão para moeda. |
| `numberOfAuthors` | `Int` | sim | Quantidade de autores. |
| `movements` | `Movement[]` | sim | Movimentações vinculadas ao processo. |

```text
Process { cnj: "1001399-31.2023.8.26.0070", forum: "Foro de Batatais", court: "2ª Vara Cível" }
```

#### `Movement` — movimentação processual

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | `Int` | sim | Identificador interno da movimentação. |
| `processId` | `Int` | sim | Chave estrangeira para `Process`. |
| `movementDate` | `Date` | sim | Data civil da origem, sem fuso. |
| `movementTitle` | `String` | sim | Título da movimentação. |
| `movementContent` | `String` | não | Conteúdo; vazio é persistido como ausência. |
| `sourceOrder` | `Int` | sim | Posição do registro lógico no CSV, usada como desempate. |

```text
Movement { movementDate: "2023-12-05", movementTitle: "Certidão de Publicação Expedida", movementContent: null, sourceOrder: 1 }
```

O esquema terá `Process.cnj @unique`, chave estrangeira obrigatória de `Movement.processId` e índice em `(processId, movementDate, sourceOrder)`. `sourceOrder` é apenas um dado técnico para ordenar a carga desta fonte; não representa horário ou ordem judicial.

#### Mapeamento do CSV → domínio

| CSV | Domínio |
| --- | --- |
| `lawsuit_number` | `Process.cnj` |
| `lawsuit_forum` | `Process.forum` |
| `lawsuit_court` | `Process.court` |
| `lawsuit_value` | `Process.lawsuitValue` |
| `lawsuit_number_of_authors` | `Process.numberOfAuthors` |
| `movement_date` | `Movement.movementDate` |
| `movement_title` | `Movement.movementTitle` |
| `movement_content` | `Movement.movementContent` |

O parser usa o contrato exato do cabeçalho. A conversão da data e do valor deve ser determinística e suficiente para os valores existentes no arquivo, sem normalização de dados ausentes ou inventados.

### Endpoints da API

Não há endpoints nesta etapa.

## Pontos de integração

Não há integrações externas. A única dependência operacional é o PostgreSQL configurado em `DATABASE_URL` e o arquivo local fornecido.

## Abordagem de testes

Os testes seguem `.agents/rules/tests.md`, usam Vitest e não criam infraestrutura de ETL artificial. A integração de persistência usa uma base controlada; o CSV original permanece somente leitura.

### Testes de unidade

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TU-01 | Mapear as oito colunas do registro | CA-02 | Os campos chegam ao domínio sem perda de texto ou conteúdo opcional. |
| TU-02 | Converter data, valor e quantidade | CA-02 | Os tipos persistidos correspondem aos valores fornecidos. |
| TU-03 | Preservar a ordem de origem | CA-03 | Registros com a mesma data mantêm `sourceOrder`. |

### Testes de integração

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TI-01 | Criar processos e movimentações relacionadas | CA-01, CA-03 | O seed completo produz 100 processos e 5.568 movimentações sem órfãos. |
| TI-02 | Respeitar unicidade do CNJ | CA-04 | O banco rejeita um segundo processo com o mesmo CNJ. |
| TI-03 | Falhar sem persistência parcial | CA-05 | Arquivo inválido ou falha transacional não deixa dados do seed incompletos. |

### Testes E2E

Não aplicável: não há interface ou fluxo externo. A execução do comando é coberta pelo teste de integração do seed.

## Sequenciamento do desenvolvimento

### Ordem de construção

1. Manter a configuração, os scripts, o logger e o PostgreSQL local já preparados.
2. Criar o schema Prisma, a migration e os repositórios das duas entidades.
3. Implementar o parser específico e o comando de seed em uma transação.
4. Executar a suíte unitária e de integração com o CSV fornecido e registrar os resultados nos arquivos da tarefa.

### Dependências técnicas

- PostgreSQL local disponível por Docker Compose.
- Prisma e seu cliente gerado no backend.
- Parser CSV configurado para UTF-8, vírgula, aspas e registros multilinha.
- Nenhuma rede externa ou serviço de terceiros.

## Monitoramento e observabilidade

Não há observabilidade específica do seed. O comando deve emitir uma mensagem simples de início, sucesso ou erro por meio do logger existente, sem registrar conteúdo processual ou credenciais. Não haverá relatório persistente, métrica de importação ou histórico de execução.

## Considerações técnicas

### Principais decisões

- Usar uma transação única para o seed mantém a base consistente sem criar mecanismo de recuperação.
- Usar `cnj` como chave única do processo representa a regra real do domínio.
- Usar `sourceOrder` preserva a ordem do arquivo em empates de data com um campo simples e explícito.
- Não criar identidade artificial para movimentações: cada registro do CSV representa uma movimentação nesta carga inicial.

### Riscos conhecidos

- O comando é deliberadamente de uso único; uma nova carga exige uma decisão explícita sobre limpeza ou migração do banco.
- O seed depende do contrato do arquivo fornecido. Mudança de colunas ou formato exige revisão desta especificação.
- O conteúdo processual pode conter dados pessoais e deve permanecer no ambiente controlado.

### Conformidade com o AGENTS.md e as rules

Foram lidos `AGENTS.md` e os arquivos em `.agents/rules/`. A implementação deve manter arquivos TypeScript pequenos, dependências em uma direção, configuração centralizada, npm com lock file e testes Vitest FIRST com cobertura mínima de 80%. Não há frontend nesta etapa; a skill React não se aplica.

### Conformidade com skills

Esta revisão usa [criar-prd](../../.agents/skills/criar-prd/SKILL.md), [criar-techspec](../../.agents/skills/criar-techspec/SKILL.md) e [criar-tasks](../../.agents/skills/criar-tasks/SKILL.md) para alinhar os artefatos existentes.

### Arquivos relevantes e dependentes

- `lawsuits_movements.csv`
- `backend/src/config/`
- `backend/prisma/schema.prisma`
- `backend/src/domain/`
- `backend/src/seed/`
- `backend/src/repositories/`
- `backend/src/**/*.test.ts`
- `tasks/prd-fundacao-dominio-ingestao-csv/prd.md`
