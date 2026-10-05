# Relatório de QA — Resumo processual por IA

## Resumo

- Data: 04/10/2026 (horário de Fortaleza)
- Status: **BLOQUEADO** — revisão semântica humana e confirmação operacional da política de retenção da conta ainda pendentes.
- Critérios de aceitação: 23; evidência automatizada registrada para todos. CA-02, CA-03, CA-07 e CA-22 ainda exigem verificações humanas indicadas abaixo.
- Bugs novos encontrados nesta rodada: 0.
- Execução real: 20 resumos sintéticos pelo `gpt-4.1-mini-2025-04-14`; 11.522 tokens de entrada e 1.824 de saída. Custo estimado pelas tarifas publicadas: **US$ 0,007527**, dentro do limite desta tarefa de US$ 1 (20% dos US$ 5 disponíveis). Todas as respostas passaram validação automática de formato, referências e idioma. Isso não equivale à aprovação semântica humana.

## Critérios de aceitação verificados

`PASSOU*` significa que os testes automatizados associados passaram; a estrela registra pendências semânticas ou de inspeção manual. O status global segue BLOQUEADO até essas pendências serem resolvidas.

| ID | Critério | Casos associados | Status | Evidência |
|---|---|---|---|---|
| CA-01 | Solicitação sob demanda | TU-12, TI-02, E2E-01 | PASSOU* | Testes e captura da seção |
| CA-02 | Fidelidade e formato | TU-04, TU-06, TU-18, TI-02, E2E-01 | PENDENTE | Revisão humana por frase em `.semantic-review/human-review.md` |
| CA-03 | Insuficiência, ambiguidade e contradição | TU-02, TU-18, E2E-03; amostra S01–S03 | PENDENTE | Revisar limitações e afirmações da amostra |
| CA-04 | Ausência de fonte utilizável | TU-12, E2E-03 | PASSOU* | Testes automatizados |
| CA-05 | Histórico integral e referências | TU-01, TI-02, TI-10, E2E-01 | PASSOU* | Conferência manual de referência no E2E-01 |
| CA-06 | Limite de contexto | TU-03, TU-12, E2E-03 | PASSOU* | Testes automatizados |
| CA-07 | Instruções maliciosas na fonte | TU-07, TU-08, TU-18, E2E-03; amostra S04 | PENDENTE | Revisão humana da amostra S04 |
| CA-08 | Saída inválida | TU-04–TU-06, TI-06 | PASSOU* | Testes automatizados |
| CA-09 | Reutilização do resumo | TU-09, TU-11, TI-03, TI-05, E2E-01 | PASSOU* | Asserção E2E de uma chamada e reutilização após recarga |
| CA-10 | Invalidação após mudança da fonte | TU-01, TI-04, TI-09, TI-13, E2E-02 | PASSOU* | E2E-02 com concorrência e nova versão |
| CA-11 | Concorrência e resposta atrasada | TU-09, TU-10, TU-13, TI-03–TI-05, TI-11, TI-14, E2E-02/04 | PASSOU* | E2E-02 e E2E-04 |
| CA-12 | Troca controlada de provedor | TU-11, TI-06, TI-13 | PASSOU* | Testes com provedor substituível/falso |
| CA-13 | Falhas, recuperação e prazo | TU-09–TU-11, TU-13, TI-05, TI-06, TI-11, TI-14, E2E-03/04 | PASSOU* | E2E-03 exercita falha e recuperação |
| CA-14 | Falha de persistência | TI-07, E2E-03 | PASSOU* | Testes de integração e recuperação de leitura |
| CA-15 | Voto e troca de voto | TU-14, TI-08, E2E-01 | PASSOU* | E2E-01 persiste e recupera o voto após recarga |
| CA-16 | Voto inválido e concorrente | TU-17, TI-01, TI-08 | PASSOU* | Testes de integração |
| CA-17 | Falha ao avaliar | TU-14, TI-08, E2E-03 | PASSOU* | E2E-03 verifica estado confirmado após falha |
| CA-18 | Rastreabilidade e versões | TU-06, TI-02, TI-09, TI-10, TI-13, E2E-01/02 | PASSOU* | Testes verificam snapshots, referências e versões |
| CA-19 | Transparência e referências | TU-12, TU-15, TI-10, E2E-01/05 | PASSOU* | Capturas e conferência manual da referência |
| CA-20 | Sessão e isolamento | TU-13, TU-17, TI-01, E2E-04 | PASSOU* | E2E-04 troca de processo e expira sessão durante geração |
| CA-21 | Métricas e logs sem dados sensíveis | TU-16, TI-11, TI-12 | PASSOU* | Asserções de eventos, agregados e sanitização |
| CA-22 | Acessibilidade e responsividade | TU-15, E2E-05 | PARCIAL | Teclado, rótulos usados pelos testes e larguras verificadas; contraste não foi medido por ferramenta dedicada |
| CA-23 | Qualidade e regressão | TI-14, todas as suítes e builds | PASSOU* | Cobertura acima de 80%; E2E inclui regressões anteriores |

## Testes E2E executados

| Grupo | Resultado | Evidência |
|---|---|---|
| 5 cenários de resumo processual | PASSOU | `E2E-01` a `E2E-05`; screenshots abaixo |
| 5 cenários de autenticação/consulta | PASSOU | `E2E-01` a `E2E-05` anteriores preservados |
| 5 cenários de detalhes/movimentações | PASSOU | `E2E-01` a `E2E-05` anteriores preservados |
| Total | **15 passaram** | `npm run test:e2e`, 41,6 s |

Capturas da seção de IA, sem dados do processo fora dessa seção:

- [Resumo disponível e avaliado](./evidences/resumo-disponivel-e-avaliado.png)
- [Falha recuperável](./evidences/resumo-falha-recuperavel.png)
- [Teclado em viewport móvel](./evidences/resumo-mobile-teclado.png)
- [Viewport desktop](./evidences/resumo-desktop.png)
- [Viewport de 640 px, equivalente ao layout a 200% em 1280 px](./evidences/resumo-viewport-200-equivalente.png)

## Testes automatizados e cobertura

| Aplicativo | Testes | Statements | Branches | Funções | Linhas | Lint, tipos e build |
|---|---:|---:|---:|---:|---:|---|
| Backend | 250 passaram | 89,77% | 82,87% | 92,12% | 93,00% | PASSOU |
| Frontend | 153 passaram | 92,12% | 88,67% | 95,06% | 95,03% | PASSOU |
| E2E | 15 passaram | — | — | — | — | PASSOU |

Comandos de regressão executados anteriormente nesta tarefa: em cada aplicativo, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build`; no frontend, também `npm run test:e2e`. O E2E completo foi repetido após a adição das capturas e passou novamente. Os testes automatizados usam provedor falso e não consomem saldo da API.

## Avaliação semântica real

Os 20 casos S01–S20 são sintéticos e cobrem sentença sem resultado, conflito, baixa informação, injeção de instrução, citação, defesa, prova, perícia, acordo, recurso, execução, pagamento parcial, pedido sem decisão e arquivamento provisório. Os dados e textos completos ficam em diretório local com permissão `700` na pasta e `600` nos arquivos; esse diretório está excluído do Git.

- Saídas, fontes, tokens e custo: [evidência protegida](./.semantic-review/real-sample.json)
- Rubrica humana preenchível, com cada frase e registros de origem: [formulário de revisão](./.semantic-review/human-review.md)
- Configuração: provedor OpenAI, modelo `gpt-4.1-mini-2025-04-14`, regras `summary-rules-v1`; chamadas sequenciais, sem repetição automática, limite local de US$ 1.
- Resultado automático: 20/20 respostas válidas em formato, referências e idioma. Nenhuma recebeu aprovação semântica automática.
- Decisão do gate: **PENDENTE** até revisor humano conferir factualidade/evidências por frase, cobertura, incerteza, ausência de conselho e linguagem simples.
- TU-18 não foi alterado com base em resultados ainda não aprovados. A tarefa 5.5 depende do parecer humano.

## Acessibilidade e visual

O E2E navegou por Tab/Enter, conferiu estados dos botões de voto e ausência de rolagem horizontal nos viewports de 320, 640 e 1280 px. As capturas mostram a seção em celular, desktop, sucesso e erro. Não foi feita medição independente de contraste nem teste com leitor de tela; CA-22 fica parcial até essa verificação.

## Política de dados e limitações operacionais

As chamadas usaram somente fontes sintéticas. O adaptador envia `store: false`, `background: false` e não usa ferramentas. A documentação oficial informa que, por padrão, logs de monitoramento contra abuso podem incluir conteúdo e ser retidos por até 30 dias; o uso da API não treina os modelos por padrão. O estado de controles ZDR/MAM desta conta não foi verificado, portanto não se declara retenção zero. [Controles de dados da API OpenAI](https://developers.openai.com/api/docs/guides/your-data).

Antes de enviar dados processuais reais, é necessário confirmar a política de tratamento aprovada para a instância/conta executora. A aplicação foi planejada para uma única instância executora; coordenação global entre múltiplas instâncias permanece fora do escopo implementado.

## Bugs encontrados e corrigidos

Nenhum defeito novo foi encontrado nesta execução. Os casos de indisponibilidade e saída inválida nos logs são cenários controlados de E2E e passaram suas verificações de recuperação; os logs não incluíram texto, identificadores do processo ou credenciais.

## Conclusão

Os testes automatizados, builds, cobertura e fluxos E2E passaram. A amostra real foi produzida por custo estimado de US$ 0,007527, abaixo do teto de US$ 1. O QA permanece **BLOQUEADO**: falta a revisão humana da rubrica, a incorporação das conclusões aprovadas às fixtures TU-18 e a confirmação operacional dos controles de retenção antes de usar dados reais. A tarefa 5.0 não deve ser marcada concluída até esses itens serem resolvidos.
