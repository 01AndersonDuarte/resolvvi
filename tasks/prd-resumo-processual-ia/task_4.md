# Tarefa 4.0: Interface de geração, referências e avaliação

## Visão geral

Integrar a seção de IA à página existente com estados claros, geração explícita, evidências para consulta manual e voto confirmado. Preservar os controles e a paginação do histórico.

**Dependências:** [3.0](./task_3.md), com contratos e estados da API consolidados.

<skills>
### Conformidade com skills

- [`executar-task`](../../.agents/skills/executar-task/SKILL.md): implementação do incremento e atualização dos checklists.
- [`react`](../../.agents/skills/react/SKILL.md): carregar antes de implementar, corrigir ou revisar frontend e seus testes; seguir suas referências.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura realizada no planejamento: `AGENTS.md` e todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Revalidar instruções aplicáveis ao executar. A referência sem ponto `agents/rules/tests.md` não existe; usar `.agents/rules/tests.md`.

Preservar aplicativos e dependências separados, módulos ES, funções nomeadas, `unknown` nas fronteiras, organização por recurso/camada e imports sem ciclos. Respeitar 300 linhas por arquivo TS/TSX, 30 por função e 100 por classe; não desabilitar limites nem comprimir código. Banco apenas em repositories, configuração validada em `config/`, logs pelo adaptador existente e segredos fora do repositório. Migrations geradas pelo Prisma, sem edição manual.

Testes Vitest adjacentes, FIRST/AAA, assertions de comportamento e efeitos persistidos; Playwright em `e2e/`. Usar banco isolado e controlar relógio/transporte, sem sleeps arbitrários ou chamadas cobradas nas suítes comuns. Executar lint, typecheck, testes, cobertura e build nos aplicativos afetados, com mínimo de 80% em linhas, funções, branches e statements. Os scripts atuais prevalecem sobre as observações antigas do AGENTS sobre ausência de testes/lint.

Após cada incremento coeso validado, revisar o diff, selecionar arquivos explicitamente e criar commit local conforme Conventional Commits em inglês, incluindo checklists; preservar alterações alheias e staging prévio. Push exige autorização separada. Os cortes aprovados alteram o escopo funcional/técnico documentado, sem dispensar as regras do projeto.
</rules>

<requirements>

**Requisitos relacionados:** RF1, RF2, RF3, RF5, RF8, RF9, RF12, RF13, RF14, RF15, RF18, RF19, RF20, RF21, RF22, RF23, RF27, RF29.

- Inserir a seção após informações gerais e antes das movimentações, usando os componentes e tokens existentes. Ler no carregamento; gerar/atualizar/repetir somente por ação explícita.
- Encerrar polling e espera no prazo, falha, troca de processo ou sessão; descartar respostas antigas. Falha de POST exige consulta de estado, sem repetição automática da geração.
- Exibir todos os estados e ações da TechSpec, com cooldown baseado no tempo do servidor. Falhas da IA não bloqueiam informações gerais ou histórico.
- Renderizar apenas texto, de um a três parágrafos, aviso permanente literal do RF27, geração em pt-BR, quantidade de movimentos e referências por frase com data e título.
- Permitir conferência manual pela paginação existente; não implementar endpoint, salto, expansão ou foco automático no evento citado.
- Oferecer voto somente para resumo atual exibido, desabilitar ambos os botões durante envio e confirmar após persistência; preservar voto anterior em erro, reconciliar em nova leitura e não herdar voto entre versões.
- Garantir semântica, teclado, anúncios, foco visível, celular e zoom 200%; usar sessão e cliente HTTP existentes, sem expor votos de outras pessoas.
</requirements>

## Subtarefas

- [x] 4.1 Criar tipos de domínio por arquivo, serviços HTTP e validação de respostas unknown para leitura, geração e feedback.
- [x] 4.2 Implementar hook de resumo com leitura inicial, handlers, watchdog, polling limitado, cancelamento e descarte por identidade de processo/sessão/tentativa.
- [x] 4.3 Implementar seção, corpo, avisos e estados; integrar à view sem mudar a navegação manual do histórico.
- [x] 4.4 Exibir referências agrupadas por frase com data e título e orientação de conferência manual, sem navegação automática.
- [x] 4.5 Implementar hook/componente de avaliação com estado confirmado, mensagens de criação/troca, falha e reconciliação após 409 ou resposta perdida.
- [x] 4.6 Implementar testes de comportamento, acessibilidade, falhas, paginação sem geração e respostas atrasadas; executar lint, tipos, testes, cobertura e build do frontend.

## Detalhes de implementação

Usar [techspec.md](./techspec.md) como fonte de verdade, especialmente:

- Design de implementação → Modelos de dados → AiSummary, AiSummaryState, variantes e feedback.
- Design de implementação → Endpoints da API.
- Pontos de integração (hooks, apresentação e acessibilidade).
- Arquitetura do sistema → Visão dos componentes frontend.
- Abordagem de testes → TU-12 a TU-15.

Aplicar o escopo simplificado aprovado: sem comprovante HMAC, localização automática de referência ou capacidade global entre instâncias. Manter fonte integral, evidências imutáveis, deduplicação persistida, deadline, autenticação, votos e testes.

## Critérios de aceitação relacionados

Critérios do [PRD](./prd.md); a validação de aceitação é responsabilidade do QA:

- CA-01
- CA-02
- CA-04
- CA-06
- CA-09
- CA-10
- CA-11
- CA-13
- CA-14
- CA-15
- CA-16
- CA-17
- CA-19
- CA-20
- CA-22
- CA-23

## Testes da tarefa

TU-12 inclui geração por clique, falha de leitura sem geração, estados de fonte insuficiente/contexto excedido e avisos. TU-13 inclui StrictMode, troca de processo/sessão, timeout HTTP e watchdog. TU-14 inclui recarga, alteração de versão, falha e resposta perdida após gravação. TU-15 verifica referências estáticas acessíveis e preservação da navegação manual; não testar um salto ao evento que foi retirado do escopo.

### Testes de unidade

- [x] TU-12 — Estados visuais e geração dependem de clique
- [x] TU-13 — Hook encerra polling e descarta processo/sessão anteriores
- [x] TU-14 — Feedback confirma somente gravação e preserva voto em erro
- [x] TU-15 — Referências exibem frase, data e título para conferência manual

## Arquivos relevantes

- `frontend/src/views/ProcessFoundView.tsx`
- `frontend/src/services/process-ai-summary-service.ts`
- `frontend/src/services/process-ai-summary-response.ts`
- `frontend/src/services/process-ai-summary-feedback.ts`
- `frontend/src/hooks/useProcessAiSummary.ts`
- `frontend/src/hooks/useSummaryFeedback.ts`
- `frontend/src/components/ProcessAiSummary.tsx`
- `frontend/src/components/SummaryContent.tsx`
- `frontend/src/components/SummaryState.tsx`
- `frontend/src/components/SummaryReferences.tsx`
- `frontend/src/components/SummaryFeedback.tsx`
- `frontend/src/types/ai-summary.ts`
- `frontend/src/types/ai-summary-state.ts`
- `frontend/src/types/summary-attempt.ts`
- `frontend/src/types/summary-reference.ts`
- `frontend/src/types/summary-feedback.ts`
- `frontend/src/types/summary-feedback-input.ts`
- `frontend/src/components/ProcessMovements.tsx` (integração existente a preservar)
- `frontend/src/hooks/useProcessMovements.ts` (integração existente a preservar)
- Testes adjacentes dos módulos novos/alterados e reexports explícitos dos barrels necessários, conforme “Visão dos componentes” da TechSpec.
