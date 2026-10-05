# Tarefa 5.0: E2E, regressão e avaliação semântica

## Visão geral

Concluir a validação da funcionalidade integrada, com API e banco reais nos E2E e provedor falso controlado. Executar separadamente a avaliação da configuração real e registrar evidências para todos os critérios do PRD.

**Dependências:** [1.0](./task_1.md), [2.0](./task_2.md), [3.0](./task_3.md) e [4.0](./task_4.md). Para o gate real: configuração candidata, credenciais/acesso à conta, dados sintéticos ou autorizados, execução externa explícita e revisor humano disponíveis. A aprovação deste planejamento não executa chamadas externas.

<skills>
### Conformidade com skills

- [`executar-task`](../../.agents/skills/executar-task/SKILL.md): implementação do incremento e atualização dos checklists.
- [`react`](../../.agents/skills/react/SKILL.md): carregar antes de implementar, corrigir ou revisar frontend e seus testes; seguir suas referências.
- [`executar-qa`](../../.agents/skills/executar-qa/SKILL.md): validação integrada e relatório final; testes novos do incremento são implementados com `executar-task`, antes do fechamento de QA.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura realizada no planejamento: `AGENTS.md` e todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Revalidar instruções aplicáveis ao executar. A referência sem ponto `agents/rules/tests.md` não existe; usar `.agents/rules/tests.md`.

Preservar aplicativos e dependências separados, módulos ES, funções nomeadas, `unknown` nas fronteiras, organização por recurso/camada e imports sem ciclos. Respeitar 300 linhas por arquivo TS/TSX, 30 por função e 100 por classe; não desabilitar limites nem comprimir código. Banco apenas em repositories, configuração validada em `config/`, logs pelo adaptador existente e segredos fora do repositório. Migrations geradas pelo Prisma, sem edição manual.

Testes Vitest adjacentes, FIRST/AAA, assertions de comportamento e efeitos persistidos; Playwright em `e2e/`. Usar banco isolado e controlar relógio/transporte, sem sleeps arbitrários ou chamadas cobradas nas suítes comuns. Executar lint, typecheck, testes, cobertura e build nos aplicativos afetados, com mínimo de 80% em linhas, funções, branches e statements. Os scripts atuais prevalecem sobre as observações antigas do AGENTS sobre ausência de testes/lint.

Após cada incremento coeso validado, revisar o diff, selecionar arquivos explicitamente e criar commit local conforme Conventional Commits em inglês, incluindo checklists; preservar alterações alheias e staging prévio. Push exige autorização separada. Os cortes aprovados alteram o escopo funcional/técnico documentado, sem dispensar as regras do projeto.
</rules>

<requirements>

**Requisitos relacionados:** RF1, RF2, RF3, RF4, RF5, RF6, RF7, RF8, RF9, RF10, RF11, RF12, RF13, RF14, RF15, RF16, RF17, RF18, RF19, RF20, RF21, RF22, RF23, RF24, RF25, RF26, RF27, RF28, RF29.

- Usar Playwright em e2e/, backend e PostgreSQL isolados reais, com fake somente na fronteira LLM; verificar chamadas e efeitos persistidos. Não substituir a API inteira por interceptações.
- Cobrir fluxo completo, atualização concorrente, falhas/recuperação, expiração de sessão, isolamento, referências manuais, teclado, celular/desktop e zoom 200%. Preservar cenários anteriores de autenticação, consulta e detalhes.
- Executar lint, typecheck, testes, cobertura e build nos dois aplicativos; E2E pelo frontend. Manter pelo menos 80% em linhas, funções, branches e statements em cada aplicativo e proteger todas as regras críticas.
- Produzir 20 resumos com a configuração candidata ou todos os casos elegíveis se houver menos, incluindo ambiguidades e entrada maliciosa. A execução real é explícita e separada da CI.
- Registrar revisão humana de factualidade por frase/evidência, cobertura, incerteza, ausência de conselho e linguagem brasileira simples. Todos os itens devem passar; falha exige ajuste versionado e nova avaliação.
- Confirmar configuração real de tratamento de dados e operação com uma instância executora. Não declarar retenção zero sem evidência; preservar outputs/rubrica em área protegida e versionar somente exemplos sintéticos/desidentificados.
- Não declarar a funcionalidade entregue enquanto faltarem gates, revisão humana ou evidências; ausência de credenciais não pode ser substituída por aprovação com mocks.
</requirements>

## Subtarefas

- [x] 5.1 Estender harness E2E com fake, contagem de chamadas e controles isolados de fonte, falhas e sessão, sem expor controles em produção.
- [x] 5.2 Implementar os cinco E2E da TechSpec, incluindo conferência manual de referência fora da primeira página e geração única após recarga/paginação.
- [x] 5.3 Executar a regressão completa e verificar cobertura, concorrência, persistência, acessibilidade e ausência de vazamento em logs; corrigir falhas encontradas.
- [ ] 5.4 Executar a amostra real separada e obter a revisão humana da rubrica; preservar a configuração e evidências, respeitando o tratamento de dados definido. A amostra de 20 casos sintéticos foi gerada com `gpt-4.1-mini-2025-04-14`; formato e idioma passaram. A revisão humana está pendente em [formulário protegido](./.semantic-review/human-review.md).
- [ ] 5.5 Incorporar resultados semânticos aprovados às fixtures sintéticas/desidentificadas de TU-18; repetir os gates afetados após ajustes.
- [x] 5.6 Registrar relatório de QA com evidências para CA-01 a CA-23, resultados dos comandos, limitações operacionais e decisão sobre o gate semântico; atualizar checklists somente após comprovação. QA registrado como BLOQUEADO enquanto a revisão humana e a confirmação operacional de retenção estiverem pendentes.

## Detalhes de implementação

Usar [techspec.md](./techspec.md) como fonte de verdade, especialmente:

- Abordagem de testes → Testes E2E, gate semântico e rastreabilidade RF → casos.
- Sequenciamento do desenvolvimento → Dependências técnicas.
- Pontos de integração (configuração do provedor e tratamento de dados).
- Monitoramento e observabilidade.
- Considerações técnicas → Riscos conhecidos.

Aplicar o escopo simplificado aprovado: sem comprovante HMAC, localização automática de referência ou capacidade global entre instâncias. Manter fonte integral, evidências imutáveis, deduplicação persistida, deadline, autenticação, votos e testes.

## Critérios de aceitação relacionados

Critérios do [PRD](./prd.md); a validação de aceitação é responsabilidade do QA:

- CA-01
- CA-02
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
- CA-23

## Testes da tarefa

Executar também TU-01 a TU-18 e TI-01 a TI-14 como regressão dos incrementos anteriores. O gate semântico é adicional, sem ID artificial de caso automatizado e sem substituir TU-18. Não marcar esta tarefa concluída se a amostra real/revisão humana estiver pendente. O relatório deve distinguir testes automatizados, revisão semântica e configuração operacional verificada.

### Testes de unidade

- [x] TU-18 — Regras de fixtures semânticas têm fatos e proibições explícitas

### Testes E2E

- [x] E2E-01 — Consultar, gerar, conferir referência, votar, trocar e recarregar
- [x] E2E-02 — Atualizar após alteração da fonte com outra aba concorrente
- [x] E2E-03 — Falhas de geração/leitura/voto recuperam sem afetar histórico
- [x] E2E-04 — Trocar processo e expirar sessão durante geração
- [x] E2E-05 — Operar por teclado em celular, desktop e zoom 200%

TU-18 preserva regressões sintéticas e verificações determinísticas. Esse resultado não substitui a amostra real nem a revisão humana do gate semântico (5.4–5.5).

As subtarefas 5.1–5.3 e seus testes automatizados foram executados. A amostra real de 5.4 foi gerada e preservada em diretório local protegido; falta a revisão humana. A 5.5 depende dessa aprovação. O relatório 5.6 está registrado, com status BLOQUEADO e evidências automatizadas para os critérios.

## Arquivos relevantes

- `e2e/process-ai-summary.spec.ts`
- `e2e/process-details.spec.ts` (regressão)
- `backend/src/e2e-harness.ts`
- `backend/src/services/fixtures/process-ai-summary/`
- `backend/vitest.config.ts`
- `frontend/vitest.config.ts`
- `frontend/playwright.config.ts`
- `tasks/prd-resumo-processual-ia/qa.md` (relatório a criar na execução conforme executar-qa)
- `tasks/prd-resumo-processual-ia/evidences/` (evidências de navegador a produzir no QA)
- Testes adjacentes dos módulos novos/alterados e reexports explícitos dos barrels necessários, conforme “Visão dos componentes” da TechSpec.
