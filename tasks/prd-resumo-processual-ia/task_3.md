# Tarefa 3.0: Provedor, execução, API, avaliações e métricas

## Visão geral

Entregar o fluxo completo do backend, acessível por três rotas autenticadas: consultar, solicitar geração e salvar avaliação. Compor as garantias das tarefas anteriores com chamada única, deadline, recuperação e observabilidade.

**Dependências:** [1.0](./task_1.md) e [2.0](./task_2.md). A implementação e os testes comuns usam transporte falso; acesso real à conta é dependência da avaliação na tarefa 5.

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

**Requisitos relacionados:** RF1, RF2, RF3, RF4, RF5, RF6, RF7, RF8, RF9, RF10, RF11, RF12, RF13, RF14, RF15, RF16, RF17, RF18, RF19, RF20, RF21, RF22, RF23, RF24, RF25, RF26, RF27, RF28, RF29.

- Implementar adaptador substituível com fetch, configuração validada e payload mínimo. Sem ferramentas, retries, fallback automático ou chamada real na suíte comum.
- Controlar o prazo absoluto de 30 segundos desde a entrada no serviço, incluindo preparação, provedor, validação e persistência. Abortar transporte, impedir sucesso tardio e não reenviar tentativas após reinício.
- Manter deduplicação e cooldown no banco, inclusive com dois clientes/services concorrentes. Limitar a quatro execuções no executor local e documentar implantação com uma única instância executora; coordenação de capacidade global precede qualquer expansão futura.
- Permitir leitura e avaliação de resumo compatível mesmo com geração desabilitada/indisponível; GET, paginação e voto nunca geram. Falha de leitura não equivale a ausência.
- Proteger as três rotas com sessão, origem, entrada estrita e vínculo. Revalidar sessão antes do despacho e da resposta; voto usa usuário da sessão e versão atual, sem HMAC de apresentação.
- Serializar referências por frase, data e título da fonte correta, inclusive fora da primeira página. Não criar endpoint de localização nem contrato de salto ao evento.
- Persistir voto antes de confirmar; rejeitar versão obsoleta, impedir duplicação e preservar o último commit. Instrumentar eventos sanitizados e métricas com denominadores corretos e taxa null sem votos.
- Integrar cancelamento ao shutdown existente sem ampliar seu prazo; fechar Prisma por último. O health check não depende da LLM.
</requirements>

## Subtarefas

- [x] 3.1 Implementar configuração, adaptador real com transporte injetável e fake determinístico, classificando recusa, truncamento, limite, indisponibilidade e Retry-After.
- [ ] 3.2 Compor executor, orçamento de cada etapa, capacidade local, marcação única de despacho, expiração e encerramento; tratar falhas antes/depois de callStartedAt e commit incerto.
- [ ] 3.3 Implementar service de leitura, solicitação e feedback sobre os repositories; aplicar precedência de estados, reuso, invalidação e recuperação explícita.
- [ ] 3.4 Ampliar autenticação interna por ID de sessão e implementar schemas, erros, router e controller das três rotas; não aceitar histórico, modelo, prompt ou identidade do usuário vindos do cliente.
- [ ] 3.5 Serializar resumo, evidências por frase e voto exclusivo do solicitante, com mensagens e códigos da TechSpec.
- [ ] 3.6 Instrumentar eventos e agregações de avaliação/reuso, excluindo polling do denominador; preservar sanitização e consumo ausente como null.
- [ ] 3.7 Compor dependências em app/server, atualizar exemplos de ambiente sem segredos e documentar operação em instância única.
- [ ] 3.8 Completar os casos unitários e de integração mapeados, incluindo contagem de chamadas e efeitos persistidos; executar os gates do backend.

## Detalhes de implementação

Usar [techspec.md](./techspec.md) como fonte de verdade, especialmente:

- Arquitetura do sistema → Coordenação e consistência e orçamento de tempo.
- Design de implementação → Principais interfaces, parâmetros, estados e Endpoints da API.
- Pontos de integração.
- Monitoramento e observabilidade.
- Considerações técnicas → Riscos conhecidos e conformidade.

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
- CA-23

## Testes da tarefa

Completar os cenários de repository iniciados na tarefa 2. TI-02 deve provar 202 até disponível, histórico completo e uma chamada; TI-03 usa dois services/clientes mesmo com implantação em instância única. TI-06 injeta provedor/transportes falsos; TI-11 verifica limite local e cooldown persistido, sem alegar capacidade global. TI-08 cobre sessões distintas, corpo com outro usuário, versão ausente/obsoleta, processo errado e alteração da fonte durante voto. TU-17 verifica elegibilidade sem comprovante; TI-10 verifica evidência integral e invalidação, sem localização automática.

### Testes de unidade

- [x] TU-09 — Relógio cancela provedor e proíbe publicação tardia
- [ ] TU-10 — Retry-After e cooldown são normalizados
- [ ] TU-11 — Troca operacional preserva validade e troca de regras invalida
- [ ] TU-16 — Evento operacional usa apenas campos permitidos
- [ ] TU-17 — Elegibilidade do voto exige sessão, vínculo e versão atual

### Testes de integração

- [ ] TI-01 — Rotas aplicam sessão, origem, validação e vínculo de processo
- [ ] TI-02 — Geração completa usa histórico integral e persiste corpo/evidências
- [ ] TI-03 — Concorrência em dois services/clientes compartilha tentativa
- [ ] TI-04 — Mudança de cada campo da fonte invalida leitura e publicação
- [ ] TI-05 — Reinício preserva resumo e expira tentativa sem reenvio
- [ ] TI-06 — Provedor falso cobre falhas, recusa, limite e atraso
- [ ] TI-07 — Falha/commit incerto da persistência não publica sucesso aparente
- [ ] TI-08 — Voto repetido, trocado e concorrente mantém uma linha
- [ ] TI-09 — Nova versão preserva voto antigo e snapshot após remoção
- [ ] TI-10 — Referências independem da página e preservam a fonte correta
- [ ] TI-11 — Capacidade local limita execuções e cooldown sobrevive a reinícios
- [ ] TI-12 — Logs e agregações mantêm denominadores corretos
- [ ] TI-13 — Fonte revertida e regras alteradas geram nova identidade
- [ ] TI-14 — Locks incluem escrita direta e encerramento interrompe operações

## Arquivos relevantes

- `backend/src/services/process-ai-summary-service.ts`
- `backend/src/services/summary-generation-service.ts`
- `backend/src/services/openai-summary-service.ts`
- `backend/src/config/summary-environment-schema.ts`
- `backend/src/config/envs.ts`
- `backend/src/types/config.ts`
- `backend/src/routers/process-ai-summary-router.ts`
- `backend/src/controllers/process-ai-summary-controller.ts`
- `backend/src/schemas/process-ai-summary-schema.ts`
- `backend/src/errors/process-ai-summary-errors.ts`
- `backend/src/types/errors.ts`
- `backend/src/services/auth-service.ts`
- `backend/src/repositories/auth-repository.ts`
- `backend/src/types/auth.ts`
- `backend/src/repositories/process-ai-summary-repository.ts`
- `backend/src/repositories/summary-attempt-repository.ts`
- `backend/src/repositories/summary-feedback-repository.ts`
- `backend/src/config/logger.ts`
- `backend/src/config/sanitize-log-context.ts`
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/shutdown.ts`
- `backend/src/types/http.ts`
- `backend/.env.development.example`
- `backend/.env.test.example`
- Testes adjacentes dos módulos novos/alterados e reexports explícitos dos barrels necessários, conforme “Visão dos componentes” da TechSpec.
