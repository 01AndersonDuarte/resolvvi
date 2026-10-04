# Tarefa 1.0: API de detalhes do processo

## Visão geral

Ampliar o GET existente para entregar informações gerais formatadas e protegidas pela sessão, com distinção entre destino inválido, processo ausente e indisponibilidade. Esta entrega deixa o endpoint de detalhes utilizável independentemente do histórico.

**Dependências:** Nenhuma tarefa desta decomposição; requer fundação de dados, autenticação e busca existentes.

**Status:** pendente de implementação.

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
Requisitos relacionados: RF1, RF2, RF3, RF4, RF15, RF17, RF18, RF19, RF20.

- Preservar o contrato mínimo da busca CNJ e usar somente a base persistida, sem alterações de registros.
- Entregar CNJ confiável, foro, vara, valor sem moeda e quantidade de autores; preservar zeros e representar ausências admitidas conforme a TechSpec.
- Aplicar autenticação antes da validação e revalidar sessão antes do sucesso; impedir respostas tardias e expor somente erros públicos.
</requirements>

## Subtarefas

- [ ] 1.1 Concentrar os contratos de detalhes no contexto de tipos de processos e acrescentar validação de identificador e factories de erro.
- [ ] 1.2 Ampliar repository e service para seleção dos campos gerais, formatação exata e tratamento defensivo das ausências.
- [ ] 1.3 Integrar controller e router ao contrato ampliado, mantendo a revalidação de sessão e as proteções HTTP existentes.
- [ ] 1.4 Classificar falhas de persistência e alinhar REQUEST_TIMEOUT no tipo de códigos públicos; registrar somente contexto sanitizado.
- [ ] 1.5 Implementar os casos unitários e TI-01; atualizar fixtures do GET alterado e preservar os testes de busca e sessão.
- [ ] 1.6 Executar as validações da tarefa e registrar evidências; atualizar os checklists e criar o commit local do incremento.

## Detalhes de implementação

Seguir as seções abaixo do [techspec.md](./techspec.md), fonte de verdade dos contratos e casos de teste:

- Principais interfaces: leitura no backend.
- Modelos de dados: ProcessDetails, ProcessSummary e ApiErrorResponse.
- Endpoints da API: GET /api/processes/:id.
- Monitoramento e observabilidade.

TU-18 e TU-19 cobrem aqui a leitura de detalhes; a tarefa 2 amplia os mesmos casos para movimentos. TI-01 usa CNJs exclusivos e cleanup filtrado. Campos obrigatórios ausentes são simulados na fronteira do service, sem enfraquecer o schema.

## Critérios de aceitação relacionados

Referências ao [PRD](./prd.md). A validação dos critérios é responsabilidade do QA; esta tarefa produz a implementação e/ou as evidências correspondentes.

- CA-01
- CA-02
- CA-07
- CA-12
- CA-14
- CA-15
- CA-16
- CA-21
- CA-22

## Testes da tarefa

IDs, nomes e resultados esperados preservados da TechSpec. Casos compartilhados têm seu recorte explicitado em “Detalhes de implementação”.

### Testes de unidade

- [ ] TU-01 — Identificador de detalhes distingue formato inválido. Valores fora da gramática/faixa geram 400 sem consultar repository.
- [ ] TU-03 — Dados gerais preservam identidade e formatação. CNJ intacto, Decimal sem perda, zeros preservados, ausência em null e CNJ inválido sem sucesso.
- [ ] TU-18 — Controller revalida antes de responder. Revogação durante leitura ou resposta já encerrada impede entrega tardia.
- [ ] TU-19 — Falhas de persistência recebem envelope público. Erros conhecidos preservados, indisponibilidade classificada e nenhum detalhe sensível exposto.

### Testes de integração

- [ ] TI-01 — Detalhes HTTP correspondem à persistência. Seleção e serialização reais, contrato ampliado e distinção 400/404.

### Validações de conclusão

Executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` no aplicativo afetado. Os scripts atuais existem em ambos os aplicativos; prevalecem sobre as observações antigas de ausência de lint/testes. Não reduzir os limites de cobertura nem excluir código novo para atingir o percentual.

## Arquivos relevantes

- [PRD](./prd.md) e [TechSpec](./techspec.md).
- `backend/src/types/process.ts`.
- `backend/src/types/errors.ts`.
- `backend/src/repositories/process-repository.ts`.
- `backend/src/services/process-service.ts`.
- `backend/src/schemas/process-schema.ts`.
- `backend/src/errors/process-errors.ts`.
- `backend/src/controllers/process-controller.ts`.
- `backend/src/routers/process-router.ts`.
- `backend/src/routers/process-router.integration.test.ts`.
- `backend/src/repositories/process-repository.integration.test.ts`.
- Testes unitários e de integração adjacentes aos módulos alterados; arquivos novos seguem os nomes da TechSpec.
- Barrels públicos das camadas alteradas, somente para reexports necessários.

Os caminhos novos indicam arquivos a criar na implementação; dependências existentes são referências, sem obrigação de alterá-las.
