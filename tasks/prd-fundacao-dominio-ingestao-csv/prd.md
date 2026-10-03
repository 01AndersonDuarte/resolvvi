# Documento de Requisitos do Produto (PRD)

## Visão geral

Esta etapa estabelece a fundação do domínio de processos judiciais e movimentações processuais. O backend deve persistir os dados fornecidos em `lawsuits_movements.csv`, relacionando cada movimentação ao seu processo e preservando o conteúdo disponível para consumo futuro.

O CSV é uma fonte confiável, previamente formatada, usada uma única vez para popular o banco inicial. A entrega não cria um produto de ingestão, uma operação recorrente ou uma experiência para operador.

## Objetivos

- Representar Processo e Movimentação Processual com relação `1 Processo -> N Movimentações`.
- Persistir os oito campos do CSV sem descartar textos ou zeros do CNJ.
- Garantir no máximo um processo por CNJ.
- Carregar a versão fornecida em uma base vazia com 100 processos e 5.568 movimentações.
- Manter testes automatizados para as regras do domínio, do mapeamento e da persistência, respeitando a cobertura mínima de 80% definida nas rules.

## Histórias de usuário

- **US1:** Como responsável pelo backend, quero consultar processos e suas movimentações no banco para disponibilizar uma base inicial consistente.
- **US2:** Como responsável pelo domínio, quero que o CNJ identifique unicamente o processo para evitar processos duplicados.
- **US3:** Como responsável pela carga inicial, quero executar um seed simples com o CSV fornecido para criar os dados necessários ao desenvolvimento das próximas etapas.

## Principais funcionalidades

### 1. Entidade Processo

**RF1 — Processo:** representar `lawsuit_number` como CNJ textual obrigatório e único, preservando zeros e a forma identificadora do processo. Persistir foro, vara, valor da ação e quantidade de autores.

### 2. Entidade Movimentação Processual

**RF2 — Movimentação:** representar data, título e conteúdo opcional. Cada movimentação deve estar vinculada a exatamente um processo.

**RF3 — Relação:** um processo pode possuir várias movimentações; uma movimentação não pode existir sem seu processo.

**RF4 — Ordenação:** permitir recuperar as movimentações por data crescente e, quando houver empate, pela ordem em que aparecem no CSV.

### 3. Seed inicial

**RF5 — Mapeamento:** ler o cabeçalho e as oito colunas conhecidas do arquivo fornecido, convertendo cada registro lógico para um processo e uma movimentação.

**RF6 — Execução:** oferecer um comando simples para executar o seed uma vez contra o banco configurado. O comando deve interromper com erro quando não conseguir ler o arquivo ou persistir os dados.

**RF7 — Integridade:** gravar os dados do seed de forma transacional, sem deixar processos sem movimentações quando a operação não puder ser concluída.

**RF8 — Testes:** proteger as regras reais com testes unitários e de integração, usando o CSV fornecido como fixture de aceitação da carga inicial.

### Mapeamento do arquivo

| Coluna | Campo de destino | Regra |
| --- | --- | --- |
| `lawsuit_number` | Processo.cnj | Texto obrigatório e único |
| `lawsuit_forum` | Processo.forum | Texto fornecido pela fonte |
| `lawsuit_court` | Processo.court | Texto fornecido pela fonte |
| `lawsuit_value` | Processo.lawsuitValue | Valor numérico da fonte |
| `lawsuit_number_of_authors` | Processo.numberOfAuthors | Quantidade inteira da fonte |
| `movement_date` | Movimentação.movementDate | Data civil da fonte |
| `movement_title` | Movimentação.movementTitle | Texto obrigatório |
| `movement_content` | Movimentação.movementContent | Texto opcional; vazio permanece ausente |

O arquivo observado contém 5.568 registros lógicos e 100 CNJs. Esses números validam a carga desta versão específica e não definem um pipeline ou um limite geral do produto.

## Critérios de aceitação

- **CA-01:** Dada uma base vazia e o CSV fornecido, quando o seed for executado, então existirão 100 processos e 5.568 movimentações.
- **CA-02:** Dado um registro do CSV, quando seus dados forem persistidos, então os campos do processo e da movimentação corresponderão à origem, incluindo zeros, acentos, quebras de linha e conteúdo vazio.
- **CA-03:** Dado um processo persistido, quando suas movimentações forem recuperadas, então todas estarão vinculadas a ele e poderão ser ordenadas por data e ordem de origem.
- **CA-04:** Dado um CNJ já persistido, quando o banco receber outro processo com o mesmo CNJ, então a unicidade do processo será preservada.
- **CA-05:** Dado um arquivo ausente, ilegível ou incompatível com o cabeçalho conhecido, quando o seed for executado, então ele falhará sem concluir uma gravação parcial.
- **CA-06:** Dado o código produzido para esta etapa, quando a suíte de testes for executada, então os comportamentos relevantes estarão cobertos e a cobertura mínima de 80% será respeitada.

## Experiência do usuário

Não há interface gráfica, endpoint público ou jornada de operador. A única interação desta etapa é a execução técnica do comando de seed documentado no backend. O resultado esperado é a base persistida e uma mensagem de sucesso ou erro no processo.

## Restrições técnicas de alto nível

- O backend usa PostgreSQL e mantém suas dependências e seu lock file em `backend/`.
- O CSV deve permanecer inalterado e ser lido como arquivo UTF-8 delimitado por vírgulas, com aspas para campos que contenham vírgulas ou quebras de linha.
- Os dados processuais ficam no ambiente controlado do projeto; não há chamadas a tribunais, serviços de IA ou outros serviços externos.
- Os testes devem seguir `.agents/rules/tests.md`, com Vitest e dependências controladas.

## Fora do escopo

- Reexecução, idempotência, deduplicação ou atualização incremental da carga.
- Entidades de execução, auditoria, relatórios persistentes, reconciliação ou recuperação de importações.
- Processamento parcial, continuação após registros inválidos, concorrência, locking ou experiência de operador.
- Parser CSV genérico, suporte a formatos alternativos e normalizações criadas para ETL.
- API, tela de consulta, autenticação e funcionalidades de negócio posteriores.
- Qualquer dado que não esteja nas oito colunas fornecidas.
