# Especificação técnica

## Resumo

Esta especificação deriva do [PRD](./prd.md), especialmente RF1–RF18, CA-01–CA-21 e RNF1–RNF6. A entrega será um importador operacional em Node.js e TypeScript, executado manualmente, com PostgreSQL e Prisma. Banco e identidade de movimentação por CNJ, data, título e conteúdo normalizados foram confirmados pelo solicitante durante o esclarecimento. O checkout inspecionado contém documentação e CSV, mas não contém `backend/`, `frontend/`, manifests ou infraestrutura executável: será necessário preparar o backend mínimo.

A leitura será sequencial, com `csv-parse`, validação determinística e transação curta por registro. Processo, movimentação e resultado confirmado do registro serão gravados na mesma transação. Um bloqueio de sessão impedirá cargas simultâneas na mesma base. Um diário local durável identificará tentativas mesmo quando o banco estiver indisponível; os resultados transacionais serão a autoridade para reconciliação após falhas. Esta entrega é documental: não implementa o importador nem afirma que os testes já passaram.

## Arquitetura do sistema

### Visão dos componentes

Todos os caminhos de código abaixo serão novos. Nenhum módulo de aplicação existente foi encontrado para reutilização.

| Componente e localização | Responsabilidade e dependências |
| --- | --- |
| `backend/src/cli/import-csv.ts`, `recover-import.ts` e `shutdown.ts` | Interpretar argumentos, iniciar importação/recuperação, tratar sinais e definir saída. Chamam serviços; não acessam tabelas. |
| `backend/src/config/envs.ts`, `database.connection.ts`, `logger.ts` | Validar configuração, criar um único PrismaClient com adapter PostgreSQL e centralizar logs sanitizados. |
| `backend/src/services/import-service.ts` | Coordenar tentativa, exclusão, leitura sequencial, processamento e finalização. |
| `backend/src/services/record-service.ts`, `process-conflict-service.ts` | Validar registro, comparar processo antes de verificar duplicidade e decidir o resultado dentro da unidade transacional. |
| `backend/src/services/cnj-service.ts`, `civil-date-service.ts`, `exact-number-service.ts`, `text-normalization-service.ts`, `movement-identity-service.ts` | Funções determinísticas de RF4–RF8; sem I/O e sem tipos Express. |
| `backend/src/services/recovery-service.ts`, `report-service.ts` | Reconciliar diário e banco, classificar tentativas abandonadas e produzir relatório versionado. |
| `backend/src/adapters/source-adapter.ts`, `csv-adapter.ts`, `journal-adapter.ts` | Snapshot privado da fonte, UTF-8 estrito, parser, posições físicas e I/O durável de relatório. Não contêm regras de domínio. |
| `backend/src/repositories/import-session-repository.ts`, `unit-of-work-repository.ts` | Adquirir bloqueio na conexão Prisma e abrir transações curtas com verificação da sessão. |
| `backend/src/repositories/lawsuit-repository.ts`, `movement-repository.ts`, `import-run-repository.ts`, `record-result-repository.ts` | Único acesso aos modelos, sempre via Prisma; recebem o contexto transacional quando necessário. |
| `backend/src/schemas/import-options-schema.ts`, `csv-header-schema.ts`, `csv-record-schema.ts` | Joi para forma dos argumentos e registros; validadores de domínio permanecem nos serviços. |
| `backend/src/errors/` e `protocols.ts` | Factories de erros operacionais e contratos compartilhados, sem importar camadas superiores. Tipos maiores poderão ser extraídos para `protocols/`. |
| `backend/prisma/schema.prisma`, `prisma/migrations/`, `prisma.config.ts` | Modelo físico, cliente gerado e migrations reproduzíveis. |
| `backend/src/**/*.test.ts`, `backend/vitest.config.ts`, `backend/playwright.config.ts`, `e2e/*.spec.ts` | Unidade, integração com PostgreSQL real e E2E do comando compilado. |
| `backend/README.md`, exemplos de ambiente, `backend/compose.yaml` | Operação local, base de teste isolada, recuperação e validações. |

Fluxo principal: CLI → serviço de importação → snapshot/parser → validação → unidade transacional → repositórios → PostgreSQL. O serviço de relatório recebe resultados confirmados e utiliza o adaptador de diário. Adaptadores e serviços dependem dos contratos; repositórios nunca importam serviços. Cada pasta de código expõe `index.ts`; imports internos usam arquivos específicos para evitar ciclos.

Sequência operacional:

1. Gerar UUID da tentativa, criar diretório exclusivo de relatório e sincronizar evento inicial antes de qualquer conexão ou gravação de domínio.
2. Validar configuração, conectar, tentar adquirir o bloqueio e reconciliar tentativas abandonadas. Recusar concorrência imediatamente.
3. Copiar a fonte por streaming para snapshot privado, calcular SHA-256 dos bytes e validar UTF-8 estritamente. Somente o snapshot será importado. Erros nesta fase deixam o domínio intacto.
4. Validar cabeçalho, percorrer registros lógicos na ordem e ignorar somente linhas físicas realmente vazias fora de aspas.
5. Antes de cada tentativa transacional, sincronizar no diário a posição em tentativa. Validar campos independentes, coletando todos os erros aplicáveis; campos ilegíveis não produzem erros derivados.
6. Na transação: verificar sessão, consultar processo, verificar conflitos, procurar identidade completa da movimentação e gravar a classificação. Criar processo e movimentação somente se todo o registro for válido.
7. Após commit, acrescentar confirmação ao diário. Ao terminar, reconciliar os totais com o banco, persistir resultado final, publicar relatório e liberar recursos. Uma falha de relatório também interrompe a carga.

Premissas operacionais explícitas: execução em ambiente controlado; disco durável para relatórios; PostgreSQL acessível por conexão direta; somente este importador escreve nas tabelas de domínio nesta etapa. Não foram definidos SLA ou teto de volume. Os valores de timeout abaixo são proteções operacionais ajustáveis, não metas de desempenho.

## Design de implementação

### Principais interfaces

Contratos ilustrativos, sem implementação; cada exemplo tem até vinte linhas. Os tipos transportam contexto em objetos e evitam mais de três parâmetros.

```ts
interface ImportService {
  execute(options: ImportOptions): Promise<ImportReport>;
}
interface RecoveryService {
  recover(options: RecoveryOptions): Promise<ImportReport>;
}
interface CsvSource {
  records(source: PreparedSource): AsyncIterable<CsvRecord>;
}
interface RecordValidator {
  validate(record: CsvRecord): ValidationResult;
}
```

```ts
interface UnitOfWork {
  execute<T>(work: TransactionWork<T>): Promise<T>;
}
interface MovementRepository {
  findCandidates(input: MovementLookup): Promise<Movement[]>;
  create(input: CreateMovement): Promise<Movement>;
}
interface Journal {
  append(event: JournalEvent): Promise<void>;
  publish(report: ImportReport): Promise<string>;
}
```

`TransactionWork` recebe um contexto Prisma limitado à transação. O serviço toma decisões usando repositórios vinculados a esse contexto; o wrapper transacional reside no repository. Nunca abrir transações aninhadas ou usar o cliente global dentro de uma transação ativa. Transações interativas são adequadas ao fluxo de leitura, comparação e gravação; devem permanecer curtas. [Documentação Prisma 7](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

**Contrato operacional.** Dentro de `backend/`, a interface de desenvolvimento será `npm run import:csv -- --file ../lawsuits_movements.csv`; após build, `node dist/cli/import-csv.js --file ../lawsuits_movements.csv`. O comando `npm run import:recover -- --run <uuid>` reconcilia uma tentativa, sem importar novamente; depois o operador pode repetir o arquivo inteiro. O comando de importação também reconcilia automaticamente execuções abandonadas registradas na mesma base. `--help` não inicia tentativa. Argumentos inválidos recebem diagnóstico e saída 1.

**Exclusão e sessão.** Usar Prisma 7 com `@prisma/adapter-pg` e pool de exatamente uma conexão, sem expiração por ociosidade nem rotação por tempo de vida. Adquirir `pg_try_advisory_lock` de sessão, com chave fixa da aplicação para toda a base, via consulta parametrizada no repository. Capturar também `pg_backend_pid()` e `backend_start` da própria sessão. Todas as transações de domínio verificam esse par antes de qualquer escrita; uma reconexão nunca continua silenciosamente. Configuração do pool e estabilidade da sessão são requisitos testados, não suposições sobre o ORM. [Pool do node-postgres](https://node-postgres.com/apis/pool), [adapters Prisma 7](https://docs.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers).

O bloqueio é adquirido uma vez e mantido na mesma sessão que executa as transações; não há conexão separada de lock nem transação aberta durante todo o arquivo. Fechamento da sessão libera o lock. Se o pool substituir a conexão após falha, a verificação da sessão aborta a unidade seguinte, sem readquirir lock em nome da execução antiga. A recuperação só ocorre depois de adquirir o lock na nova sessão, quando as transações antigas já não podem confirmar. Não usar PgBouncer em modo transaction pooling. A chave do bloqueio não inclui nome do arquivo nem identificador da execução. [Bloqueios de sessão PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS).

**Atomicidade.** Usar isolamento `ReadCommitted`, suficiente com um único escritor autorizado e bloqueio de sessão. Toda classificação cria um `RecordResult`: importado junto de processo/movimentação; duplicado ou rejeitado sem alterar domínio. Uma exceção desfaz a unidade inteira. Não usar `createMany` com descarte silencioso de conflitos nem contar inserções antes do commit. Erro de conexão durante commit deixa a posição incerta até consulta ao ledger. Não repetir automaticamente a transação incerta.

**Identidade e colisões.** Calcular SHA-256 de uma serialização JSON UTF-8 do array ordenado de quatro strings: CNJ canônico, data ISO, título normalizado, conteúdo normalizado. A serialização evita ambiguidades de concatenação. O hash seleciona candidatos; a decisão de duplicidade compara os quatro valores completos, byte a byte. Cada identidade distinta dentro do mesmo hash recebe `identitySlot` crescente, começando em zero, sob o bloqueio exclusivo. A restrição única `(identityHash, identitySlot)` impede reutilizar o mesmo slot; a comparação completa sob exclusão garante unicidade de negócio no caminho de escrita autorizado, inclusive numa colisão artificial. Escritas SQL externas não são suportadas e poderiam violar essa invariante. Não criar índice B-tree sobre conteúdo extenso.

**Normalização.** CNJ usa exatamente RF4, com resto incremental por dígito ou BigInt, nunca conversão do número completo para `number`. A fonte normativa permanece a [Resolução CNJ 65, Anexo VIII](https://atos.cnj.jus.br/atos/detalhar/119); existência judicial não será consultada. Datas são validadas por componentes e calendário gregoriano e convertidas a `AAAA-MM-DD`, sem `Date.parse`. Textos de comparação passam por CRLF/CR → LF, NFC e `trim`; textos originais aceitos permanecem intactos. Números são convertidos por manipulação de strings: valor com duas casas e sem zeros iniciais supérfluos, autores como inteiro decimal positivo canônico. A igualdade será textual sobre essa representação exata.

### Modelos de dados

Nomes de campos e códigos são em inglês; explicações ao operador são em português. Exemplos são sintéticos, salvo o CNJ de referência estruturalmente válido. UUIDs são exemplificados integralmente. Contadores persistidos usam `BigInt`; contratos JSON os serializam como strings decimais, evitando perda acima de `Number.MAX_SAFE_INTEGER`. Datas de domínio são strings civis; instantes operacionais são UTC ISO 8601. `null` representa informação desconhecida, nunca zero presumido.

#### `ImportOptions` / `RecoveryOptions` — entrada do comando

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `file` | string | na importação | Caminho local resolvido a partir do diretório corrente; nunca URL. |
| `runId` | UUID | na recuperação | Tentativa anterior a reconciliar; substitui `file`. |
| `reportsDirectory` | string | sim, por configuração | Diretório persistente; padrão `backend/var/imports` relativo à raiz do backend. |

```text
{"file":"../lawsuits_movements.csv","reportsDirectory":"/srv/harness/imports"}
```

Variante de recuperação:

```text
{"runId":"b06c5903-a099-43cf-8f50-a318eb630e8c","reportsDirectory":"/srv/harness/imports"}
```

#### `SourcePosition` — localização sem ambiguidade

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `recordNumber` | inteiro positivo / string JSON | sim | Registro de dados, começando em 1; cabeçalho e linhas ignoradas não contam. |
| `physicalLineStart` | inteiro positivo ou null | sim | Linha física inicial, contando a primeira como 1. |

```text
{"recordNumber":"2","physicalLineStart":"5"}
```

#### `PreparedSource` — snapshot identificado

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `fileName` | string | sim | Basename sanitizado, sem diretórios do operador. |
| `snapshotPath` | string | sim | Caminho privado interno; não publicado em logs. |
| `sha256` | hexadecimal, 64 caracteres | sim | Hash dos bytes completos, incluindo BOM quando presente. |
| `sizeBytes` | inteiro / string JSON | sim | Quantidade de bytes copiados. |

```text
{"fileName":"lawsuits_movements.csv","snapshotPath":"/srv/harness/imports/b06c5903-a099-43cf-8f50-a318eb630e8c/source.tmp","sha256":"ff787b0e95aaca3dca88943bf8606a3c96fa0f00b4218844545790f9656697c9","sizeBytes":"2262442"}
```

A cópia usa permissões restritas e nunca entra no relatório como conteúdo. Comparar metadados da fonte antes/depois da cópia e recusar alteração detectada; o hash identifica exatamente o snapshot consumido. Falha antes de concluir leitura deixa hash e tamanho completos desconhecidos. Remover snapshot ao finalizar quando possível; relatórios e diário não são removidos. O operador gerencia snapshots abandonados após recuperação.

#### `CsvRecord` — entrada do parser

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `position` | SourcePosition | sim | Localização do registro. |
| `fields` | array de strings | sim | Valores decodificados sem trim ou coerção; número de campos pode ser inválido. |
| `emptyLinesBefore` | inteiro não negativo | sim | Linhas físicas vazias ignoradas desde o registro anterior. |

```text
{"position":{"recordNumber":"1","physicalLineStart":"2"},"fields":["1001399-31.2023.8.26.0070","Foro de Exemplo","1ª Vara","10.168,2","01","5/12/2023","Despacho",""],"emptyLinesBefore":"0"}
```

O cabeçalho estabelece o mapa de posições; o exemplo usa a ordem do corpus. Uma quantidade incorreta de campos produz apenas `FIELD_COUNT` para o registro, pois não é seguro atribuir os demais valores a colunas. Oito campos vazios geram rejeição por campos obrigatórios.

#### `ValidationResult` — resultado das regras independentes

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `valid` | boolean | sim | Discriminador. |
| `data` | dados canônicos de Lawsuit e Movement | se válido | Sem IDs persistidos, origem ou ordem ainda atribuídos. |
| `issues` | Diagnostic[] | se inválido | Todos os erros independentes; sem valores brutos. |

```text
{"valid":false,"issues":[{"field":"movement_title","code":"REQUIRED_FIELD","message":"O título é obrigatório.","cnj":"1001399-31.2023.8.26.0070"}]}
```

Na variante válida, `data` agrupa `lawsuit` e `movement` com os campos de entrada canônicos das entidades abaixo. Não usar dados parciais para persistência ou para deduplicação.

#### `Lawsuit` — processo persistido

| Campo | Tipo físico / domínio | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `cnj` | varchar(20) / string | sim | Chave primária, vinte dígitos; imutável. |
| `forumOriginal` | bytea / string UTF-8 | sim | Foro original da primeira aceitação. |
| `forumNormalized` | bytea / string UTF-8 | sim | Forma de comparação. |
| `courtOriginal` | bytea / string UTF-8 | sim | Vara original da primeira aceitação. |
| `courtNormalized` | bytea / string UTF-8 | sim | Forma de comparação. |
| `value` | text / decimal canônico | sim | Ex.: `10168.20`; exato, não negativo, sem moeda. |
| `numberOfAuthors` | text / inteiro canônico | sim | Ex.: `1`; positivo, sem zeros iniciais. |

```text
{"cnj":"10013993120238260070","forumOriginal":"Foro de Exemplo","forumNormalized":"Foro de Exemplo","courtOriginal":"1ª Vara","courtNormalized":"1ª Vara","value":"10168.20","numberOfAuthors":"1"}
```

Representações numéricas em `text` evitam introduzir teto de precisão não previsto pelo PRD. O repositório não faz ordenação lexicográfica de valores como se fosse numérica. Os quatro textos de origem — foro, vara, título e conteúdo — e suas respectivas formas normalizadas são representados por `Bytes` no Prisma e UTF-8 em `bytea`, com conversão restrita ao repository. Isso preserva inclusive caracteres que PostgreSQL `text` não representa, sem descarte ou escape destrutivo; os exemplos mostram a projeção decodificada, não o JSON nativo de um buffer.

#### `Movement` — movimentação e primeira origem

| Campo | Tipo físico / domínio | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | bigint autoincremento / string JSON | sim | Identidade interna e desempate pela primeira aceitação; lacunas são permitidas. |
| `lawsuitCnj` | varchar(20) | sim | FK para Lawsuit, com exclusão restrita. |
| `date` | varchar(10) / data ISO | sim | Dia civil validado; ordem lexicográfica coincide com cronologia. |
| `titleOriginal` | bytea / string UTF-8 | sim | Título preservado. |
| `titleNormalized` | bytea / string UTF-8 | sim | Título usado na identidade. |
| `contentOriginal` | bytea / string UTF-8 | sim | Inclui string vazia ou espaços originais. |
| `contentNormalized` | bytea / string UTF-8 | sim | Ausência normalizada como string vazia, não null. |
| `identityHash` | varchar(64) | sim | SHA-256 para busca de candidatos. |
| `identitySlot` | bigint | sim | Zero normalmente; diferencia identidades em colisão de hash. |
| `sourceRunId` | uuid | sim | FK para ImportRun da primeira aceitação. |
| `sourceRecordNumber` | bigint | sim | Registro lógico dessa origem. |
| `sourcePhysicalLineStart` | bigint ou null | sim | Linha inicial quando conhecida. |

```text
{"id":"1","lawsuitCnj":"10013993120238260070","date":"2023-12-05","titleOriginal":"Despacho","titleNormalized":"Despacho","contentOriginal":"","contentNormalized":"","identityHash":"75dcd8608fcdffefdaea348978f309be57db2fd666ab177f4ef1b8c2d084f08e","identitySlot":"0","sourceRunId":"b06c5903-a099-43cf-8f50-a318eb630e8c","sourceRecordNumber":"1","sourcePhysicalLineStart":"2"}
```

Criar índices `(lawsuitCnj, date, id)` e único `(identityHash, identitySlot)`, além das FKs. A consulta interna de inspeção ordena explicitamente por `date ASC, id ASC`; ordem física de tabela não é contrato. IDs são alocados sequencialmente sob exclusão; duplicados nunca recebem novo ID nem atualizam origem. A relação de primeira origem será também verificável pelo `RecordResult` único daquela execução/posição.

#### `ImportRun` — tentativa registrada no banco

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | uuid | sim | Mesmo UUID do diário local. |
| `fileName` | text | sim | Nome sanitizado. |
| `sourceSha256` | varchar(64) ou null | sim | Hash completo quando disponível. |
| `sourceSizeBytes` | bigint ou null | sim | Tamanho completo conhecido. |
| `destination` | text | sim | Alias configurado, sem URL ou credenciais. |
| `status` | enum | sim | `running`, `completed`, `completed_with_rejections`, `failed`, `interrupted`. |
| `startedAt` | timestamptz | sim | Instante de início observado. |
| `finishedAt` | timestamptz ou null | sim | Só quando encerramento foi observado. |
| `recoveredAt` | timestamptz ou null | sim | Momento da reconciliação, não substitui término desconhecido. |
| `endOfInput` | boolean | sim | Se EOF foi observado com parser íntegro. |
| `ignoredEmptyLines` | bigint | sim | Último contador confirmado; completo somente com EOF. |
| `fatal` | JSON Diagnostic ou null | sim | Falha operacional sanitizada. |
| `protocolVersion` | integer | sim | `1`; permite identificar a regra aplicada. |

```text
{"id":"b06c5903-a099-43cf-8f50-a318eb630e8c","fileName":"lawsuits_movements.csv","sourceSha256":"ff787b0e95aaca3dca88943bf8606a3c96fa0f00b4218844545790f9656697c9","sourceSizeBytes":"2262442","destination":"judicial-local","status":"running","startedAt":"2026-10-03T12:00:00.000Z","finishedAt":null,"recoveredAt":null,"endOfInput":false,"ignoredEmptyLines":"0","fatal":null,"protocolVersion":1}
```

Uma tentativa recusada por lock ou falha de conexão pode existir somente no diário local; o relatório usa o mesmo contrato. Não criar registro de banco antes de adquirir exclusão. Recuperação importa metadados locais faltantes para a base somente após obter o lock. Uma execução terminal já confirmada no banco não se torna interrompida apenas porque faltou publicar seu relatório.

#### `RecordResult` — ledger transacional

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `runId` | uuid | sim | FK para tentativa. |
| `recordNumber` | bigint | sim | Com runId forma a chave primária composta. |
| `physicalLineStart` | bigint ou null | sim | Localização. |
| `classification` | enum | sim | `imported`, `duplicate`, `rejected`. |
| `movementId` | bigint ou null | sim | FK para criada/existente; null na rejeição. |
| `processCreated` | boolean | sim | Verdadeiro só quando esta unidade criou o processo. |
| `issues` | JSON Diagnostic[] | sim | Vazio salvo rejeição. |
| `ignoredEmptyLinesThroughRecord` | bigint | sim | Contador cumulativo no ponto confirmado. |
| `committedAt` | timestamptz | sim | Instante operacional da unidade; não é data judicial. |

```text
{"runId":"b06c5903-a099-43cf-8f50-a318eb630e8c","recordNumber":"1","physicalLineStart":"2","classification":"imported","movementId":"1","processCreated":true,"issues":[],"ignoredEmptyLinesThroughRecord":"0","committedAt":"2026-10-03T12:00:01.000Z"}
```

O ledger é a autoridade dos totais. Rejeições persistem diagnóstico, mas não dados brutos. FKs têm exclusão restrita. Não há rotina de exclusão nesta etapa. A invariante de não haver processo vazio é garantida pela unidade transacional do importador e testada contra falhas reais; uma FK sozinha não garante participação mínima de um processo.

#### `ImportTotals` — contadores confirmados

| Campo | Tipo JSON | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `processed` | string decimal | sim | Quantidade de resultados transacionais. |
| `imported` | string decimal | sim | Movimentações novas confirmadas. |
| `duplicates` | string decimal | sim | Identidades existentes compatíveis. |
| `rejected` | string decimal | sim | Registros inválidos confirmados no ledger. |
| `processesCreated` | string decimal | sim | Soma de processCreated. |
| `movementsCreated` | string decimal | sim | Igual a imported. |
| `ignoredEmptyLines` | string decimal | sim | Fora de processed. |
| `unprocessed` | string decimal ou null | sim | Zero ao concluir; desconhecido se a leitura não terminou. |

```text
{"processed":"5568","imported":"5568","duplicates":"0","rejected":"0","processesCreated":"100","movementsCreated":"5568","ignoredEmptyLines":"0","unprocessed":"0"}
```

Na falha, `processed = imported + duplicates + rejected` continua válido para resultados confirmados; a posição incerta fica fora da soma. Não contabilizar bytes ou registros apenas antecipados pelo parser como processados.

#### `Diagnostic` — erro sanitizado

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `code` | código estável | sim | Categoria da tabela abaixo. |
| `message` | string | sim | Explicação em português, sem interpolar dados brutos. |
| `field` | nome CSV ou null | sim | Campo afetado; null para erro global/estrutural. |
| `cnj` | string mascarada ou null | sim | Apenas CNJ previamente validado. |
| `stage` | string | em fatal | `startup`, `source`, `header`, `record`, `commit`, `report`, `recovery`. |
| `lastConfirmedPosition` | SourcePosition ou null | em fatal | Última unidade confirmada conhecida. |
| `recovery` | string | em fatal | Ação operacional recomendada. |

Campos comuns `stage`, `lastConfirmedPosition` e `recovery` são omitidos em erro de campo; a posição vem do RecordResult/relatório. Conflitos geram um Diagnostic por campo divergente.

| Código | HTTP | Significado e tratamento |
| --- | --- | --- |
| `FILE_INACCESSIBLE` | não se aplica | Fonte ausente, sem permissão ou não regular; fatal. |
| `SOURCE_READ_FAILED`, `SOURCE_CHANGED` | não se aplica | Leitura/cópia interrompida ou alteração detectada; fatal. |
| `INVALID_UTF8` | não se aplica | Decodificação estrita falhou; fatal. |
| `INVALID_HEADER` | não se aplica | Cabeçalho ausente, colunas ausentes/extras/repetidas; fatal. |
| `MALFORMED_CSV` | não se aplica | Aspas ou fronteiras irrecuperáveis; fatal. |
| `FIELD_COUNT` | não se aplica | Número incorreto de campos; rejeitar registro. |
| `REQUIRED_FIELD` | não se aplica | Campo obrigatório vazio. |
| `CNJ_FORMAT`, `CNJ_CHECK_DIGIT`, `CNJ_FIELD` | não se aplica | Forma, dígito verificador ou campos J/ano inválidos. |
| `INVALID_DATE`, `INVALID_VALUE`, `INVALID_AUTHOR_COUNT` | não se aplica | Violações independentes de RF5. |
| `PROCESS_CONFLICT` | não se aplica | Metadado divergente; rejeitar antes da deduplicação. |
| `IMPORT_BUSY` | não se aplica | Base ocupada; fatal sem escrita de domínio. |
| `PERSISTENCE_FAILED`, `SESSION_LOST` | não se aplica | Erro de banco ou mudança da sessão exclusiva; fatal. |
| `REPORT_IO_FAILED`, `INVALID_CONFIGURATION` | não se aplica | Impossibilidade de diagnóstico durável/configuração inválida; fatal. |
| `INTERRUPTED`, `UNEXPECTED_ERROR` | não se aplica | Interrupção ou erro inesperado sanitizado. |

```text
{"code":"PROCESS_CONFLICT","message":"O valor diverge do processo previamente aceito.","field":"lawsuit_value","cnj":"1001399-31.2023.8.26.0070"}
```

#### `ImportReport` — resultado consultável

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `schemaVersion` | integer | sim | `1`. |
| `revision` | integer | sim | Revisão crescente; arquivos anteriores preservados. |
| `run` | ImportRun | sim | Projeção operacional sem credenciais. |
| `result` | string | sim | `em execução`, `concluída`, `concluída com rejeições`, `falhou`, `interrompida`. |
| `durationMs` | inteiro ou null | sim | Calculável somente com início e fim conhecidos. |
| `totals` | ImportTotals | sim | Contadores confirmados. |
| `totalsComplete` | boolean | sim | Falso enquanto faltar reconciliação/EOF para algum contador. |
| `rejections` | array de posição e issues | sim | Diagnósticos por registro, sem conteúdo. |
| `lastConfirmedPosition` | SourcePosition ou null | sim | Último resultado reconciliado. |
| `pendingPosition` | SourcePosition ou null | sim | Registro em tentativa, fora dos totais. |
| `pendingOutcome` | enum ou null | sim | `unknown` ou `not_committed` após reconciliação sem resultado. |
| `warnings` | string[] | sim | Inclui cabeçalho sem dados e relatório reconstruído. |

Exemplo de campos específicos de uma execução interrompida; `run` e `totals` seguem os contratos completos acima:

```text
{"schemaVersion":1,"revision":2,"result":"interrompida","durationMs":null,"totalsComplete":false,"rejections":[],"lastConfirmedPosition":{"recordNumber":"1","physicalLineStart":"2"},"pendingPosition":{"recordNumber":"2","physicalLineStart":"3"},"pendingOutcome":"not_committed","warnings":["Tentativa reconciliada; reexecute o arquivo completo."]}
```

Relatório físico: `<reportsDirectory>/<runId>/report-0001.json`, seguido de novas revisões quando necessário; diário em `events.jsonl`. Escrever relatório em arquivo temporário no mesmo diretório, sincronizar, renomear para nome novo e sincronizar o diretório. Não sobrescrever revisões nem limpar tentativas anteriores. Um relatório grande será emitido por streaming a partir do ledger. `stdout` traz resultado, UUID, caminho da revisão e totais; logs adicionais vão para `stderr` pelo logger.

#### `JournalEvent` — rastro local para recuperação

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `sequence` | inteiro positivo | sim | Ordenação de eventos da tentativa. |
| `runId` | uuid | sim | Identificação desde antes da conexão. |
| `timestamp` | instante UTC | sim | Momento observado. |
| `type` | enum | sim | `started`, `source_prepared`, `attempting`, `confirmed`, `terminal`, `reconciled`. |
| `payload` | contrato discriminado | sim | Metadados iniciais, PreparedSource sem path, SourcePosition, RecordResult, relatório resumido ou reconciliação. |

```text
{"sequence":3,"runId":"b06c5903-a099-43cf-8f50-a318eb630e8c","timestamp":"2026-10-03T12:00:01.000Z","type":"attempting","payload":{"recordNumber":"1","physicalLineStart":"2"}}
```

Cada append crítico é sincronizado antes de prosseguir. Em recuperação, uma última linha incompleta é ignorada como não confirmada; nunca altera fatos do banco. Se nem o diretório configurado puder ser criado, tentar diretório de contingência persistente em `backend/var/import-failures`; se ambos falharem, não iniciar acesso ao domínio e emitir UUID e diagnóstico em stderr. Persistência de relatório é impossível sem algum armazenamento gravável: esse é um pré-requisito operacional explícito.

#### Mapeamento CSV → contrato

| Origem | Destino |
| --- | --- |
| `lawsuit_number` | Lawsuit.cnj e Movement.lawsuitCnj |
| `lawsuit_forum` | Lawsuit.forumOriginal / forumNormalized |
| `lawsuit_court` | Lawsuit.courtOriginal / courtNormalized |
| `lawsuit_value` | Lawsuit.value |
| `lawsuit_number_of_authors` | Lawsuit.numberOfAuthors |
| `movement_date` | Movement.date |
| `movement_title` | Movement.titleOriginal / titleNormalized |
| `movement_content` | Movement.contentOriginal / contentNormalized |
| UUID e posição atribuídos pelo importador | Movement.sourceRunId / sourceRecordNumber / sourcePhysicalLineStart |

#### Parâmetros fixos na origem e configuração

| Componente | Parâmetros e contrato |
| --- | --- |
| Decodificador | UTF-8 com erro fatal e flush ao EOF; BOM permitido somente no início. A substituição silenciosa por U+FFFD é proibida. |
| `csv-parse` | Vírgula; quote e escape como aspas duplas; terminadores CRLF e LF; sem cast/trim; arrays, não objetos automáticos. |
| Tolerância CSV | `relax_column_count: true`, mas comprimento validado explicitamente; `relax_quotes: false`, `skip_records_with_error: false`, `skip_empty_lines: true`; não ignorar registros com valores vazios. |
| Metadados CSV | `info: true`, `raw: true`; raw só em memória e nunca em logs. Derivar início físico do trecho bruto, fim reportado e linhas ignoradas, com testes de limites de chunk e EOF. |
| Cabeçalho | Oito nomes exatos, uma ocorrência de cada; reordenação permitida; sem normalizar caixa ou corrigir nomes. |
| Limites | Não definir limite de campo com base nos 15.266 caracteres observados; sem teto de negócio adicional. Falhas de recursos interrompem com diagnóstico operacional. |
| `DATABASE_URL` | Obrigatória, somente em env; PostgreSQL direto. |
| `DATABASE_LABEL` | Alias obrigatório sem credenciais, usado em relatórios. |
| `IMPORT_REPORTS_DIR` | Diretório persistente; padrão relativo à raiz do backend definido acima. |
| `DB_CONNECT_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`, `DB_TRANSACTION_TIMEOUT_MS` | Padrões 5.000, 10.000 e 15.000 ms; valores positivos validados. Espera do pool limitada a 5.000 ms. |
| `SHUTDOWN_TIMEOUT_MS` | Padrão 20.000 ms; parar de ler, aguardar unidade corrente, registrar resultado e liberar sessão. |
| Pool e lock | `max: 1`, `idleTimeoutMillis: 0`, `maxLifetimeSeconds: 0`; chave constante `IMPORT_DATABASE_LOCK_KEY`, igual em todas as cargas. |

`relax_column_count` não autoriza descarte de campos; usar arrays preserva a entrada para rejeição explícita. [Contrato do csv-parse](https://csv.js.org/parse/options/relax_column_count/). O parser fornece metadados de linhas e registros que precisam ser adaptados ao registro lógico de dados. [Metadados do parser](https://csv.js.org/parse/info/). UTF-8 inválido deve provocar exceção no decodificador, inclusive sequência incompleta no EOF. [TextDecoder do Node.js](https://nodejs.org/api/util.html#class-utiltextdecoder).

### Endpoints da API (se aplicável)

Não aplicável. A funcionalidade não expõe ou consome API HTTP. Express, CORS, `app.ts`, `server.ts` e health check não são necessários para executar este comando e não serão criados como demonstração. Uma futura API poderá consumir os serviços/repositórios sem alterar o contrato de ingestão.

## Pontos de integração

As únicas integrações de execução são filesystem local e PostgreSQL. Não há chamadas a TJSP, CNJ, e-SAJ, serviços de autenticação ou LLM; a documentação normativa é referência de desenvolvimento, não dependência de runtime.

O PostgreSQL requer usuário com acesso às tabelas e às funções de bloqueio, conexão direta e configuração de durabilidade preservada (`fsync` e `synchronous_commit` habilitados). Migrations usam credenciais do ambiente de preparação; a rotina de importação não executa migrations automaticamente. Falhas de conexão, timeout ou persistência interrompem a tentativa; o operador corrige a causa e reexecuta. O filesystem exige espaço para snapshot e relatórios, permissões restritas e armazenamento que sustente sincronização e rename local.

Recuperação detalhada:

1. Adquirir o bloqueio exclusivo antes de reconciliar; se outra sessão estiver ativa, retornar `IMPORT_BUSY`, sem marcar a outra como interrompida.
2. Ler execuções `running` na base e a tentativa local indicada. Para cada posição em tentativa, consultar `(runId, recordNumber)` no ledger.
3. Se o resultado existe, incorporá-lo exatamente uma vez aos totais; se não existe e a sessão anterior encerrou, a unidade não confirmou. Não inferir resultado a partir de mensagem de stdout.
4. Recalcular classificações e processos criados pelo ledger. Preservar estado terminal já persistido; para tentativa ainda `running`, registrar `interrupted`, `recoveredAt` e `finishedAt: null` quando o término real não foi observado.
5. Publicar revisão nova do relatório, preservando revisões anteriores. Depois iniciar nova tentativa com novo UUID e leitura desde o início. A origem dos registros já importados permanece inalterada.

`SIGINT`/`SIGTERM` param novas unidades e permitem concluir/reverter a atual dentro do prazo; saída 3 e resultado `interrompida` quando o encerramento é observado. `SIGKILL` não permite relatório final ou controle do código de saída: a recuperação posterior identifica a interrupção. Sessão aparentemente presa deve ser inspecionada pelo operador; somente depois de confirmar que a execução morreu, encerrar a sessão de banco identificada. Não remover registros de domínio para liberar a carga.

## Abordagem de testes

Vitest para unidade e integração; Playwright Test como runner dos poucos E2E de CLI, sem navegador. Fixtures sintéticas, relógio controlado, restauração de mocks e isolamento por base de teste. Não simular a unicidade ou a atomicidade nos testes que pretendem verificá-las. Usar sincronização explícita por barreiras/eventos para falhas induzidas, sem sleeps como evidência. As tabelas abaixo são famílias de casos; variantes independentes devem virar testes independentes.

Cobertura mínima de **80% em linhas, instruções, funções e ramificações**, tanto no código da etapa quanto na codebase final. `coverage.include` abrange todo `src` autoral, inclusive CLI, adaptação e erros não importados pela suíte. Excluir somente testes, declarações sem execução e cliente gerado; não excluir regras difíceis de testar. Configurar thresholds para falhar abaixo do mínimo, conforme [Vitest coverage](https://vitest.dev/config/coverage).

### Testes de unidade (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TU-01 | CNJ mascarado e canônico preservam zeros | CA-02 | Mesma identidade textual em fixtures válidas independentes. |
| TU-02 | CNJ inválido recebe categoria específica | CA-03 | Forma, DD, J e ano inválidos distinguidos; nenhum preenchimento automático. |
| TU-03 | Calendário civil e bissextos | CA-04 | 29/02/2024 válido, 29/02/2023 inválido; anos 0001/9999 e formatos recusados cobertos. |
| TU-04 | Decimal exato sem limite de precisão arbitrário | CA-05 | 10.000 → 10000.00; 10.168,2 = 10.168,20; separadores/sinais/expoentes inválidos rejeitados. |
| TU-05 | Quantidade de autores é inteiro positivo | CA-05 | 01 = 1; zero, fração e sinal rejeitados; valores acima do inteiro seguro preservados. |
| TU-06 | Normalização preserva diferenças reais | CA-06, CA-08, CA-09 | NFC, LF e espaços externos equivalentes; caixa, acentos e espaços internos distintos. |
| TU-07 | Conteúdo ausente e obrigatoriedade | CA-06, CA-12 | Vazio/espaços têm mesma identidade; título/foro/vara vazios rejeitados. |
| TU-08 | Todos os erros independentes, sem cascata | CA-03, CA-12, CA-19 | Diagnósticos acumulados; CNJ inválido não é exibido nem usado em erros derivados. |
| TU-09 | Identidade usa os quatro componentes | CA-07, CA-08, CA-09 | Alterar cada componente muda identidade; serialização não cria ambiguidades. |
| TU-10 | Conflitos precedem duplicidade | CA-11 | Campos divergentes identificados; representações equivalentes compatíveis. |
| TU-11 | Projeção cronológica e empate | CA-10 | Ordenação por data/id sem mutar entrada ou depender de locale. |
| TU-12 | Reconciliação e resultado operacional | CA-17, CA-19, CA-20 | Equações válidas, desconhecido como null, resultado e código corretos. |
| TU-13 | Sanitização de logs e erros | CA-19, CA-21 | Sem texto processual, credenciais, path sensível ou erro bruto de driver. |
| TU-14 | Configuração, argumentos e shutdown | CA-15, CA-19, CA-20 | Falha antes de gravar; shutdown idempotente, sem nova unidade após sinal. |

Casos CNJ usam fixture válida com expectativa literal e mutações controladas, nunca o algoritmo testado para calcular o resultado esperado. Validações puras não acessam rede ou banco. Mocks de relógio, filesystem ou driver ficam nos testes de fronteira; regras de normalização e identidade não são mockadas.

### Testes de integração (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TI-01 | Cabeçalho e BOM | CA-15, CA-17 | Ordem variável aceita; ausente, repetido ou extra falha sem domínio gravado. |
| TI-02 | UTF-8 estrito e chunks | CA-06, CA-15 | Multibyte dividido aceito; bytes inválidos e EOF incompleto rejeitados antes do processamento. |
| TI-03 | CSV com aspas, vírgulas e multilinha | CA-06 | Texto idêntico à origem e posições físicas corretas em LF/CRLF. |
| TI-04 | Linhas vazias versus registro vazio | CA-12, CA-17, CA-19 | Linhas ignoradas contadas; oito campos vazios rejeitados; espaços não somem silenciosamente. |
| TI-05 | Quantidade incorreta de campos | CA-12, CA-16 | Só registro estruturalmente delimitado é rejeitado; próximo válido importado. |
| TI-06 | Aspas irrecuperáveis interrompem | CA-14, CA-16 | Nenhuma suposição sobre restante; commits prévios preservados. |
| TI-07 | Persistência exata e vínculos | CA-01, CA-02, CA-04, CA-05, CA-06 | CNJ único, FK efetiva, números enormes exatos e bytes originais preservados, inclusive NUL sintético. |
| TI-08 | Transação desfaz processo e primeira movimentação | CA-13, CA-14 | Falha real na gravação do filho não deixa processo vazio nem ledger confirmado. |
| TI-09 | Duplicação no arquivo e entre arquivos | CA-07, CA-08 | Uma identidade persistida; origem e ID preservados. |
| TI-10 | Hash coincidente com identidades distintas | CA-09 | Hasher controlado produz colisão; comparação completa cria slots distintos e reexecução duplica cada identidade correta. |
| TI-11 | Conflito impede movimento novo ou duplicado | CA-11, CA-12 | Primeiro processo confirmado preservado; posterior compatível aceito. |
| TI-12 | Cronologia em cargas reordenadas | CA-10 | Ordenação estável por data/id, novos empates após os existentes. |
| TI-13 | Falhas antes, durante e depois de commit | CA-14, CA-19, CA-20 | Ledger resolve posição incerta sem contagem dupla ou perda de confirmações. |
| TI-14 | Exclusão entre processos e liberação | CA-18 | Segunda conexão recusada; término e morte liberam nova carga. |
| TI-15 | Perda e substituição da sessão Prisma | CA-13, CA-18, CA-20 | Sessão substituída não escreve; nova carga só prossegue após lock exclusivo. |
| TI-16 | Diário truncado e publicação de relatório falha | CA-19, CA-20 | Reconstrução pelo banco, revisão anterior intacta, sem sucesso inventado. |
| TI-17 | Fonte inacessível, mutável ou interrompida | CA-15, CA-19 | Diagnóstico local mesmo sem banco; snapshot impede importar fonte diferente do hash. |
| TI-18 | Vazios e apenas rejeições | CA-17, CA-19 | Aviso/saída zero para cabeçalho sem dados; saída 2 para somente inválidos. |
| TI-19 | Configuração e isolamento das dependências | CA-21 | Migrations aplicáveis em base vazia; importação sem HTTP externo; secrets ausentes dos artefatos. |

Cada worker de integração usa uma base independente; separar somente schemas não isola o advisory lock por base. Fixtures criam e destroem apenas bases explicitamente identificadas como teste. Falhas transacionais devem usar restrições reais, encerramento controlado de sessão ou hooks de teste injetados no processo de teste, nunca flags de produção que permitam falhar arbitrariamente.

### Testes E2E (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| E2E-01 | Corpus completo e repetição pelo comando compilado | CA-01, CA-07, CA-10, CA-19, CA-21 | SHA esperado; 100 processos/5.568 movimentações/zero rejeições; repetição cria zero e aponta 5.568 duplicados. |
| E2E-02 | Arquivo misto e diagnóstico operacional | CA-03, CA-06, CA-11, CA-12, CA-16, CA-17, CA-19 | Continuidade nas rejeições, interrupção na estrutura irrecuperável, saída e relatório coerentes. |
| E2E-03 | Morte após commit e carga completa recuperada | CA-13, CA-14, CA-18, CA-20, CA-21 | SIGKILL sincronizado após commit; tentativa anterior interrompida, recuperação sem duplicação e conjunto final igual ao baseline. |

Arquivos em `e2e/import-corpus.spec.ts`, `import-diagnostics.spec.ts` e `import-recovery.spec.ts`; configuração e dependências em `backend/`. Usar fixtures Playwright para processo filho, diretório temporário e base isolada, sem `page` nem instalação de navegador. [Fixtures Playwright](https://playwright.dev/docs/test-fixtures).

E2E-01 compara também campos de cada registro aceito com o corpus, datas, textos, origens e ordenação; não basta contar linhas. O CSV original permanece inalterado e seu SHA esperado é `ff787b0e95aaca3dca88943bf8606a3c96fa0f00b4218844545790f9656697c9`. Em testes de reprodutibilidade, executar datas sob `UTC` e `America/Fortaleza`. E2E-03 usa barreira de teste após commit e antes de publicar confirmação local, eliminando a dependência de timing aproximado. Rede externa bloqueada, liberando somente a base de teste.

Validações da implementação, todas em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, `npm run build`, `npm run test:e2e`. `test` cobre unidade e integração; cobertura mede todo código autoral; E2E executa o build. Não há comandos frontend aplicáveis, pois ele não existe e não será alterado.

## Sequenciamento do desenvolvimento

### Ordem de construção

1. Preparar backend TypeScript/ESM, configuração, scripts, ambiente PostgreSQL e infraestrutura Vitest/Playwright. Isso remove a lacuna de aplicação executável antes de construir o fluxo.
2. Construir regras puras de CNJ, datas, números, textos, identidade e conflitos com TU correspondentes.
3. Definir schema e gerar migrations; implementar repositórios, unidade de trabalho e prova de estabilidade da sessão/bloqueio. Validar atomicidade, unicidade e colisões em PostgreSQL real antes de integrar a leitura.
4. Construir snapshot, UTF-8, parser, posições e validação estrutural; executar testes CSV de borda.
5. Integrar comando, ledger, diário e relatório; implementar shutdown e recuperação antes de considerar a carga completa pronta.
6. Executar corpus, repetição e falhas controladas, ajustar cobertura e documentar operação com evidências de ambiente e duração. Atualizar as passagens desatualizadas do AGENTS quando a implementação existir.

Esta ordem orienta a construção; a decomposição em tarefas pertence à etapa `criar-tasks`.

### Dependências técnicas

| Dependência | Decisão |
| --- | --- |
| Runtime | Node.js 24 LTS e npm; fixar patch validado na implementação. [Linha Node 24](https://nodejs.org/en/blog/migrations/v22-to-v24). |
| Persistência | PostgreSQL 17 com volume persistente; compose local de desenvolvimento/teste, sem publicar banco fora do ambiente. |
| ORM | Prisma 7, `@prisma/client` e `@prisma/adapter-pg` em versões compatíveis, mais `pg`; fixar versões exatas no lock. Não copiar APIs Prisma 8 nesta implementação. |
| Parsing/configuração | `csv-parse`, `dotenv`, Joi; crypto, streams, filesystem e TextDecoder nativos. |
| Ferramentas | TypeScript, tsx, ESLint, typescript-eslint, Vitest, cobertura V8 e Playwright Test; dependências apenas em backend. |
| Build | Cliente Prisma gerado antes do typecheck/build; ESM com resolução NodeNext e imports compatíveis com `.js` compilado. |
| Migrations | Geradas por `prisma migrate dev` em desenvolvimento; `prisma migrate deploy` em CI/produção. Não editar SQL gerado manualmente. |
| Ambiente | Disco durável gravável, conexão direta e base de teste isolada; nenhum serviço de tribunal ou IA. |

A escolha da linha Prisma 7 mantém o modelo `schema.prisma`/PrismaClient previsto pelas rules e a API transacional documentada; a documentação atual também contém outra geração de API. Conferir compatibilidade efetiva dos patches durante instalação e versionar `backend/package-lock.json`. Não há dependências instaladas cuja versão possa ser reaproveitada neste checkout.

## Monitoramento e observabilidade

Não existe infraestrutura de observabilidade no checkout. Usar `config/logger.ts` como adaptador único e o relatório por UUID como principal evidência operacional. Eventos info: início, fonte identificada, progresso por lote de confirmações, finalização e reconciliação; warn: rejeições agregadas, arquivo sem dados e recuperação; error: falhas fatais sanitizadas. Não logar cada movimentação importada nem serializar objetos de erro do parser/driver, pois podem conter valores e SQL.

Medidas por tentativa: duração quando conhecida, tamanho, contadores, taxa observada, versão de Node/PostgreSQL/importador e ambiente de execução sem credenciais. Os números medidos da carga de referência serão registrados na implementação; não há SLA inventado. Relatórios usam JSON escapado, nunca avaliam conteúdo como código e não incluem textos processuais.

| Resultado | Código de saída | Comportamento |
| --- | --- | --- |
| `concluída` | 0 | Inclui duplicados e arquivo sem dados. |
| `concluída com rejeições` | 2 | Inclui arquivo com somente inválidos. |
| `falhou` | 1 | Falha operacional, concorrência, configuração ou erro não capturado. |
| `interrompida` observada | 3 | SIGINT/SIGTERM com encerramento controlado. |
| Morte abrupta | definido pelo SO | Resultado final determinado somente na recuperação; não prometer saída 3. |

Um erro não capturado usa a rotina de encerramento com saída 1; se o diário ou banco não puderem finalizar, a próxima recuperação preserva a incerteza. Nenhum alerta é enviado a serviço externo. Retenção e backup pertencem ao ambiente operacional; esta etapa não apaga relatórios automaticamente.

## Considerações técnicas

### Principais decisões

- PostgreSQL com Prisma foi confirmado pelo usuário. Transações por registro e ledger na mesma transação satisfazem recuperação sem exigir uma transação longa ou compensação de domínio.
- Parser existente reutilizado, regras específicas implementadas como funções pequenas. Não escrever parser CSV artesanal, usar `split` de linhas ou depender de biblioteca jurídica para consulta externa.
- Pool de uma conexão com identidade da sessão verificada permite lock e escrita na mesma sessão via Prisma. A configuração é exclusiva do processo CLI; futura API não deve herdar este pool sem revisar a estratégia.
- Hash é índice de candidatos, não prova de igualdade. Comparação completa e slots preservam identidades distintas mesmo em colisão sintética. O único caminho autorizado de escrita mantém a invariante com a exclusão por base.
- Strings numéricas canônicas preservam a precisão sem teto de domínio arbitrário. Campos civis ISO evitam conversões de fuso. Não há necessidade atual de agregação SQL de valores.
- Bytes UTF-8 preservam textos originais e comparação exata sem depender de collation do banco. A camada de inspeção decodifica somente quando necessário; não publica conteúdo.
- Snapshot adiciona uma passagem de I/O e uso temporário de disco, mas fixa a identidade da fonte e detecta codificação inválida antes de escrever. O processamento não carrega todo o arquivo em memória.
- Relatório local mais ledger cobre falhas anteriores à conexão e posteriores ao commit. Revisões preservadas evitam que a recuperação apague a história de incerteza.

### Riscos conhecidos

| Risco | Mitigação e verificação |
| --- | --- |
| Pool/adapter não mantém sessão como configurado | TI-15 é pré-condição de aceite. Testar liberação entre queries e recriação da conexão; jamais remover a verificação para fazer o teste passar. |
| Instância isolada por rede demora a liberar lock | Timeouts de conexão/statement e keepalive do ambiente; recuperação somente após confirmar término da sessão, sem timeout arbitrário de posse. |
| Escritor externo ignora a disciplina de unicidade | Permissões operacionais restritas e documentação de único caminho de escrita. Uma futura API de gravação exige revisão da estratégia. |
| Texto extenso, erro de parsing ou linha física incorreta | Streaming com backpressure, raw transitório, casos de chunk/EOF e conteúdo maior que o máximo observado. |
| Falta de disco impede relatório | Testar diretório antes da carga, contingência persistente, interromper antes da próxima unidade; recuperar por ledger. |
| Colisão, limites físicos e esgotamento de recursos | Colisão tratada sem perda; sem truncamento ou rejeição de negócio inventada. Limites físicos da plataforma produzem falha operacional explícita. |
| Mudança futura de normalização | `protocolVersion: 1`; nova regra demanda migração/reconciliação explícita antes de reimportar. |
| PRD cita `CURRENT_PROMPT.md` ausente | Usar o PRD existente como fonte de escopo; não inventar requisitos do arquivo indisponível. |

### Conformidade com o AGENTS.md e as rules

Leitura integral confirmada de `AGENTS.md` e dos seis arquivos encontrados em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `folder-structure.md`, `tests.md` e `commit_guidelines.md`. O caminho `./agents/rules/tests.md` citado no trecho crítico do AGENTS não existe; o arquivo efetivo é `.agents/rules/tests.md`, também reconhecido pelo PRD.

| Regra | Aplicação nesta especificação |
| --- | --- |
| Padrões de código | Arquivos `.ts` até 100 linhas, funções até 30, até três parâmetros, guard clauses, constantes nomeadas e comentários somente quando indispensáveis. Dividir contratos/testes por responsabilidade ao atingir limite. |
| JavaScript/TypeScript | ESM, const, comparações estritas, unknown para entrada/erro externo, tipos nomeados, sem any ou ternários aninhados; lint/typecheck no backend preparado. |
| Node | async/await, I/O assíncrono, backpressure, env centralizado, logger único, shutdown idempotente e npm com lock versionado. |
| Estrutura | Separação de aplicativos preservada; Prisma somente nos repositories; serviços sem HTTP; migrations geradas; E2E na raiz e testes menores junto ao código. |
| Testes | FIRST, pirâmide, asserts comportamentais, PostgreSQL real para integridade, quatro thresholds de 80% e todos CA associados a casos. |
| Commits | Se houver commit posterior, Conventional Commits curto em inglês, somente título, autoria do usuário registrado. Nenhum commit faz parte desta geração documental. |

Adaptações justificadas de contexto: `cli/` substitui router/controller como borda porque o PRD exclui HTTP; erros são convertidos em diagnóstico/código de saída nessa borda, em vez de middleware Express. Factories produzem instâncias de Error com `name`/`message`, atendendo também à regra de lançar Error. Rejeições esperadas são resultados tipados e acumuláveis; falhas operacionais são exceções. `adapters/` representa I/O recorrente de arquivos e relatórios. Não há frontend a implementar, revisar ou testar; scripts frontend e o antigo problema de build descrito no AGENTS não se aplicam ao estado real deste checkout.

### Conformidade com skills

Skill de projeto aplicável: [criar-techspec](../../.agents/skills/criar-techspec/SKILL.md). PRD lido por completo, agente Explore utilizado, projeto e rules inspecionados, referências oficiais pesquisadas, perguntas respondidas e template seguido. A ferramenta denominada `AskUserQuestion` não está disponível nesta sessão; o esclarecimento foi realizado pela equivalente `request_user_input_async`, com respostas explícitas para PostgreSQL/Prisma e deduplicação. Sem implementação ou decomposição em tarefas nesta entrega.

### Arquivos relevantes e dependentes

| Arquivo ou conjunto | Situação e relação |
| --- | --- |
| `tasks/prd-fundacao-dominio-ingestao-csv/prd.md` | Existente; fonte normativa do produto. |
| `tasks/prd-fundacao-dominio-ingestao-csv/techspec.md` | Documento produzido nesta etapa. |
| `lawsuits_movements.csv` | Existente, somente leitura; hash conferido e igual ao PRD. |
| `AGENTS.md`, `.agents/rules/*.md`, `.agents/skills/criar-techspec/` | Existentes; regras e template lidos. |
| `backend/package.json`, `package-lock.json`, `.nvmrc`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.js` | Novos na implementação; toolchain independente. |
| `backend/prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/`, cliente gerado em `backend/src/generated/prisma/` | Novos; esquema, migrations e geração do cliente. |
| `backend/src/{cli,config,services,adapters,repositories,schemas,errors}/`, `protocols.ts` | Novos; componentes nomeados na arquitetura. |
| `backend/vitest.config.ts`, `playwright.config.ts`, `src/**/*.test.ts`, `e2e/*.spec.ts` | Novos; casos TU/TI/E2E especificados acima. |
| `backend/compose.yaml`, `.env.development.example`, `.env.test.example`, `README.md` | Novos; operação e ambientes isolados. |
| `.gitignore` e documentação de execução no `AGENTS.md` | Ajustar na implementação para ignorar secrets, cliente gerado, builds, relatórios e snapshots e refletir os comandos efetivos. |

Somente esta TechSpec é criada agora. Os arquivos marcados como novos são o escopo técnico da implementação futura, não artefatos já disponíveis.
