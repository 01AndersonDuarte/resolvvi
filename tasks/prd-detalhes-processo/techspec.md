# Especificação técnica

## Resumo

Esta especificação implementa o [PRD de detalhes do processo](./prd.md), RF1–RF21 e CA-01–CA-22, ampliando os módulos de processos existentes. O GET de processo passa a retornar as informações gerais; um novo GET retorna as movimentações em páginas fixas de 20 itens. A busca CNJ continua retornando apenas o resumo usado na navegação. PostgreSQL e Prisma existentes atendem à leitura, sem migrations, novas bibliotecas ou integrações externas.

O frontend mantém a rota `/processos/:id`, os controles de sessão e o cliente HTTP existentes. Informações gerais e histórico têm carregamento e recuperação separados. O conteúdo integral dos 20 eventos acompanha cada página; expandir um texto é uma interação local. A acessibilidade segue o limite acordado no PRD: HTML semântico, controles operáveis por teclado e layout utilizável com zoom, sem novos anúncios dinâmicos ou gerenciamento programático de foco.

## Arquitetura do sistema

### Visão dos componentes

Fluxo de leitura: `ProcessFoundView` → hooks de detalhes/histórico → `process-service` do frontend → router autenticado → controller → service → repositories → PostgreSQL. O controller revalida a sessão após a consulta e antes da resposta, como já ocorre no código atual.

| Componente | Situação e responsabilidade |
| --- | --- |
| `backend/src/routers/process-router.ts` | Ampliar a composição e registrar o GET de movimentações com o middleware de sessão existente. |
| `backend/src/controllers/process-controller.ts` | Ampliar `getById` e acrescentar `listMovements`; extrair entradas, chamar o service e preservar a revalidação de sessão e a proteção contra resposta tardia. |
| `backend/src/services/process-service.ts` | Manter a busca mínima; implementar detalhes, existência do processo, limites de página, serialização e classificação das falhas de persistência. |
| `backend/src/schemas/process-schema.ts` | Acrescentar validadores de identificador e de query de paginação. |
| `backend/src/repositories/process-repository.ts` | Acrescentar `findProcessById`/`findById`, selecionando apenas os campos gerais necessários. |
| `backend/src/repositories/movement-repository.ts` | Acrescentar contagem e leitura paginada decrescente. Preservar `listByProcess` crescente da fundação. |
| `backend/src/types/process.ts` | Concentrar contratos de entrada, DTOs, contratos de repositórios e do service, hoje parcialmente declarado no módulo de serviço. |
| `backend/src/types/http.ts` e `backend/src/server.ts` | Incluir `movementRepository` na composição do router, usando o cliente Prisma já existente. |
| `backend/src/errors/process-errors.ts` | Acrescentar factories de entrada inválida e paginação fora dos limites, reutilizando `INVALID_INPUT`. |
| `frontend/src/views/ProcessFoundView.tsx` | Manter a view e a rota; compor identificação, informações gerais, histórico e retorno. Isolar o estado por processo e geração de sessão. |
| `frontend/src/components/ProcessDetailsContent.tsx` | Trocar o resumo mínimo por identificação e dados gerais; remover o foco programático específico desta página. |
| `frontend/src/components/ProcessDetailsState.tsx` | Distinguir carregamento, endereço inválido, processo ausente e falha recuperável; acrescentar nova tentativa. |
| `frontend/src/components/ProcessMovements.tsx` | Novo componente que coordena a seção de histórico, mensagem vazia, erros e navegação. |
| `frontend/src/components/MovementItem.tsx` | Novo componente de data, título, conteúdo e expansão local. |
| `frontend/src/components/MovementPagination.tsx` | Novo componente de intervalo, página atual e controles anterior/próxima. |
| `frontend/src/hooks/useProcessDetails.ts` | Ampliar o tipo retornado e expor recuperação da carga inicial. |
| `frontend/src/hooks/useProcessMovements.ts` | Novo hook que conserva a última página confirmada durante carga e erro, reutilizando `useAuthRequest`/`useRequest`. |
| `frontend/src/services/process-service.ts` | Ampliar `getProcessById` e acrescentar `getProcessMovements`, usando `requestJson` e `AbortSignal`. |
| `frontend/src/services/process-response.ts` | Novo módulo de leitura e validação dos dois contratos JSON recebidos como `unknown`. |
| `frontend/src/services/movement-content.ts` | Novo módulo de prévia por caracteres Unicode, sem modificar o conteúdo original. |
| `frontend/src/services/process-feedback.ts` | Distinguir `INVALID_INPUT`, `PROCESS_NOT_FOUND` e falhas recuperáveis dos detalhes/histórico. |
| `frontend/src/types/process-details.ts`, `movement.ts`, `movement-page.ts`, `movement-page-input.ts` | Novos tipos, um contrato por arquivo, conforme a organização do frontend. |

Os componentes podem conter auxiliares privados pequenos no mesmo arquivo; não criar uma pasta ou abstração para cada rótulo. Reutilizar `DispatchLayout`, `LogoutButton`, o estilo de botões/links e os tokens Tailwind existentes. A rota em `App.tsx` não precisa mudar.

## Design de implementação

### Principais interfaces

Assinaturas conceituais; não constituem implementação. As funções de operação permanecem nomeadas. As factories existentes continuam apenas como composição das dependências, sem introduzir uma segunda infraestrutura de injeção.

```text
ProcessService
  search(cnj: string) -> Promise<ProcessSummary>
  getById(id: string) -> Promise<ProcessDetails>
  listMovements(input: MovementPageRequest) -> Promise<MovementPage>

ProcessRepository
  findById(id: number) -> Promise<Process | null>

MovementRepository
  countByProcess(processId: number) -> Promise<number>
  listPageByProcess(input: MovementPageQuery) -> Promise<Movement[]>
```

```text
Frontend process-service
  getProcessById(id: string, signal: AbortSignal) -> Promise<ProcessDetails>
  getProcessMovements(input: MovementPageInput, signal: AbortSignal)
    -> Promise<MovementPage>

useProcessDetails(id)
  -> { state, errorMessage, retry }

useProcessMovements(processId)
  -> { page, pending, errorMessage, loadPage, retry }
```

**Leitura no backend.** Validar o identificador, consultar a existência do processo e serializar os campos selecionados. Na leitura de movimentos, validar a query, verificar existência, contar os registros, validar o número da página e buscar somente seus itens. Uma base vazia para aquele processo permite somente a página 1. Usar `where: processId`, `skip: (page - 1) * 20`, `take: 20` e ordenação por `movementDate desc`, `sourceOrder asc`, `id asc`. O último critério só resolve um eventual empate técnico adicional; não altera a ordem original do CSV. Não inverter a lista crescente depois de paginar.

A fonte é estática nesta etapa: contagem e leitura podem ser consultas sequenciais, sem locks ou transação adicional. Não introduzir garantias para importação concorrente, excluída do PRD. O índice existente auxilia a seleção por processo, mas a combinação desc/asc pode exigir ordenação no banco; não criar índice novo sem evidência de necessidade. A API `findMany`/`skip`/`take` foi confirmada no cliente gerado local; a [documentação oficial de leitura do Prisma](https://www.prisma.io/docs/orm/fundamentals/reading-data) também apresenta o mapeamento dessas operações da versão 7. Manter a versão instalada e seu lock file.

**Leitura no frontend.** Montar uma subárvore de detalhes com chave composta pelo identificador de rota e `session.generation`. Ela inicia a carga de informações gerais; após sucesso, monta `ProcessMovements`, que busca a página 1. Esse encadeamento simples evita requisitar movimentos de um destino inválido e permite falha localizada no histórico. Trocar o processo desmonta e cancela ambas as leituras, descartando dados antigos antes de apresentar o novo destino. Essa reinicialização usa o mecanismo de identidade por `key` do [React](https://react.dev/learn/preserving-and-resetting-state).

**Paginação e falhas.** O hook de movimentos mantém a última página confirmada separada do estado transitório de `useRequest`, pois esse hook genérico limpa seus dados ao iniciar uma chamada. Registrar o destino solicitado para a nova tentativa, mas alterar página, total, intervalo e itens visíveis somente após sucesso. Enquanto a chamada estiver pendente, desabilitar anterior/próxima e nova tentativa. Usar o resultado de `run` para confirmar a página; resultados `stale` e respostas de outra geração/processo não atualizam o histórico. O timeout continua sendo reconhecido pelo estado de `useRequest`, mesmo se o transporte não concluir sua promise imediatamente.

Se o histórico responder `PROCESS_NOT_FOUND`, `ProcessMovements` aciona um callback `onProcessMissing` ligado à nova tentativa dos detalhes. Isso retira imediatamente os dados gerais da tela durante a revalidação e resolve o estado terminal pelo GET de detalhes, sem manter um processo desaparecido como se fosse apenas uma falha transitória de paginação.

**Ciclo de vida.** Efeitos ficam restritos à carga ao montar/trocar processo e à limpeza das requisições. Cliques de paginação e nova tentativa chamam handlers diretamente; não usar efeitos para sincronizar estados derivados. Preservar o timeout cliente de 15 segundos, o cancelamento e a invalidação de sessão já disponíveis. A limpeza de efeitos segue a [documentação de `useEffect`](https://react.dev/reference/react/useEffect). Não acrescentar polling, cache de páginas, retries automáticos ou persistência do histórico no navegador.

**Expansão e apresentação.** Cada `MovementItem` guarda apenas seu estado aberto/fechado e usa o ID do evento como chave estável. A lista recebe uma chave da página confirmada, reiniciando as expansões apenas na troca bem-sucedida de página. Contar os 500 caracteres como grafemas usando `Intl.Segmenter` nativo com granularidade `grapheme`; interromper a prévia após o limite e preservar o texto integral original. Isso evita cortar pares substitutos, acentos combinados e sequências de emoji, conforme a finalidade de segmentação da [API nativa](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter). O limite é de apresentação, não de transporte ou persistência.

Renderizar texto pelo escape padrão do React, sem `dangerouslySetInnerHTML`, Markdown ou transformação automática de URLs em links. Usar títulos hierárquicos, `dl`/`dt`/`dd` nos dados gerais, lista de eventos, botões nativos e link de retorno. Usar `white-space: pre-wrap`, quebra de palavras longas, `min-width: 0` e layout adaptável via Tailwind. Não acrescentar foco programático, regiões de anúncio ou controles próprios de zoom. Componentes compartilhados de outras páginas não serão refatorados para retirar comportamentos preexistentes.

### Modelos de dados

Todos os exemplos abaixo descrevem contratos, não código executável. Propriedades previstas no JSON sempre estão presentes; ausência admitida é representada por `null`, nunca por texto inventado. Mensagens como “Não informado” ficam na apresentação. Campos exibidos são formatados no backend, evitando serializar objetos `Decimal` ou aplicar fuso no navegador.

#### `Process` — persistência existente

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | Int | sim | Identificador interno positivo. |
| `cnj` | String única | sim | Identificador textual da origem. |
| `forum` | String | sim | Foro da origem. |
| `court` | String | sim | Vara da origem. |
| `lawsuitValue` | Decimal | sim | Valor exato convertido na carga. |
| `numberOfAuthors` | Int | sim | Quantidade de autores. |
| `movements` | Relação 1:N | sim | Movimentações vinculadas; não carregar junto aos dados gerais. |

Exemplo de registro, representando o Decimal textualmente: `id=17; cnj="1001399-31.2023.8.26.0070"; forum="Foro de Batatais"; court="2ª Vara Cível"; lawsuitValue="10000"; numberOfAuthors=1`.

#### `Movement` — persistência existente

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | Int | sim | Identidade do evento. |
| `processId` | Int/FK | sim | Processo ao qual pertence. |
| `movementDate` | DateTime, PostgreSQL DATE | sim | Dia civil, sem significado de horário. |
| `movementTitle` | String | sim | Título original. |
| `movementContent` | String ou null | não | Conteúdo original. |
| `sourceOrder` | Int | sim | Posição lógica no CSV para desempate. |

Exemplo de registro: `id=31; processId=17; movementDate="2023-12-05"; movementTitle="Certidão de Publicação Expedida"; movementContent=null; sourceOrder=1`.

O relacionamento, a unicidade do CNJ e o índice `(processId, movementDate, sourceOrder)` permanecem inalterados. IDs nos exemplos são ilustrativos; não são identificadores fixos para produção ou testes.

#### `ProcessDetails` — resposta de informações gerais

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | number | sim | Identificador do processo solicitado. |
| `cnj` | string | sim | CNJ preservado; vazio ou inválido impede a resposta de sucesso. |
| `forum` | string ou null | sim | Texto original ou ausência. |
| `court` | string ou null | sim | Texto original ou ausência. |
| `lawsuitValue` | string ou null | sim | Valor pronto para exibição brasileira, sem símbolo monetário. |
| `numberOfAuthors` | number ou null | sim | Inteiro não negativo; zero permanece zero. |

Exemplo JSON: `{"id":17,"cnj":"1001399-31.2023.8.26.0070","forum":"Foro de Batatais","court":"2ª Vara Cível","lawsuitValue":"10.000,00","numberOfAuthors":1}`.

Formatar `lawsuitValue` a partir de `Decimal.toFixed(2)`, agrupando a parte inteira e usando vírgula decimal, sem conversão intermediária para `Number`. Essa serialização não altera o valor persistido. Os valores fornecidos têm no máximo duas casas significativas. Se uma futura fonte trouxer mais casas, sua regra deve ser definida antes de aceitar a fonte; não acrescentar arredondamento de negócio a esta etapa.

#### `MovementItem` — evento para exibição

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | number | sim | Identidade estável do evento, usada como chave React. |
| `movementDate` | string ou null | sim | Dia civil em `DD/MM/AAAA`, pronto para exibir. |
| `movementTitle` | string ou null | sim | Título integral ou ausência defensiva. |
| `movementContent` | string ou null | sim | Conteúdo integral ou ausência; nunca apenas a prévia. |

Exemplo JSON: `{"id":31,"movementDate":"05/12/2023","movementTitle":"Certidão de Publicação Expedida","movementContent":null}`.

O nome do contrato é `MovementItem` no backend e `Movement` em `frontend/src/types/movement.ts`, onde não há modelo Prisma. `sourceOrder` e `processId` individuais ficam internos ao backend. Serializar a data usando seus componentes UTC, coerentes com a carga existente, sem horário. O navegador exibe a string recebida e não a reconverte por fuso.

#### `MovementPage` — resposta paginada

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `processId` | number | sim | Vínculo explícito com o processo solicitado. |
| `items` | MovementItem[] | sim | Até 20 eventos, na ordem global definida. |
| `page` | number | sim | Página confirmada, começando em 1. |
| `pageSize` | literal 20 | sim | Tamanho fixo. |
| `total` | number | sim | Total de eventos do processo. |
| `totalPages` | number | sim | Teto de `total / 20`; zero para histórico vazio. |

Exemplo JSON para processo com um evento: `{"processId":17,"items":[{"id":31,"movementDate":"05/12/2023","movementTitle":"Certidão de Publicação Expedida","movementContent":null}],"page":1,"pageSize":20,"total":1,"totalPages":1}`.

O frontend deriva o intervalo exibido da página confirmada e do tamanho da lista. Não manter cópias independentes de total ou intervalo no estado. A resposta não contém os dados gerais; não há envelope agregado com sucesso parcial.

#### `ProcessSummary` — contrato de busca preservado

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | number | sim | Identificador usado para navegar. |
| `cnj` | string | sim | Número do processo. |

Exemplo JSON: `{"id":17,"cnj":"1001399-31.2023.8.26.0070"}`. `POST /api/processes/search` mantém exclusivamente esse contrato. Os novos campos pertencem ao GET de detalhes.

#### `MovementPageRequest` — entrada do service no backend

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | sim | Parâmetro de rota bruto para validação. |
| `query` | unknown | sim | Query recebida, validada pelo schema do recurso. |

Exemplo: `{"id":"17","query":{"page":"2"}}`.

#### `MovementPageQuery` — entrada validada do repository

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `processId` | number | sim | Inteiro positivo validado. |
| `page` | number | sim | Página válida após verificar a contagem. |

Exemplo: `{"processId":17,"page":2}`. `skip`, `take` e ordenação são derivados dentro do repository e não controlados pelo cliente.

#### `MovementPageInput` — entrada do serviço HTTP no frontend

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `processId` | number | sim | ID recebido nos detalhes confirmados. |
| `page` | number | sim | Destino da navegação ou nova tentativa. |

Exemplo: `{"processId":17,"page":2}`. `AbortSignal` é argumento separado, seguindo o cliente existente.

#### Variantes e degradações

| Condição | Representação | Efeito observável |
| --- | --- | --- |
| Processo existente sem movimentos | `items=[]`, `total=0`, `totalPages=0`, `page=1` | Mensagem vazia do PRD e nenhum controle de paginação. |
| Conteúdo ausente/branco | `movementContent=null` | Data/título preservados e ausência de conteúdo complementar. |
| Campo geral inesperadamente ausente | Campo correspondente `null` | “Não informado” somente naquele campo. |
| Título ausente | `movementTitle=null` | “Título não informado”. |
| Data ausente/inválida em fixture defensiva | `movementDate=null` | “Data não informada”, depois dos eventos datados. |
| Identificação ausente/incoerente | Erro de serviço, sem DTO de sucesso | Falha inicial recuperável, nunca detalhes sem CNJ confiável. |
| Falha exclusiva no GET de movimentos | Envelope de erro HTTP | Detalhes preservados; erro local no histórico. |

Exemplo vazio: `{"processId":17,"items":[],"page":1,"pageSize":20,"total":0,"totalPages":0}`.

Exemplo incompleto: `{"id":31,"movementDate":null,"movementTitle":null,"movementContent":"Texto disponível."}`.

> Datas ausentes/inválidas não são graváveis no schema atual. A tolerância de RF10 é defensiva: normalizar ausência para `null`, exibir o rótulo e preservar a ordem recebida. Para verificar a posição global em CA-07, a fixture controlada deve representar o conjunto ordenado com todos os eventos sem data ao final **antes** de formar as páginas. Não reordenar somente uma página no navegador, alterar o schema para admitir nulos ou afirmar que fixtures comprovam armazenamento de datas inválidas. Uma futura fonte que permita datas ausentes exigirá definir essa ordenação na persistência antes de sua adoção.

Na serialização, textos compostos apenas de espaços viram `null`; textos não vazios são preservados integralmente, inclusive espaços e quebras de linha. O parser de resposta no frontend valida identidade, tipos e coerência de página/total; campos de apresentação ausentes são normalizados para `null`, mas ID ausente, processo divergente, lista malformada, IDs duplicados ou metadados incoerentes geram falha recuperável. Não descartar silenciosamente itens malformados. Não reordenar a resposta no cliente.

#### `ApiErrorResponse` — envelope existente

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `error.code` | string | sim | Código público para classificar o estado. |
| `error.message` | string | sim | Mensagem segura em português. |
| `error.field` | string ou null | sim | `null` nas novas leituras; não ampliar o enum de campos de formulário. |
| `error.retryAfterSeconds` | number ou null | sim | `null` nestes endpoints, salvo política existente. |

| Código | HTTP | Significado |
| --- | --- | --- |
| `INVALID_INPUT` | 400 | Identificador/query inválidos ou página fora do histórico. |
| `SESSION_INVALID` | 401 | Sessão ausente, revogada ou expirada. |
| `PROCESS_NOT_FOUND` | 404 | Identificador válido sem processo correspondente. |
| `SERVICE_UNAVAILABLE` | 503 | Falha de persistência classificada pelo service ou dados sem identificação confiável. |
| `SERVICE_UNAVAILABLE` | 500 | Falha inesperada tratada pelo middleware existente. |
| `REQUEST_TIMEOUT` | 504 | Prazo HTTP de 12 segundos excedido. |

Exemplo JSON: `{"error":{"code":"INVALID_INPUT","message":"O endereço do processo é inválido.","field":null,"retryAfterSeconds":null}}`.

O GET de detalhes não tem query funcional: seu `INVALID_INPUT` identifica endereço inválido. No GET de movimentos, o mesmo código identifica os parâmetros da solicitação; a UI não depende de comparar mensagens. Para query/página inválida, usar “A página de movimentações solicitada é inválida.”. Preservar as mensagens existentes de sessão, ausência e indisponibilidade. `REQUEST_TIMEOUT` já é emitido pelo middleware; alinhar sua declaração em `PublicErrorCode` ao ampliar os testes, sem mudar o envelope.

#### Mapeamento base importada → contrato

| Origem no CSV/base | Destino e transformação |
| --- | --- |
| `lawsuit_number` / `Process.cnj` | `ProcessDetails.cnj`, preservado. |
| `lawsuit_forum` / `Process.forum` | `ProcessDetails.forum`, texto ou null. |
| `lawsuit_court` / `Process.court` | `ProcessDetails.court`, texto ou null. |
| `lawsuit_value` / `Process.lawsuitValue` | `ProcessDetails.lawsuitValue`, decimal formatado sem moeda. |
| `lawsuit_number_of_authors` / `Process.numberOfAuthors` | `ProcessDetails.numberOfAuthors`, inteiro ou null. |
| `movement_date` / `Movement.movementDate` | `MovementItem.movementDate`, dia civil formatado. |
| `movement_title` / `Movement.movementTitle` | `MovementItem.movementTitle`, texto ou null. |
| `movement_content` / `Movement.movementContent` | `MovementItem.movementContent`, texto integral ou null. |
| `Movement.id`, `Movement.processId`, `Movement.sourceOrder` | Identidade, filtro de vínculo e desempate; não viram informações processuais adicionais. |

#### Parâmetros fixos

| Contexto | Parâmetro |
| --- | --- |
| GET de movimentos | `pageSize=20`; sem seletor de tamanho ou ordenação. |
| Ordenação | Data decrescente; origem crescente; ID crescente como último desempate. |
| Conteúdo | Prévia de 500 grafemas; texto completo na resposta. |
| HTTP | Timeout servidor existente de 12 s; cliente existente de 15 s. |
| Apresentação | Português brasileiro; duas casas no valor; sem símbolo de moeda. |

### Endpoints da API (se aplicável)

#### Visão geral

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/processes/:id` | Ampliar a leitura existente para informações gerais. |
| GET | `/api/processes/:id/movements` | Nova leitura paginada de movimentos. |

Ambos usam a sessão HTTP-only existente, `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `X-Request-Id` já aplicados em `/api`. O middleware de sessão precede validação e consulta. Em cada sucesso, o controller revalida a sessão e só escreve a resposta se ela não estiver encerrada, enviada ou expirada por timeout. Rejeições assíncronas continuam chegando ao middleware de erros pelo comportamento nativo do [Express 5](https://expressjs.com/en/guide/error-handling/).

---

#### `GET /api/processes/:id`

**Parâmetros de rota e consulta**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `id` | string decimal | — | Expressão `^[1-9][0-9]*$`, inteiro até 2.147.483.647. |
| Query | — | — | Sem parâmetros funcionais; preservar o comportamento atual de ignorá-los neste endpoint. |

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `ProcessDetails` | Processo encontrado, inclusive se não tiver movimentos ou um campo geral estiver ausente. |
| 400 | `ApiErrorResponse/INVALID_INPUT` | Identificador malformado ou fora da faixa. |
| 401 | `ApiErrorResponse/SESSION_INVALID` | Sessão inválida antes ou após a leitura. |
| 404 | `ApiErrorResponse/PROCESS_NOT_FOUND` | Identificador válido não encontrado. |
| 503, 500, 504 | `ApiErrorResponse` | Indisponibilidade, erro inesperado ou timeout, conforme a tabela de erros. |

**Exemplo — sucesso:** `GET /api/processes/17` → 200 com o exemplo de `ProcessDetails` acima.

**Exemplo — nenhuma correspondência:** `GET /api/processes/2147483647`, quando ausente na base → 404, código `PROCESS_NOT_FOUND`, demais campos conforme o envelope.

**Exemplo — endereço inválido:** `GET /api/processes/abc` → 400 com o exemplo de `ApiErrorResponse` acima.

> O comportamento de ID malformado muda de 404 para 400 para atender CA-14. Atualizar os testes dessa rota; a busca CNJ mantém seu contrato. Uma falha posterior do histórico não invalida um sucesso de detalhes já apresentado.

---

#### `GET /api/processes/:id/movements`

**Parâmetros de rota e consulta**

| Parâmetro | Tipo | Padrão | Regras |
| --- | --- | --- | --- |
| `id` | string decimal | — | Mesma validação do GET de detalhes. |
| `page` | string decimal | `1` | Inteiro de 1 a 2.147.483.647, com a mesma forma lexical; após contagem, deve existir no histórico. |
| Outros | — | — | Rejeitar parâmetros desconhecidos; tamanho e ordenação são fixos. |

Rejeitar string vazia, espaços, zero, negativos, frações, notação exponencial, arrays/repetição e objetos. Com zero eventos, `page=1` é a única página aceita. Página além da última gera 400, sem convertê-la silenciosamente à primeira e sem confundir esse erro com histórico vazio. O limite técnico da entrada não limita o histórico a 120 ou 1.000 eventos.

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | `MovementPage` | Processo existente e página válida. |
| 200 | Variante vazia de `MovementPage` | Processo existente com zero eventos, página 1. |
| 400 | `ApiErrorResponse/INVALID_INPUT` | ID, query ou página inválidos. |
| 401 | `ApiErrorResponse/SESSION_INVALID` | Sessão inválida antes ou após leitura. |
| 404 | `ApiErrorResponse/PROCESS_NOT_FOUND` | Processo inexistente, não apenas lista vazia. |
| 503, 500, 504 | `ApiErrorResponse` | Indisponibilidade, erro inesperado ou timeout. |

**Exemplo — sucesso:** `GET /api/processes/17/movements?page=1` → 200 com o exemplo de `MovementPage` acima.

**Exemplo — histórico vazio:** mesma chamada para processo existente sem eventos → 200 com o exemplo vazio da seção de variantes.

**Exemplo — erro:** `GET /api/processes/17/movements?page=0` → 400 com `INVALID_INPUT`, mensagem “A página de movimentações solicitada é inválida.”, `field=null` e `retryAfterSeconds=null`.

> Não há HTTP 206/207 ou resposta 200 com lista vazia para ocultar indisponibilidade. A degradação é feita pela UI: detalhes permanecem, a seção apresenta erro e, se houver, a última página confirmada. `SESSION_INVALID` sempre invalida a sessão; não conservar dados protegidos nesse caso. Um 404 posterior de movimentos invalida também os detalhes visíveis; esse caso não é tratado como falha temporária do histórico.

---

## Pontos de integração

Não há integração externa nova. A aplicação usa sua própria API, a sessão existente e a base importada. Referências ao TJSP no PRD não são dependências de execução. O proxy Vite de `/api` continua usando `VITE_API_PROXY_TARGET`; não acrescentar URLs fixas ou variáveis de ambiente.

GETs são leituras repetíveis, sem idempotency keys. Nova tentativa é explícita e limitada à seção afetada. Abort no cliente evita aplicar respostas obsoletas; não se presume que ele cancele uma consulta PostgreSQL já iniciada. Preservar os limites HTTP e não enviar resposta tardia.

## Abordagem de testes

Seguir FIRST, Given/When/Then ou AAA e a pirâmide definida nas rules. Manter Vitest, Testing Library, Supertest e Playwright já instalados. Stubs de banco/HTTP são adequados em unidade; integrações usam banco isolado e módulos reais, sem substituir justamente a colaboração sob teste. Cada linha representa um conceito com variantes parametrizadas quando cabível. A verificação de qualidade CA-22 depende do conjunto de casos e dos gates descritos abaixo.

### Testes de unidade (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TU-01 | Identificador de detalhes distingue formato inválido | CA-14 | Valores fora da gramática/faixa geram 400 sem consultar repository. |
| TU-02 | Query aceita somente página inteira permitida | CA-09, CA-14 | Default 1; rejeita vazios, arrays, parâmetros extras, limites e formatos inválidos. |
| TU-03 | Dados gerais preservam identidade e formatação | CA-01, CA-02, CA-07 | CNJ intacto, Decimal sem perda, zeros preservados, ausência em null e CNJ inválido sem sucesso. |
| TU-04 | Dia civil independe de fuso | CA-02, CA-07 | Mesmo `DD/MM/AAAA` nos fusos controlados; ausência/Date inválido normalizados em fixture. |
| TU-05 | Texto ausente difere de texto significativo | CA-05, CA-07 | Branco vira null; texto não vazio conserva espaços e quebras de linha. |
| TU-06 | Consulta paginada usa ordenação e vínculo corretos | CA-03, CA-04, CA-09 | Repository recebe filtro do processo, ordem global e deslocamento corretos; contrato asc antigo preservado. |
| TU-07 | Contagem determina páginas e limites | CA-08, CA-09, CA-10 | Totais 0/1/20/21/120/1000 geram metadados corretos e recusa de página excedente. |
| TU-08 | Prévia respeita 500 grafemas | CA-06 | Limites 500/501, emoji e acentos combinados não cortados; conteúdo de 15.266 caracteres integralmente recuperável. |
| TU-09 | Expansão afeta apenas o evento acionado | CA-06, CA-19 | Expandir/recolher mantém outros eventos e reinicia após troca confirmada de página. |
| TU-10 | Leitor de resposta valida vínculo e estrutura | CA-03, CA-07, CA-15 | Rejeita identidade/metadados incoerentes e normaliza ausências previstas sem descartar itens. |
| TU-11 | Carga inicial não simula ausência | CA-12, CA-13, CA-14 | Loading correto, mensagens específicas e retorno disponível. |
| TU-12 | Falha de histórico preserva detalhes | CA-11, CA-15 | Nova tentativa localizada; página antiga permanece inclusive após timeout. |
| TU-13 | Resposta obsoleta não repõe dados | CA-03, CA-13, CA-16 | Troca de ID, desmontagem ou geração descarta respostas anteriores e snapshot local. |
| TU-14 | Sessão inválida tem prioridade sobre recuperação local | CA-16 | Invalidação existente acionada; histórico não reaparece após resposta tardia. |
| TU-15 | Eventos vazios e incompletos têm apresentação explícita | CA-05, CA-07, CA-08 | Rótulos definidos, eventos sem data no final da fixture global paginada e zero eventos sem controles. |
| TU-16 | Conteúdo é renderizado literalmente | CA-18, CA-21 | Marcação/script/URL são texto, sem execução ou requisição adicional. |
| TU-17 | Controles nativos permitem operação por teclado | CA-19 | Tab/Enter/Espaço operam ações; sem exigência de foco automático ou leitores de tela. |
| TU-18 | Controller revalida antes de responder | CA-16, CA-21 | Revogação durante leitura ou resposta já encerrada impede entrega tardia. |
| TU-19 | Falhas de persistência recebem envelope público | CA-14, CA-15, CA-21 | Erros conhecidos preservados, indisponibilidade classificada e nenhum detalhe sensível exposto. |

Fixtures que violam campos obrigatórios devem atuar nas fronteiras de serialização/apresentação. Não inserir datas inválidas no banco nem alterar as restrições para viabilizar testes. O caso de sem-data valida a apresentação de um contrato defensivo globalmente ordenado, não uma capacidade inexistente de armazenamento.

### Testes de integração (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| TI-01 | Detalhes HTTP correspondem à persistência | CA-01, CA-02, CA-14 | Seleção e serialização reais, contrato ampliado e distinção 400/404. |
| TI-02 | Histórico preserva vínculo e ordem entre páginas | CA-03, CA-04, CA-09, CA-10 | Dataset de 1.000 eventos, 50 páginas e empates nas fronteiras sem perdas ou duplicações. |
| TI-03 | Processo vazio difere de ausente e página inválida | CA-08, CA-09, CA-14 | 200 vazio, 404 ausente e 400 página inválida; sem consulta ilimitada. |
| TI-04 | Duas leituras preservam proteção de sessão | CA-16 | Ausente, expirada e revogada bloqueiam; revogação durante consulta impede resposta. |
| TI-05 | Falhas e timeout preservam o contrato HTTP | CA-11, CA-15, CA-21 | 503/500/504 seguros, sem resposta dupla, dados ou stack no erro. |
| TI-06 | Leitura não modifica registros processuais | CA-21 | Snapshot dos registros antes/depois de detalhes e paginação idêntico. |
| TI-07 | Fixture CSV inteira permanece consultável | CA-01, CA-02, CA-04, CA-05, CA-06, CA-21 | Todos os campos dos 100 processos e 5.568 eventos correspondem à origem após formatação. |
| TI-08 | View e cliente HTTP preservam recuperação e retorno | CA-03, CA-11, CA-12, CA-13, CA-15, CA-17 | React Router/contexto/clientes reais com transporte controlado; rascunho da consulta preservado e nenhum dado de outra página/processo. |

TI-01–TI-06 usam CNJs exclusivos e cleanup filtrado, sem depender de seed prévio. TI-07 deve ampliar a auditoria no cenário já existente de `backend/src/seed/persist-seed.integration.test.ts`, antes de seu cleanup, chamando as novas leituras. Não criar uma segunda suíte paralela que importe e apague os mesmos CNJs originais: isso colidiria com o teste atual. Centralizar as assertions adicionais em um auxiliar de teste coeso se necessário para respeitar o limite de arquivo. Comparar ordem e valores com expectativa derivada independentemente da fixture, sem chamar o próprio serializador de produção para gerar o resultado esperado.

### Testes E2E (se aplicável)

| ID | Nome do caso de teste | Critérios de aceitação | Resultado esperado |
| --- | --- | --- | --- |
| E2E-01 | Consulta até detalhes, expansão, paginação e retorno | CA-01, CA-04, CA-06, CA-09, CA-17 | Jornada completa com backend real e texto integral; CNJ anterior preservado. |
| E2E-02 | Acesso direto e recarga independem da busca | CA-12, CA-13, CA-14 | Destino válido abre página 1; variantes inválida/ausente oferecem retorno. |
| E2E-03 | Histórico recupera falha sem apagar processo | CA-11, CA-15 | Falha controlada na requisição de movimentos, nova tentativa e confirmação da página correta. |
| E2E-04 | Expiração durante detalhes bloqueia paginação | CA-16 | Controle de expiração existente força sessão inválida; dados saem da tela. |
| E2E-05 | Detalhes permanecem utilizáveis por teclado e com ampliação | CA-19, CA-20 | Semântica básica, expansão/paginação/retorno operáveis, texto e controles não cortados. |

Criar `e2e/process-details.spec.ts` e reutilizar o suporte em `frontend/e2e-support/`. O Playwright existente sobe API, servidor de controle e SPA, mas requer banco E2E previamente migrado e com a fixture carregada. Resolver os IDs via busca CNJ; não fixar IDs de seed. Interceptar apenas falhas específicas em E2E-03, mantendo a jornada de sucesso com backend real. Usar o endpoint de controle `/expire-session` já restrito ao harness para E2E-04.

Em E2E-05, usar um viewport de celular e um de desktop, com conteúdo longo; verificar visibilidade, quebra de texto, dimensões e operação dos controles. Automatizar também ampliação de layout de 200% por CSS no ambiente de teste e complementar com uma verificação pontual do zoom nativo de 200% no navegador. CSS zoom é uma aproximação de layout, não prova de configuração do zoom nativo; `deviceScaleFactor` tampouco representa zoom do navegador. Registrar essa distinção na evidência. As referências são [emulação no Playwright](https://playwright.dev/docs/emulation) e [comportamento de CSS zoom](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/zoom). Não criar matriz de leitores de tela.

**Gates de CA-22:** executar em cada aplicativo `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`; executar `npm run test:e2e` em `frontend/`. Ambos os Vitest já exigem pelo menos 80% em linhas, funções, branches e statements. Manter esses limites e a cobertura global mínima de 80%, sem exclusões para esconder código novo. Usar os ambientes de teste existentes, sem credenciais em comandos versionados.

## Sequenciamento do desenvolvimento

### Ordem de construção

1. Definir DTOs e validação de entradas; cobrir formatação, ausências, limites e contratos de erro em unidade.
2. Ampliar repositories e serviços, preservando a busca mínima e a listagem crescente existente; testar consultas reais e paginação.
3. Conectar controllers/router/composição, mantendo a dupla verificação de sessão e o tratamento de timeout; atualizar fixtures e testes dos contratos alterados.
4. Ampliar serviços HTTP, leitores de resposta e hooks; testar troca de processo, página confirmada, recuperação e descarte de respostas obsoletas.
5. Compor a view e os três componentes de histórico, com expansão local e estilos existentes; remover a exigência de foco automático nos testes específicos de detalhes.
6. Integrar auditoria do CSV, E2E críticos e gates de qualidade. Registrar evidências de zoom nativo e limitações de emulação.

Esta ordem orienta a implementação posterior; a decomposição em tarefas é uma etapa separada.

### Dependências técnicas

- Node.js na faixa já declarada pelos aplicativos (`>=24.11.0 <25`) e dependências reproduzidas pelos respectivos lock files.
- PostgreSQL 17 do `backend/compose.yaml`, cliente Prisma gerado e migrations existentes aplicadas. Sem migration nova nesta entrega.
- Integração com `NODE_ENV=test`, banco isolado e `DATABASE_LABEL` terminado em `_test`, respeitando as proteções atuais. Não usar a base de desenvolvimento como fixture destrutiva.
- E2E com banco isolado `dev_test_resolvvi_e2e_test`, configuração em `frontend/playwright.config.ts` e navegador Playwright instalado. Portas padrão atuais: SPA 5100, API 3050 e controle 3051; reutilizar as opções existentes.
- Após a exploração, o usuário confirmou o envio do texto completo por página e a expansão imediata, sem uma requisição adicional por evento. Não há bloqueio por serviço externo ou decisão de domínio aberta.

## Monitoramento e observabilidade

Reutilizar `/health`, `X-Request-Id`, contexto de timeout e `config/logger.ts`. Não criar dashboards, analytics ou um novo serviço de observabilidade. Erros inesperados seguem o middleware existente; falhas de persistência convertidas em 503 devem gerar um registro `error` sanitizado no service, com operação estática e tipo de erro, sem CNJ, conteúdo, cookie ou payload completo. Não registrar sucesso de cada leitura.

Para avaliação de volume, registrar como evidência de teste o ambiente, o total de eventos, o tamanho da resposta e o tempo observado ao abrir detalhes e percorrer páginas no dataset de 1.000 eventos. Esses números são medições, não um novo SLA. Os limites de 12/15 segundos são mecanismos de recuperação existentes, não metas de latência.

## Considerações técnicas

### Principais decisões

- **Duas leituras HTTP:** separação suficiente para recuperação localizada, sem envelope parcial, endpoint por movimentação ou cache adicional.
- **Offset no servidor:** atende páginas explícitas e fonte estática com volume conhecido; evita transferir/renderizar o histórico inteiro. Cursores e virtualização não trazem benefício necessário nesta etapa.
- **Texto completo por página:** expansão imediata; até 20 conteúdos por resposta. A contrapartida é maior payload em páginas com textos extensos, coberta pelos testes de volume.
- **DTO pronto para exibir:** datas e valores já formatados, ausência em null e texto original preservado. Ordenação é responsabilidade do backend, não do formato textual apresentado.
- **Reuso de infraestrutura:** manter cliente HTTP, gestão de sessão, timeout, rotas, layout e dependências. Adaptar os pontos de integração necessários, sem refatorar autenticação.
- **Estado local delimitado:** snapshot da última página confirmado por sucesso, separado da requisição pendente e descartado ao trocar processo/sessão. A infraestrutura genérica de `useRequest` permanece inalterada.
- **Acessibilidade básica:** aplicar a decisão explícita do usuário registrada no PRD; nenhuma funcionalidade própria de leitor de tela ou zoom.

### Riscos conhecidos

- **Expectativas antigas de GET e foco:** testes atuais esperam `{id,cnj}`, 404 para ID inválido e foco no título “Processo encontrado”. Atualizar somente esses contratos alterados; preservar os testes de busca e sessão.
- **Snapshot após sessão inválida:** reter a última página exige chave por processo/geração e desmontagem pelo `ProtectedRoute`; verificar respostas tardias e expiração durante a leitura.
- **Datas defensivas e modelo obrigatório:** a ordenação de sem-data é verificada em contrato controlado, conforme explicado em variantes. Não enfraquecer o schema nem mascarar esse limite como cobertura de banco.
- **Precisão e fuso:** não converter Decimal para ponto flutuante nem formatar datas pelo fuso local; testes protegem os dois casos.
- **Fixture real compartilhada:** ampliar o cenário de seed existente evita corrida entre testes que limpam os mesmos CNJs.
- **Paginação e fonte mutável:** offset é consistente para a fonte estática definida. Uma futura atualização concorrente requer revisão, não locks antecipados.
- **Zoom automatizado:** emulação de layout não substitui a verificação pontual de zoom nativo. Não adicionar configuração de ampliação ao produto para facilitar testes.

### Conformidade com o AGENTS.md e as rules

Foram lidos integralmente `AGENTS.md` e os seis arquivos presentes em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. A exploração incluiu o agente Explore em modo somente leitura, o PRD completo, os módulos afetados, seus chamadores, configurações e testes.

- Manter frontend e backend independentes, fluxos por camada, contratos backend agrupados por contexto e um arquivo por tipo no frontend.
- Aplicar funções nomeadas, `import type`, tipos derivados do Prisma quando adequados, `unknown` nas entradas externas, `const`, comparações estritas, imutabilidade e cláusulas de guarda. Sem `any`, ternários aninhados ou imports circulares.
- Respeitar 300 linhas por arquivo TypeScript, 30 por função/componente, três parâmetros e 100 por classe. Auxiliares de serialização permanecem privados ao service enquanto o limite permitir; não exportar funções só para testes.
- Usar validadores no schema do recurso, services sem dependência HTTP, repositories como única camada de acesso ao banco e middleware para converter erros em resposta. Preservar factories existentes como adaptadores de composição, não como padrão para novas abstrações desnecessárias.
- Usar I/O assíncrono, configuração ambiental existente, logging sanitizado, npm e lock files separados. Não há leitura de CSV no caminho HTTP nem alteração no shutdown.
- Seguir testes de comportamento e os quatro limites de cobertura de 80%, com E2E em `e2e/`. As observações antigas do AGENTS sobre ausência de testes frontend e do arquivo JavaScript/TypeScript sobre ausência de lint backend estão desatualizadas: os scripts atuais foram verificados e devem ser executados.
- Para incrementos futuros de implementação, seguir commits locais coesos, Conventional Commits em inglês e identidade configurada; push continua separado. Este documento não implementa código nem certifica aprovação das suítes futuras.

### Conformidade com skills

| Skill aplicável do projeto | Aplicação e desvios |
| --- | --- |
| `.agents/skills/criar-techspec/SKILL.md` | Estrutura do template, exploração antes do esclarecimento, contratos, casos TU/TI/E2E rastreáveis e especificação sem implementação. A ferramenta de perguntas disponível substitui `AskUserQuestion`. |
| `.agents/skills/react/SKILL.md` | Lidos também os exemplos de componentes, efeitos, backend, acessibilidade, estilização e as dez boas práticas. Componentes pequenos, props explícitas, hooks puros, limpeza de efeitos, chaves estáveis, estado sem redundância e Tailwind. |

**Desvio deliberado da skill React:** a orientação de anúncios assíncronos não se aplica como requisito novo nesta página porque o usuário limitou expressamente a acessibilidade e o PRD exclui anúncios e gerenciamento programático de foco. Usar semântica e controles nativos; não acrescentar infraestrutura de anúncios. A localização de chamadas HTTP segue `frontend/src/services/` das rules, em vez do caminho ilustrativo `src/lib/api` da skill. Nenhuma skill de redesign ou implementação foi aplicada: a entrega é documental e reutiliza a interface existente.

### Arquivos relevantes e dependentes

Os componentes de produção novos/modificados estão enumerados em “Visão dos componentes”. Seus testes ficam adjacentes. Complementam o mapa de implementação:

| Arquivo ou grupo | Papel |
| --- | --- |
| `tasks/prd-detalhes-processo/prd.md` | Fonte de requisitos e critérios, incluindo o limite de acessibilidade. |
| `backend/prisma/schema.prisma` e migrations existentes | Dependência de leitura; sem alteração. |
| `backend/src/repositories/index.ts`, `services/index.ts`, `controllers/index.ts`, `schemas/index.ts`, `errors/index.ts`, `types/index.ts` | Ajustar somente reexports públicos necessários, sem imports do próprio barrel dentro de uma camada. |
| `backend/src/types/errors.ts` | Alinhar declaração de `REQUEST_TIMEOUT` já emitido, preservando códigos existentes. |
| `backend/src/services/process-service.test.ts`, `controllers/process-controller.test.ts`, `schemas/process-schema.test.ts` | Ampliar cenários de serviços, handlers e validação. |
| `backend/src/repositories/process-repository.test.ts`, `process-repository.integration.test.ts`, `movement-repository.test.ts` | Ampliar consultas e preservar a fundação. |
| `backend/src/repositories/movement-repository.integration.test.ts` | Novo conjunto de integração de paginação e volume. |
| `backend/src/routers/process-router.integration.test.ts`, `process-data.integrity.integration.test.ts` | Ampliar contratos HTTP, proteção e ausência de mutações. |
| `backend/src/seed/persist-seed.integration.test.ts` | Incorporar auditoria dos dados reais no cenário já isolado. |
| `backend/src/middlewares/session-middleware.ts`, `request-context-middleware.ts`, `error-middleware.ts` | Dependências existentes; preservar precedência, timeout e envelope. |
| `frontend/src/hooks/useRequest.ts`, `useAuthRequest.ts` e testes existentes | Reutilização; não alterar contrato genérico para atender somente paginação. |
| `frontend/src/components/ProtectedRoute.tsx`, `DispatchLayout.tsx`, `LogoutButton.tsx` | Dependências de sessão, estrutura visual e saída. |
| `frontend/src/services/http-client.ts`, `process-input.ts` | Transporte e preservação do CNJ existentes. |
| `frontend/src/views/process-views.test.tsx`, `services/process-service.test.ts`, `services/process-feedback.test.ts` | Atualizar contratos ampliados e remover a expectativa de foco automático no título de detalhes. |
| Novos testes adjacentes de hooks, componentes e serviços de detalhes | Cobrir os casos TU e TI-08 descritos. |
| `e2e/process-details.spec.ts` | Novos fluxos E2E; preservar `e2e/authentication-and-search.spec.ts`. |
| `frontend/e2e-support/session.ts`, `playwright.ts`, `frontend/playwright.config.ts`, `backend/src/e2e-harness.ts` | Reutilizar suporte, configuração e expiração controlada; sem novo servidor de teste. |
| `backend/compose.yaml`, `backend/vitest.config.ts`, `frontend/vitest.config.ts`, manifests e lock files | Infraestrutura e gates existentes; sem novas dependências. |
