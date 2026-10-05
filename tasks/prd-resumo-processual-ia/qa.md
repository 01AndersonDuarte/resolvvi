# Relatório de QA — Resumo processual por IA

## Resumo

- Data: 05/10/2026.
- Status: APROVADO.
- Critérios de aceitação: 23 verificados e atendidos na amostra e nos cenários executados.
- Defeitos de produto tratados: 2; pendências bloqueadoras: 0.
- Skills aplicadas: executar-task, react e executar-qa. A análise semântica foi realizada pelo agente por determinação expressa do usuário, substituindo o revisor humano previsto inicialmente.
- Reuso desta execução: resultados de unidade, integração, E2E, cobertura, revisão semântica e capturas da task 5. As alterações locais dos fluxos de movimentações já estavam presentes antes daquela execução; nenhuma alteração posterior no código da funcionalidade exige repetir as suítes.

## Critérios de aceitação verificados

Os IDs abaixo correspondem à rastreabilidade da TechSpec. Os testes automatizados usam provedor controlado; a fidelidade semântica foi conferida separadamente em 20 respostas da API real sobre fontes sintéticas.

| ID | Critério | Casos | Status | Evidência |
| --- | --- | --- | --- | --- |
| CA-01 | Geração por clique, sem chamada ao abrir | TU-12, TI-02, E2E-01 | PASSOU | [Antes da geração](evidences/resumo-antes-da-geracao.png); contador igual a zero antes do clique |
| CA-02 | Fidelidade, formato e fatos relevantes | TU-04/06/18, TI-02, E2E-01, amostra real | PASSOU | 20 respostas reais revisadas; [fixtures](../../backend/src/services/fixtures/process-ai-summary/evaluated-responses.json) |
| CA-03 | Incerteza e conclusões insuficientes | TU-02/18, amostra real | PASSOU | S01–S03, S07, S09–S10, S14 e S18–S20 |
| CA-04 | Fonte ausente ou inutilizável | TU-02/12, E2E-03 | PASSOU | Estados sem geração nem avaliação; testes de elegibilidade |
| CA-05 | Fonte integral e referências fora da página | TU-01, TI-02/10, E2E-01 | PASSOU | Histórico com 1.000 eventos; referência conferida via paginação; S03 |
| CA-06 | Limite de contexto sem truncamento | TU-03/12, E2E-03 | PASSOU | Limite exato, excedido e evento extenso; contador do provedor |
| CA-07 | Entrada maliciosa | TU-07/08/18, amostra real | PASSOU | S04 ignorou comando e link; transporte sem ferramentas |
| CA-08 | Saída inválida não publicada | TU-04/05/06/08, TI-06, E2E-03 | PASSOU | Formato, idioma, referências, recusa e truncamento controlados |
| CA-09 | Reutilização persistida | TU-11, TI-03/05, E2E-01 | PASSOU | Recarga, paginação e voto mantêm uma chamada |
| CA-10 | Invalidação após alteração da fonte | TU-01, TI-04/09/13, E2E-02 | PASSOU | Nova fonte exige clique, nova versão não herda voto |
| CA-11 | Concorrência e respostas atrasadas | TU-09/13, TI-03/04/05/11/14, E2E-02/04 | PASSOU | Abas simultâneas compartilham geração; troca descarta resposta |
| CA-12 | Provedor substituível | TU-11, TI-06/13 | PASSOU | Adaptador injetável, provedor alternativo controlado |
| CA-13 | Falhas, recuperação e prazo | TU-09/10/13, TI-05/06/11/14, E2E-03 | PASSOU | [Falha recuperável](evidences/resumo-falha-recuperavel.png); deadline de 30 s e cooldown |
| CA-14 | Falha de persistência sem sucesso aparente | TI-07, E2E-03 | PASSOU | Leitura repetida sem geração; publicação transacional |
| CA-15 | Voto, troca e recarga | TU-14, TI-08, E2E-01 | PASSOU | [Voto persistido](evidences/resumo-disponivel-e-avaliado.png) |
| CA-16 | Votos inválidos e concorrentes | TU-17, TI-01/08 | PASSOU | Unicidade por usuário/resumo e rejeição de versão inválida |
| CA-17 | Recuperação ao avaliar | TU-14, TI-08, E2E-03 | PASSOU | Estado confirmado preservado após falha e recuperação |
| CA-18 | Rastreabilidade histórica | TU-06, TI-02/09/10/13, E2E-02 | PASSOU | Snapshots, referências, configuração e votos persistidos |
| CA-19 | Transparência e conferência manual | TU-12/15, TI-10, E2E-01/05 | PASSOU | [Desktop](evidences/resumo-desktop.png); versão, origem, limites e referências |
| CA-20 | Sessão e isolamento | TU-13/17, TI-01, E2E-04 | PASSOU | Sessão expirada, processo trocado e acesso sem autenticação |
| CA-21 | Métricas e logs | TU-16, TI-11/12 | PASSOU | Contagens, correlação e logs sem texto de movimentos/chaves |
| CA-22 | Teclado e responsividade | TU-15, E2E-05 | PASSOU | [320 px](evidences/resumo-mobile-teclado.png), [desktop](evidences/resumo-desktop.png), [640 px](evidences/resumo-viewport-200-equivalente.png) |
| CA-23 | Regressão e cobertura | Suítes completas, TI-14, E2E-05 | PASSOU | Resultados abaixo, cobertura mínima de 80% em todas as dimensões |

## Testes E2E executados

| ID | Fluxo | Resultado | Observações |
| --- | --- | --- | --- |
| E2E-01 | Consultar, solicitar, conferir, votar e recarregar | PASSOU | Zero chamadas antes do clique; uma após gerar e recarregar |
| E2E-02 | Mudança da fonte e concorrência entre abas | PASSOU | Resumo antigo removido; apenas uma nova geração |
| E2E-03 | Falhas de provedor, leitura e avaliação | PASSOU | Recuperação independente dos dados e movimentações |
| E2E-04 | Troca de processo e sessão expirada | PASSOU | Respostas pendentes não vazam entre processos |
| E2E-05 | Teclado, celular, desktop e ampliação | PASSOU | 320/1280/640 px, sem rolagem horizontal; 640 px representa reflow equivalente a 200% de 1280 px, não zoom nativo do navegador |

A regressão Playwright completa passou: 15/15 testes, incluindo autenticação, consulta e detalhes. Última execução: 47,9 s. Backend Express e PostgreSQL reais, fake apenas no provedor LLM. Screenshots produzidos nesta etapa de QA contêm um resumo sintético controlado e não demonstram qualidade do modelo real.

## Testes automatizados e cobertura

| Aplicativo | Testes | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- | --- |
| Backend | 272 aprovados | 89,77% | 82,99% | 92,12% | 93,00% |
| Frontend | 153 aprovados | 92,12% | 88,67% | 95,06% | 95,03% |

- Backend e frontend: lint, typecheck, testes e build aprovados; meta de cobertura de 80% nas quatro dimensões atendida.
- TU-01–TU-18 e TI-01–TI-14 exercitados nas suítes. A cobertura final do backend executa também os 20 outputs reais preservados contra o validador e suas fontes, sem chamar a API.
- A amostra real foi avaliada fora das suítes e não é executada em CI.

## Avaliação semântica e configuração

Configuração aprovada na amostra: `gpt-4.1-2025-04-14`, regras `summary-rules-v14`, temperatura 0, saída estruturada e limite de 4096 tokens. O modelo mini apresentou falhas recorrentes de fidelidade; GPT-4.1 passou na amostra final após os ajustes documentados no prompt. Modelo e regras foram atualizados no padrão da aplicação, nos exemplos e no `.env.development` real, preservando a chave existente.

As 20 respostas foram revisadas frase a frase quanto a suporte na fonte, cobertura, limites, ausência de conselho e linguagem. Casos incluem contradições, dados escassos, entrada maliciosa, defesa, perícia, acordo, recurso, cobrança e arquivamento. Os resultados completos e a avaliação por caso estão em `.semantic-review/real-sample-v14.json` e `.semantic-review/agent-analysis-v14.md`, diretório ignorado pelo Git com permissão 700 e arquivos 600. Exemplos versionados são exclusivamente sintéticos.

Gasto acumulado estimado das rodadas registradas: **US$ 0.3151232**, abaixo do teto final de **US$ 0,50**. Calculado pelos tokens retornados, sem desconto de cache; não representa extrato de cobrança. Preços do GPT-4.1 consultados na [documentação oficial](https://developers.openai.com/api/docs/models/gpt-4.1). A execução final verifica o custo máximo da próxima chamada antes de enviá-la e grava o consumo progressivamente.

Requisições usam `store: false`, sem background, ferramentas ou dados de conta/CNJ adicionais. Isso não comprova retenção zero nem audita opções privadas da conta; vale a condição de tratamento de dados previamente aceita no planejamento. Avaliação externa usou apenas dados sintéticos. Operação avaliada com uma instância executora e limite local de quatro gerações; múltiplas instâncias exigem a coordenação prevista na TechSpec.

## Acessibilidade

- Navegação por teclado, foco, botões e avaliação com nomes acessíveis verificados no E2E.
- Estados usam texto e semântica, incluindo `aria-busy`, `aria-pressed` e mensagens de status/erro; informação não depende apenas da cor.
- Capturas revistas em celular e desktop: texto e controles sem corte; conteúdo com fonte legível.
- Contrastes calculados: texto principal 15,70:1, secundário em branco 6,47:1, secundário no fundo de referência 5,54:1, sucesso 5,95:1 e erro 9,52:1; não há imagens informativas na seção que exijam `alt`, nem campos de formulário novos.
- Ampliação verificada por redução equivalente da viewport para reflow; nenhum teste automatizado substitui toda a experiência com tecnologia assistiva.

## Bugs encontrados e corrigidos

| ID | Descrição | Severidade | Status | Correção | Regressão | Evidência |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-01 | Banco de desenvolvimento sem tabelas de resumo causava erro ao abrir a seção | Alta | Corrigido | Migrations aplicadas no banco dev | Integrações e E2E-01 | Conferidas as cinco tabelas: SummarySourceState, SummaryGenerationSlot, SummaryAttempt, ProcessAiSummary, SummaryFeedbackRecord |
| BUG-02 | Resumos omitiam limites ou acrescentavam agente, finalidade, objeto de impugnação e efeitos não registrados | Alta | Corrigido na amostra final | Regras v14 e GPT-4.1; preservação explícita de contradições e limites dos registros | TU-18 e 20 respostas reais preservadas | Avaliação semântica final 20/20, com versões anteriores reprovadas preservadas |

Também foi substituída a resposta genérica do fake E2E por um fato sintético com referência correspondente, tornando a evidência funcional legível. O fake continua controlado e não é usado para aprovar a qualidade semântica.

## Ambiente e encerramento

E2E executado em backend 3050, controle 3051, frontend 5100 e PostgreSQL isolado `dev_test_resolvvi_e2e_test`, na porta 55432. Testes de integração usaram o template de testes separado. Os servidores iniciados pelo Playwright encerraram; portas 3050/3051/5100 confirmadas livres. O PostgreSQL e serviços de desenvolvimento já existentes foram preservados.

## Conclusão

Task 5 concluída com os fluxos automatizados aprovados, amostra semântica final aprovada e evidências de QA. A aprovação se limita aos casos e à configuração avaliados; a LLM pode produzir erros em outros históricos, conforme aviso da interface e limites do PRD.
