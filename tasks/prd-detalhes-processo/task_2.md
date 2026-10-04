# Tarefa 2.0: API de movimentações paginadas

## Visão geral

Disponibilizar o GET de movimentações com páginas fixas de 20 itens, conteúdo integral, ordenação global estável e contagens corretas. Validar a leitura conjunta dos dois endpoints, incluindo proteção, volume e preservação da base.

**Dependências:** [1.0](./task_1.md)

**Status:** concluída e validada.

<skills>
### Conformidade com skills

Skill de execução aplicável: [`executar-task`](../../.agents/skills/executar-task/SKILL.md). Não há skill específica de backend necessária; seguir as rules.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura concluída de `AGENTS.md` e de todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Manter aplicativos independentes, funções de até 30 linhas e arquivos TypeScript de até 300 linhas, tipos seguros, imports sem ciclos e testes de comportamento segundo FIRST/AAA. Preservar cobertura mínima de 80%, segredos fora do código e logs sanitizados. Ao executar, revisar o diff, atualizar os checklists e criar commit local coeso com identidade Git configurada e Conventional Commits em inglês; push exige autorização separada.

No backend, agrupar contratos por contexto em `types/`, manter acesso ao banco nos repositories e regras nos services; controllers não convertem erros em respostas. Preservar I/O assíncrono, configuração e logging existentes. Não modificar migrations, CSV ou constraints para acomodar fixtures defensivas.
</rules>

<requirements>
Requisitos relacionados: RF1, RF2, RF6, RF7, RF9, RF10, RF11, RF12, RF13, RF14, RF17, RF18, RF19, RF21.

- Preservar o vínculo ao processo e a ordenação decrescente com desempate pela origem, incluindo fronteiras de páginas; manter a listagem crescente da fundação.
- Distinguir processo vazio, processo ausente e página inválida; não limitar o histórico ao máximo observado de 120 eventos.
- Enviar textos completos e datas civis formatadas, com tratamento defensivo de ausências e erros seguros.
- Reutilizar sessão, timeout e composição existentes, sem migrations ou integrações externas.
</requirements>

## Subtarefas

- [x] 2.1 Acrescentar contratos de movimentações, validação da query e contagem/leitura paginada no repository existente.
- [x] 2.2 Implementar existência, limites de página, metadados e serialização no service, preservando texto significativo e dia civil.
- [x] 2.3 Registrar o endpoint autenticado e compor movementRepository em router, tipos HTTP e servidor; revalidar sessão antes de responder.
- [x] 2.4 Cobrir os casos unitários e integrações TI-02 a TI-06, incluindo ambos os endpoints nos testes de sessão, falhas e integridade.
- [x] 2.5 Percorrer as 50 páginas do dataset isolado de 1.000 eventos, com empates nas fronteiras; registrar ambiente, tamanho das respostas e tempos observados.
- [x] 2.6 Executar as validações da tarefa e registrar evidências; atualizar os checklists e criar o commit local do incremento.

## Detalhes de implementação

Seguir as seções abaixo do [techspec.md](./techspec.md), fonte de verdade dos contratos e casos de teste:

- Principais interfaces: leitura no backend.
- Modelos de dados: MovementItem, MovementPage, entradas, variantes e parâmetros fixos.
- Endpoints da API: GET /api/processes/:id/movements.
- Abordagem de testes: TI-02 a TI-06.
- Monitoramento e observabilidade.

TU-18/TU-19 estendem a tarefa 1 à nova leitura. TI-04/TI-05 verificam os dois endpoints. TI-06 compara snapshots antes/depois. TI-02 valida 1.000 eventos sem perdas, duplicações ou consulta ilimitada. Todas as integrações usam CNJs exclusivos e cleanup filtrado. Ausência/invalidade de data é fixture de serialização, nunca inserção inválida no banco. Medições não constituem SLA.

## Critérios de aceitação relacionados

Referências ao [PRD](./prd.md). A validação dos critérios é responsabilidade do QA; esta tarefa produz a implementação e/ou as evidências correspondentes.

- CA-02
- CA-03
- CA-04
- CA-05
- CA-07
- CA-08
- CA-09
- CA-10
- CA-11
- CA-14
- CA-15
- CA-16
- CA-21
- CA-22

## Testes da tarefa

IDs, nomes e resultados esperados preservados da TechSpec. Casos compartilhados têm seu recorte explicitado em “Detalhes de implementação”.

### Testes de unidade

- [x] TU-02 — Query aceita somente página inteira permitida. Default 1; rejeita vazios, arrays, parâmetros extras, limites e formatos inválidos.
- [x] TU-04 — Dia civil independe de fuso. Mesmo `DD/MM/AAAA` nos fusos controlados; ausência/Date inválido normalizados em fixture.
- [x] TU-05 — Texto ausente difere de texto significativo. Branco vira null; texto não vazio conserva espaços e quebras de linha.
- [x] TU-06 — Consulta paginada usa ordenação e vínculo corretos. Repository recebe filtro do processo, ordem global e deslocamento corretos; contrato asc antigo preservado.
- [x] TU-07 — Contagem determina páginas e limites. Totais 0/1/20/21/120/1000 geram metadados corretos e recusa de página excedente.
- [x] TU-18 — Controller revalida antes de responder. Revogação durante leitura ou resposta já encerrada impede entrega tardia.
- [x] TU-19 — Falhas de persistência recebem envelope público. Erros conhecidos preservados, indisponibilidade classificada e nenhum detalhe sensível exposto.

### Testes de integração

- [x] TI-02 — Histórico preserva vínculo e ordem entre páginas. Dataset de 1.000 eventos, 50 páginas e empates nas fronteiras sem perdas ou duplicações.
- [x] TI-03 — Processo vazio difere de ausente e página inválida. 200 vazio, 404 ausente e 400 página inválida; sem consulta ilimitada.
- [x] TI-04 — Duas leituras preservam proteção de sessão. Ausente, expirada e revogada bloqueiam; revogação durante consulta impede resposta.
- [x] TI-05 — Falhas e timeout preservam o contrato HTTP. 503/500/504 seguros, sem resposta dupla, dados ou stack no erro.
- [x] TI-06 — Leitura não modifica registros processuais. Snapshot dos registros antes/depois de detalhes e paginação idêntico.

### Validações de conclusão

Executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` no aplicativo afetado. Os scripts atuais existem em ambos os aplicativos; prevalecem sobre as observações antigas de ausência de lint/testes. Não reduzir os limites de cobertura nem excluir código novo para atingir o percentual.

### Evidências da execução

- Aplicativo: backend; Node.js `v24.11.0`; PostgreSQL de teste isolado (`dev_test_resolvvi_test`).
- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados.
- `npm test`: 32 arquivos e 167 testes aprovados.
- `npm run test:coverage`: 87,98% statements, 85,50% branches, 86,86% funções e 90,16% linhas.
- TI-02: 1.000 eventos em 50 páginas; 1.000 IDs únicos e ordenados, sem mistura; payloads totalizaram 127.877 bytes e a execução observou 861,87 ms. Medição observacional, sem constituir SLA.

## Arquivos relevantes

- [PRD](./prd.md) e [TechSpec](./techspec.md).
- `backend/src/types/process.ts`.
- `backend/src/types/http.ts`.
- `backend/src/server.ts`.
- `backend/src/schemas/process-schema.ts`.
- `backend/src/repositories/movement-repository.ts`.
- `backend/src/services/process-service.ts`.
- `backend/src/controllers/process-controller.ts`.
- `backend/src/routers/process-router.ts`.
- `backend/src/repositories/movement-repository.integration.test.ts`.
- `backend/src/routers/process-router.integration.test.ts`.
- `backend/src/routers/process-data.integrity.integration.test.ts`.
- Testes unitários e de integração adjacentes aos módulos alterados; arquivos novos seguem os nomes da TechSpec.
- Barrels públicos das camadas alteradas, somente para reexports necessários.

Os caminhos novos indicam arquivos a criar na implementação; dependências existentes são referências, sem obrigação de alterá-las.
