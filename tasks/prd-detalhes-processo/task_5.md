# Tarefa 5.0: Página de informações gerais e estados de detalhes

## Visão geral

Substituir a apresentação mínima pelas informações gerais do processo, com identificação clara, aviso da fonte e estados recuperáveis. Preservar a rota e o retorno existentes, preparando a composição do histórico na tarefa seguinte.

**Dependências:** [4.0](./task_4.md)

**Status:** concluída e validada.

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
Requisitos relacionados: RF2, RF3, RF4, RF5, RF15, RF16, RF17, RF18, RF19, RF20.

- Exibir CNJ, os quatro campos gerais e o aviso de fonte do PRD; distinguir ausência de zero e não mostrar detalhes sem identificação confiável.
- Carregar por endereço direto ou recarga, sem depender da busca, e distinguir loading, endereço inválido, processo ausente e falha recuperável.
- Isolar a subárvore por processo e geração de sessão, retirar dados anteriores e preservar o CNJ da consulta no retorno quando existente.
- Usar semântica nativa, foco visível e layout adaptável dentro do escopo de acessibilidade aprovado.
</requirements>

## Subtarefas

- [x] 5.1 Atualizar ProcessFoundView com identidade por rota e geração de sessão e integrar useProcessDetails.
- [x] 5.2 Ampliar ProcessDetailsContent com CNJ, pares de rótulo/valor e aviso discreto da base importada.
- [x] 5.3 Atualizar ProcessDetailsState com mensagens distintas, ação de nova tentativa e retorno à consulta.
- [x] 5.4 Preservar layout e estilos existentes, adaptar textos longos e remover apenas o foco programático específico dos detalhes e sua expectativa antiga nos testes.
- [x] 5.5 Implementar TU-11 e variantes visuais de TU-13/TU-14, incluindo troca rápida de processo, carga pendente e sessão invalidada.
- [x] 5.6 Executar as validações da tarefa e registrar evidências; atualizar os checklists e criar o commit local do incremento.

## Detalhes de implementação

Seguir as seções abaixo do [techspec.md](./techspec.md), fonte de verdade dos contratos e casos de teste:

- Visão dos componentes: view e componentes de detalhes.
- Principais interfaces: leitura no frontend, ciclo de vida e apresentação.
- Riscos conhecidos: expectativas antigas de GET e foco.

Os testes desta tarefa cobrem a página de dados gerais. A colaboração completa com histórico, recuperação e retorno em TI-08 é responsabilidade da tarefa 6. Teclado e responsividade dos controles integrados serão verificados pelas tarefas 6 e 7. Reutilizar ProtectedRoute e o estado de consulta existentes.

## Critérios de aceitação relacionados

Referências ao [PRD](./prd.md). A validação dos critérios é responsabilidade do QA; esta tarefa produz a implementação e/ou as evidências correspondentes.

- CA-01
- CA-02
- CA-03
- CA-07
- CA-12
- CA-13
- CA-14
- CA-15
- CA-16
- CA-17
- CA-19
- CA-20
- CA-22

## Testes da tarefa

IDs, nomes e resultados esperados preservados da TechSpec. Casos compartilhados têm seu recorte explicitado em “Detalhes de implementação”.

### Testes de unidade

- [x] TU-11 — Carga inicial não simula ausência. Loading correto, mensagens específicas e retorno disponível.
- [x] TU-13 — Resposta obsoleta não repõe dados. Troca de ID, desmontagem ou geração descarta respostas anteriores e snapshot local.
- [x] TU-14 — Sessão inválida tem prioridade sobre recuperação local. Invalidação existente acionada; histórico não reaparece após resposta tardia.

### Validações de conclusão

Executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` no aplicativo afetado. Os scripts atuais existem em ambos os aplicativos; prevalecem sobre as observações antigas de ausência de lint/testes. Não reduzir os limites de cobertura nem excluir código novo para atingir o percentual.

**Evidências:** os cinco comandos passaram em `frontend/`; `npm test` executou 116 testes em 17 arquivos. A cobertura global foi 93,07% em statements, 90,34% em branches, 95,34% em funções e 95,53% em linhas. O build de produção terminou com sucesso.

## Arquivos relevantes

- [PRD](./prd.md) e [TechSpec](./techspec.md).
- `frontend/src/views/ProcessFoundView.tsx`.
- `frontend/src/components/ProcessDetailsContent.tsx`.
- `frontend/src/components/ProcessDetailsState.tsx`.
- `frontend/src/views/process-views.test.tsx`.
- `frontend/src/components/ProtectedRoute.tsx`.
- `frontend/src/components/DispatchLayout.tsx`.
- `frontend/src/services/process-input.ts`.
- Testes unitários e de integração adjacentes aos módulos alterados; arquivos novos seguem os nomes da TechSpec.

Os caminhos novos indicam arquivos a criar na implementação; dependências existentes são referências, sem obrigação de alterá-las.
