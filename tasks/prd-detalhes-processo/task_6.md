# Tarefa 6.0: Interface de movimentações e integração da página

## Visão geral

Compor o histórico com leitura integral dos textos, expansão independente, navegação paginada e recuperação localizada, concluindo a integração da página de detalhes.

**Dependências:** [4.0](./task_4.md), [5.0](./task_5.md)

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
Requisitos relacionados: RF1, RF2, RF3, RF6, RF7, RF8, RF9, RF10, RF11, RF12, RF13, RF14, RF16, RF17, RF18, RF19, RF21.

- Mostrar total, ordem, data, título e conteúdo; preservar texto literal, acentos e quebras de linha, sem buscar URLs mencionadas.
- Aplicar prévia de 500 grafemas, expansão local e rótulos de ausência; reiniciar expansões somente após mudança confirmada de página.
- Manter dados gerais e a última página durante carga/falha; bloquear controles concorrentes e tentar novamente o destino solicitado.
- Tratar histórico vazio, campos defensivos, 404 posterior do histórico e sessão inválida conforme a TechSpec.
- Oferecer navegação por teclado e layout adaptável sem cortar textos ou controles.
</requirements>

## Subtarefas

- [x] 6.1 Implementar movement-content e MovementItem com prévia Unicode, expansão independente e renderização textual segura.
- [x] 6.2 Criar MovementPagination com intervalo derivado da página confirmada, limites e controles apenas quando necessários.
- [x] 6.3 Criar ProcessMovements com carga, vazio, erros locais, retry e integração ao hook; montar o histórico após sucesso dos detalhes.
- [x] 6.4 Ligar onProcessMissing à revalidação dos detalhes e garantir remoção dos dados antigos durante revalidação e invalidação de sessão.
- [x] 6.5 Implementar testes unitários de conteúdo, estados defensivos, recuperação e teclado, incluindo limites de paginação e reset de expansão.
- [x] 6.6 Implementar TI-08 com Router, contexto e clientes reais, transporte controlado, troca de processo, acesso direto, recuperação e preservação do último CNJ.
- [x] 6.7 Executar as validações da tarefa e registrar evidências; atualizar os checklists e criar o commit local do incremento.

## Detalhes de implementação

Seguir as seções abaixo do [techspec.md](./techspec.md), fonte de verdade dos contratos e casos de teste:

- Principais interfaces: paginação e falhas; expansão e apresentação.
- Modelos de dados: variantes e degradações.
- Abordagem de testes: TU-08, TU-09, TU-12, TU-15 a TU-17 e TI-08.

TU-12 conclui a preservação visual de detalhes e página durante falha/timeout. TU-15 usa uma fixture globalmente ordenada antes de dividi-la em páginas, com eventos sem data no final; isso não comprova persistência de datas inválidas. TU-17 inclui expandir, recolher, paginar, tentar novamente e voltar por teclado. TI-08 deve exercitar também processo desaparecido durante leitura do histórico. Usar títulos longos e limites 500/501, emojis, acentos combinados e o conteúdo máximo real; validar históricos 0/1/20/21/120 e navegação controlada de volume sem limite artificial.

## Critérios de aceitação relacionados

Referências ao [PRD](./prd.md). A validação dos critérios é responsabilidade do QA; esta tarefa produz a implementação e/ou as evidências correspondentes.

- CA-03
- CA-04
- CA-05
- CA-06
- CA-07
- CA-08
- CA-09
- CA-10
- CA-11
- CA-12
- CA-13
- CA-14
- CA-15
- CA-16
- CA-17
- CA-18
- CA-19
- CA-20
- CA-21
- CA-22

## Testes da tarefa

IDs, nomes e resultados esperados preservados da TechSpec. Casos compartilhados têm seu recorte explicitado em “Detalhes de implementação”.

### Testes de unidade

- [x] TU-08 — Prévia respeita 500 grafemas. Limites 500/501, emoji e acentos combinados não cortados; conteúdo de 15.266 caracteres integralmente recuperável.
- [x] TU-09 — Expansão afeta apenas o evento acionado. Expandir/recolher mantém outros eventos e reinicia após troca confirmada de página.
- [x] TU-12 — Falha de histórico preserva detalhes. Nova tentativa localizada; página antiga permanece inclusive após timeout.
- [x] TU-15 — Eventos vazios e incompletos têm apresentação explícita. Rótulos defensivos cobertos, e histórico vazio não mostra paginação.
- [x] TU-16 — Conteúdo é renderizado literalmente. Marcação/script/URL são texto, sem execução ou requisição adicional.
- [x] TU-17 — Controles nativos permitem operação por teclado. Expansão, recolhimento, paginação, retry e retorno operados por teclado; sem foco automático ou leitores de tela.

### Testes de integração

- [x] TI-08 — View e cliente HTTP preservam recuperação e retorno. React Router/contexto/clientes reais com transporte controlado; rascunho da consulta preservado e nenhum dado de outra página/processo.

### Validações de conclusão

Executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` no aplicativo afetado. Os scripts atuais existem em ambos os aplicativos; prevalecem sobre as observações antigas de ausência de lint/testes. Não reduzir os limites de cobertura nem excluir código novo para atingir o percentual.

**Evidências:** os cinco comandos passaram em `frontend/`; `npm test` executou 131 testes em 22 arquivos. A cobertura global foi 93,53% em statements, 91,26% em branches, 95,65% em funções e 95,88% em linhas. O build de produção terminou com sucesso. TI-08 usou o Router, contexto, serviços HTTP e leitor de respostas reais, com `fetch` controlado; cobriu acesso direto, falha e retry, retorno com o CNJ salvo e troca de processo sem reapresentar movimentações antigas.

## Arquivos relevantes

- [PRD](./prd.md) e [TechSpec](./techspec.md).
- `frontend/src/components/ProcessMovements.tsx`.
- `frontend/src/components/MovementItem.tsx`.
- `frontend/src/components/MovementPagination.tsx`.
- `frontend/src/services/movement-content.ts`.
- `frontend/src/views/ProcessFoundView.tsx`.
- `frontend/src/views/process-views.test.tsx`.
- `frontend/src/hooks/useProcessMovements.ts`.
- Testes unitários e de integração adjacentes aos módulos alterados; arquivos novos seguem os nomes da TechSpec.

Os caminhos novos indicam arquivos a criar na implementação; dependências existentes são referências, sem obrigação de alterá-las.
