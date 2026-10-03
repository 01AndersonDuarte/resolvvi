# Tarefa 1.0: Preparar o backend e a infraestrutura de testes

## Visão geral

Criar a base executável independente em backend/, com configuração validada e ambiente de testes reproduzível. A entrega permite compilar, verificar tipos e testar o código inicial, preparando PostgreSQL real para as próximas tarefas.

**Dependências:** nenhuma tarefa anterior.
**Estado:** concluída; implementação e validações registradas em 3 de outubro de 2026.

<skills>

### Conformidade com skills

- Aplicar [executar-task](../../.agents/skills/executar-task/SKILL.md) ao implementar esta entrega.
- [criar-tasks](../../.agents/skills/criar-tasks/SKILL.md) rege a decomposição documental atual.
- [executar-review](../../.agents/skills/executar-review/SKILL.md) e [executar-qa](../../.agents/skills/executar-qa/SKILL.md) são referências para as etapas posteriores quando solicitadas; sua execução não é implícita nesta tarefa.
- Não há frontend nesta entrega; nenhuma skill React ou de interface se aplica.

</skills>

<rules>

### Conformidade com o AGENTS.md e as rules

Leitura realizada de [AGENTS.md](../../AGENTS.md) e de todas as rules: [code-standards.md](../../.agents/rules/code-standards.md), [javascript-typescript.md](../../.agents/rules/javascript-typescript.md), [node.md](../../.agents/rules/node.md), [folder-structure.md](../../.agents/rules/folder-structure.md), [tests.md](../../.agents/rules/tests.md), [commit_guidelines.md](../../.agents/rules/commit_guidelines.md). O caminho efetivo das regras de testes é `.agents/rules/tests.md`; a referência a `./agents/rules/tests.md` no trecho crítico do AGENTS está desatualizada.

Respeitar arquivos `.ts` de até 100 linhas, funções de até 30 linhas, até três parâmetros, guard clauses, nomes claros e comentários apenas indispensáveis. Manter dependências entre camadas sem ciclos, imports internos específicos e exports por `index.ts`. Usar Vitest, FIRST, asserts comportamentais e cobertura mínima de 80% nas quatro métricas. Se houver commit posterior, seguir Conventional Commits em inglês, somente título e autoria registrada.

Manter dependências e scripts em backend/, npm com lock, variáveis centralizadas e console restrito ao logger. A ausência de frontend/backend no checkout prevalece sobre os comandos antigos descritos no AGENTS; esta entrega prepara somente o backend de CLI.

A adaptação de arquitetura CLI, sem Express/HTTP, está justificada em **Considerações técnicas → Conformidade com o AGENTS.md e as rules** da [TechSpec](./techspec.md). Não criar frontend, consultas externas, IA ou funcionalidades fora do PRD.

</rules>

<requirements>

Requisitos do [PRD](./prd.md): RF9, RF15, RF17. Requisitos não funcionais relacionados: RNF4, RNF6.

- Preparar o runtime, ESM, ferramentas e scripts conforme as versões e decisões da TechSpec, validando os patches durante a instalação e versionando o package-lock.json.
- Centralizar configuração com dotenv/Joi e logging sanitizado; disponibilizar exemplos sem credenciais reais e ignorar artefatos privados.
- Configurar Vitest, cobertura de todo src autoral e quatro thresholds de 80%; preparar Playwright como runner de CLI, com E2E na raiz.
- Preparar bases independentes por worker e fixtures que só possam criar/destruir bases explicitamente identificadas como teste.

</requirements>

## Subtarefas

- [x] 1.1 Preparar package.json, lock, runtime, TypeScript/NodeNext, ESLint e scripts de lint, typecheck, test, test:coverage e build.
- [x] 1.2 Implementar configuração centralizada, contratos mínimos de erros e logger com testes das falhas e da sanitização.
- [x] 1.3 Preparar compose PostgreSQL, ambientes de desenvolvimento/teste e documentação inicial dos pré-requisitos.
- [x] 1.4 Configurar Vitest/V8, inclusão de código autoral não importado pela suíte e thresholds em linhas, instruções, funções e ramificações.
- [x] 1.5 Preparar configuração Playwright no backend e infraestrutura de fixtures para processos, diretórios e bases isolados.
- [x] 1.6 Validar os scripts existentes sobre código real desta entrega; reservar os comandos do importador para a tarefa 7 e a suíte E2E para a tarefa 8.

## Detalhes de implementação

A [TechSpec](./techspec.md) é a fonte de verdade dos contratos e decisões técnicas. Consultar **Sequenciamento do desenvolvimento → Dependências técnicas**, **Modelos de dados → Parâmetros fixos na origem e configuração**, **Monitoramento e observabilidade** e **Abordagem de testes**. O cliente Prisma e a execução de migrations entram na tarefa 3; a configuração de build deve ser completada ali para gerar o cliente antes de typecheck/build.

## Critérios de aceitação relacionados

IDs relacionados do [PRD](./prd.md#critérios-de-aceitação); sua validação final é responsabilidade do QA. Critérios compartilhados são comprovados pelo conjunto de tarefas, conforme a [rastreabilidade](./tasks.md#rastreabilidade-dos-critérios-de-aceitação).

- CA-15
- CA-19
- CA-20
- CA-21

## Testes da tarefa

IDs e nomes abaixo reproduzem o inventário da [TechSpec](./techspec.md#abordagem-de-testes), que define resultados esperados e variantes. Cada família deve ser desdobrada em testes independentes. Uma etapa parcial só comprova o recorte indicado; a família completa permanece pendente até a tarefa de conclusão registrada em [tasks.md](./tasks.md#rastreabilidade-dos-testes).

### Testes de unidade (se aplicável)

- [x] TU-13 — Sanitização de logs e erros
  - Parcial: sanitização do logger e erros de configuração; relatórios e bordas completas nas tarefas 6 e 7.
- [x] TU-14 — Configuração, argumentos e shutdown
  - Parcial: configuração inválida e interrupção da inicialização; argumentos e shutdown completos na tarefa 7.

### Testes de integração (se aplicável)

- [x] TI-19 — Configuração e isolamento das dependências
  - Parcial: isolamento das bases, configuração e ausência de secrets nos artefatos; migrations na tarefa 3 e importação sem HTTP externo na tarefa 7.

### Testes E2E (se aplicável)

Não há novos casos desta camada nesta tarefa; os E2E são implementados na tarefa 8.

### Validações para concluir a tarefa

- Executar em `backend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage` e `npm run build`, após disponibilizar os scripts na tarefa 1.
- Assegurar cobertura mínima de 80% em linhas, instruções, funções e ramificações de todo código autoral existente; o percentual não substitui os cenários críticos.
- Registrar comandos e resultados; não marcar variantes dependentes de tarefas futuras como aprovadas. Os E2E completos serão executados na tarefa 8.

Resultados: lint, typecheck, 16 testes, cobertura de 100% nas quatro métricas e build aprovados; Compose validado sem iniciar serviços. As etapas futuras das famílias TU-13, TU-14 e TI-19 permanecem atribuídas às tarefas 3, 6 e 7 na matriz de rastreabilidade.

## Arquivos relevantes

Caminhos de implementação previstos, que podem ser divididos em módulos coesos para cumprir os limites das rules. Arquivos de aplicação ainda serão criados; o corpus é somente leitura.

- `backend/package.json`
- `backend/package-lock.json`
- `backend/.nvmrc`
- `backend/tsconfig.json`
- `backend/tsconfig.build.json`
- `backend/eslint.config.js`
- `backend/vitest.config.ts`
- `backend/playwright.config.ts`
- `backend/compose.yaml`
- `backend/.env.development.example`
- `backend/.env.test.example`
- `backend/src/config/envs.ts`
- `backend/src/config/logger.ts`
- `backend/src/errors/`
- `backend/src/protocols.ts`
- `backend/src/config/*.test.ts`
- `backend/README.md`
- `.gitignore`
