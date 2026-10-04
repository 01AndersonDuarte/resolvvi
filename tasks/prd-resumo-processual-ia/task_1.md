# Tarefa 1.0: Fonte integral, contratos, prompt e validação

## Visão geral

Entregar a preparação determinística da fonte e a validação de saída que sustentam a geração. O incremento deve ser exercitável com fixtures sintéticas, sem banco obrigatório nos testes unitários nem chamadas externas.

**Dependências:** Nenhuma tarefa desta funcionalidade. Reutilizar contratos de processos e movimentações já existentes.

<skills>
### Conformidade com skills

- [`executar-task`](../../.agents/skills/executar-task/SKILL.md): implementação do incremento e atualização dos checklists.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura realizada no planejamento: `AGENTS.md` e todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Revalidar instruções aplicáveis ao executar. A referência sem ponto `agents/rules/tests.md` não existe; usar `.agents/rules/tests.md`.

Preservar aplicativos e dependências separados, módulos ES, funções nomeadas, `unknown` nas fronteiras, organização por recurso/camada e imports sem ciclos. Respeitar 300 linhas por arquivo TS/TSX, 30 por função e 100 por classe; não desabilitar limites nem comprimir código. Banco apenas em repositories, configuração validada em `config/`, logs pelo adaptador existente e segredos fora do repositório. Migrations geradas pelo Prisma, sem edição manual.

Testes Vitest adjacentes, FIRST/AAA, assertions de comportamento e efeitos persistidos; Playwright em `e2e/`. Usar banco isolado e controlar relógio/transporte, sem sleeps arbitrários ou chamadas cobradas nas suítes comuns. Executar lint, typecheck, testes, cobertura e build nos aplicativos afetados, com mínimo de 80% em linhas, funções, branches e statements. Os scripts atuais prevalecem sobre as observações antigas do AGENTS sobre ausência de testes/lint.

Após cada incremento coeso validado, revisar o diff, selecionar arquivos explicitamente e criar commit local conforme Conventional Commits em inglês, incluindo checklists; preservar alterações alheias e staging prévio. Push exige autorização separada. Os cortes aprovados alteram o escopo funcional/técnico documentado, sem dispensar as regras do projeto.
</rules>

<requirements>

**Requisitos relacionados:** RF4, RF5, RF6, RF7, RF8, RF9, RF10, RF11, RF12, RF16, RF17, RF24, RF29.

- Considerar todo o histórico, conservar data civil, texto original, vínculo e desempate; produzir identificação estável da fonte sem usar a página aberta.
- Distinguir ausência de movimentos, ausência de texto utilizável e poucos eventos informativos. Calcular contexto com instruções, schema e reservas; excesso bloqueia integralmente a geração.
- Definir contratos independentes do provedor, prompt e regras versionadas, saída com evidências por frase e validação estrita anterior à publicação. Não reparar, cortar nem aceitar resposta parcial.
- Manter fixtures com fatos permitidos, conclusões proibidas e evidências esperadas. Validação determinística não substitui a avaliação semântica da tarefa 5.
</requirements>

## Subtarefas

- [x] 1.1 Definir tipos do domínio/provedor e schemas Joi de fonte e saída, com limites e erros tipados.
- [x] 1.2 Implementar representação canônica, ordenação, referências locais, hash, elegibilidade e estimador de contexto; prever processamento em lotes dentro do orçamento.
- [x] 1.3 Implementar prompt versionado e montagem do payload mínimo, separando instruções dos textos não confiáveis.
- [x] 1.4 Implementar validação de conclusão, formato, idioma, referências e violações detectáveis; adicionar franc-min com lock file do backend.
- [x] 1.5 Criar fixtures sintéticas para ambiguidade, sentença sem resultado, contradição, empate de data, pouca informação, fato fora da primeira página e entrada maliciosa.
- [x] 1.6 Implementar os casos unitários mapeados e executar lint, tipos, testes, cobertura e build do backend.

## Detalhes de implementação

Usar [techspec.md](./techspec.md) como fonte de verdade, especialmente:

- Arquitetura do sistema → Coordenação e consistência (fonte canônica).
- Design de implementação → Principais interfaces (prompt e validação).
- Design de implementação → Modelos de dados → SourceMovement, ProviderSummaryOutput, SummaryReference e parâmetros de geração.
- Abordagem de testes → Testes de unidade e fixtures.

Aplicar o escopo simplificado aprovado: sem comprovante HMAC, localização automática de referência ou capacidade global entre instâncias. Manter fonte integral, evidências imutáveis, deduplicação persistida, deadline, autenticação, votos e testes.

## Critérios de aceitação relacionados

Critérios do [PRD](./prd.md); a validação de aceitação é responsabilidade do QA:

- CA-02
- CA-03
- CA-04
- CA-05
- CA-06
- CA-07
- CA-08
- CA-10
- CA-18
- CA-23

## Testes da tarefa

TU-18 cobre o conjunto preservado e as regras determinísticas nesta tarefa. A tarefa 5 complementa esse conjunto com resultados reais aprovados; não marcar o gate semântico como realizado com mocks.

### Testes de unidade

- [x] TU-01 — Fonte canônica inclui cada campo, todos os eventos e desempate estável
- [x] TU-02 — Elegibilidade distingue vazio, placeholders e título informativo
- [x] TU-03 — Capacidade conta instruções, schema, fonte e reservas
- [x] TU-04 — Validador aceita um e três parágrafos e rejeita quatro/vazio
- [x] TU-05 — Saída malformada, truncada, recusada ou em outro idioma falha
- [x] TU-06 — Cada frase possui referências da fonte correta
- [x] TU-07 — Prompt e payload separam dados maliciosos das instruções
- [x] TU-08 — Política rejeita marcação, conversa e aconselhamento detectado
- [x] TU-18 — Regras de fixtures semânticas têm fatos e proibições explícitas

## Arquivos relevantes

- `backend/src/types/process-ai-summary.ts`
- `backend/src/types/summary-provider.ts`
- `backend/src/schemas/process-ai-summary-schema.ts`
- `backend/src/errors/process-ai-summary-errors.ts`
- `backend/src/types/errors.ts`
- `backend/src/services/summary-source-service.ts`
- `backend/src/services/summary-prompt-service.ts`
- `backend/src/services/summary-validation-service.ts`
- `backend/src/services/fixtures/process-ai-summary/`
- `backend/package.json`
- `backend/package-lock.json`
- Testes adjacentes dos módulos novos/alterados e reexports explícitos dos barrels necessários, conforme “Visão dos componentes” da TechSpec.
