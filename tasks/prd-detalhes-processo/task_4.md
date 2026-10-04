# Tarefa 4.0: Cliente HTTP e hooks de detalhes e histórico

## Visão geral

Preparar o consumo dos dois endpoints e os estados de carregamento e recuperação. Os hooks devem conservar a última página confirmada dentro do processo e sessão corretos, descartando respostas obsoletas.

**Dependências:** [1.0](./task_1.md), [2.0](./task_2.md)

**Status:** pendente de implementação.

<skills>
### Conformidade com skills

Carregar obrigatoriamente [`react`](../../.agents/skills/react/SKILL.md) antes de implementar ou revisar frontend, incluindo as referências pertinentes. Skill de execução aplicável: [`executar-task`](../../.agents/skills/executar-task/SKILL.md). Reutilizar a interface existente, sem ampliar o escopo para redesign.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura concluída de `AGENTS.md` e de todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Manter aplicativos independentes, funções de até 30 linhas e arquivos TypeScript de até 300 linhas, tipos seguros, imports sem ciclos e testes de comportamento segundo FIRST/AAA. Preservar cobertura mínima de 80%, segredos fora do código e logs sanitizados. Ao executar, revisar o diff, atualizar os checklists e criar commit local coeso com identidade Git configurada e Conventional Commits em inglês; push exige autorização separada.

No frontend, separar views/components, hooks, services e tipos por arquivo; usar Tailwind, props explícitas e estado sem redundância. O limite de acessibilidade definido no PRD prevalece sobre a orientação genérica da skill React de anúncios assíncronos: não acrescentar anúncios, foco programático ou controles próprios de zoom. Chamadas HTTP ficam em `src/services/`, conforme as rules.
</rules>

<requirements>
Requisitos relacionados: RF2, RF12, RF14, RF15, RF16, RF17, RF18, RF19, RF20.

- Validar JSON recebido como unknown e sua identidade, vínculo e coerência; normalizar apenas as ausências previstas e rejeitar listas ou metadados inválidos.
- Separar destino solicitado e página confirmada; confirmar itens e metadados somente após sucesso e permitir nova tentativa do destino que falhou.
- Reutilizar cancelamento, timeout e invalidação de sessão existentes; distinguir erro terminal de processo ausente de falha recuperável do histórico.
</requirements>

## Subtarefas

- [ ] 4.1 Criar os tipos de detalhes, movimento, página e entrada e ampliar os serviços HTTP e as mensagens de feedback.
- [ ] 4.2 Implementar leitores dos contratos com validação de identidade, duplicações, campos e metadados, sem descartar silenciosamente itens ou reordenar a resposta.
- [ ] 4.3 Ampliar useProcessDetails com recuperação e criar useProcessMovements com snapshot confirmado, destino pendente e bloqueio de chamadas concorrentes.
- [ ] 4.4 Tratar timeout, cancelamento, desmontagem e geração de sessão; disponibilizar a sinalização de processo ausente para a integração visual.
- [ ] 4.5 Implementar TU-10 e as variantes de hooks de TU-12, TU-13 e TU-14, preservando o contrato genérico de useRequest.
- [ ] 4.6 Executar as validações da tarefa e registrar evidências; atualizar os checklists e criar o commit local do incremento.

## Detalhes de implementação

Seguir as seções abaixo do [techspec.md](./techspec.md), fonte de verdade dos contratos e casos de teste:

- Principais interfaces: leitura no frontend, paginação e falhas, ciclo de vida.
- Modelos de dados: variantes e degradações.
- Pontos de integração.
- Visão dos componentes: serviços, tipos e hooks frontend.

TU-12 verifica aqui o estado do hook, inclusive timeout com promise de transporte pendente; a preservação visual dos detalhes será concluída na tarefa 6. TU-13/TU-14 cobrem cancelamento e sessão nos hooks; a tarefa 5 verifica a identidade da subárvore. Não adicionar polling, cache de páginas, retry automático ou persistência no navegador.

## Critérios de aceitação relacionados

Referências ao [PRD](./prd.md). A validação dos critérios é responsabilidade do QA; esta tarefa produz a implementação e/ou as evidências correspondentes.

- CA-03
- CA-07
- CA-11
- CA-12
- CA-13
- CA-14
- CA-15
- CA-16
- CA-22

## Testes da tarefa

IDs, nomes e resultados esperados preservados da TechSpec. Casos compartilhados têm seu recorte explicitado em “Detalhes de implementação”.

### Testes de unidade

- [ ] TU-10 — Leitor de resposta valida vínculo e estrutura. Rejeita identidade/metadados incoerentes e normaliza ausências previstas sem descartar itens.
- [ ] TU-12 — Falha de histórico preserva detalhes. Nova tentativa localizada; página antiga permanece inclusive após timeout.
- [ ] TU-13 — Resposta obsoleta não repõe dados. Troca de ID, desmontagem ou geração descarta respostas anteriores e snapshot local.
- [ ] TU-14 — Sessão inválida tem prioridade sobre recuperação local. Invalidação existente acionada; histórico não reaparece após resposta tardia.

### Validações de conclusão

Executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` no aplicativo afetado. Os scripts atuais existem em ambos os aplicativos; prevalecem sobre as observações antigas de ausência de lint/testes. Não reduzir os limites de cobertura nem excluir código novo para atingir o percentual.

## Arquivos relevantes

- [PRD](./prd.md) e [TechSpec](./techspec.md).
- `frontend/src/services/process-service.ts`.
- `frontend/src/services/process-response.ts`.
- `frontend/src/services/process-feedback.ts`.
- `frontend/src/hooks/useProcessDetails.ts`.
- `frontend/src/hooks/useProcessMovements.ts`.
- `frontend/src/hooks/useRequest.ts`.
- `frontend/src/hooks/useAuthRequest.ts`.
- `frontend/src/types/process-details.ts`.
- `frontend/src/types/movement.ts`.
- `frontend/src/types/movement-page.ts`.
- `frontend/src/types/movement-page-input.ts`.
- Testes unitários e de integração adjacentes aos módulos alterados; arquivos novos seguem os nomes da TechSpec.

Os caminhos novos indicam arquivos a criar na implementação; dependências existentes são referências, sem obrigação de alterá-las.
