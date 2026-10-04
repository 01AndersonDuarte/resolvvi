# Tarefa 3.0: Auditoria da base importada pelos novos contratos

## Visão geral

Ampliar a auditoria da fixture real para demonstrar que os cinco campos gerais e os três campos de cada movimentação continuam consultáveis e fiéis à origem pelos serviços de leitura implementados.

**Dependências:** [1.0](./task_1.md), [2.0](./task_2.md)

**Status:** pendente de implementação.

<skills>
### Conformidade com skills

Skill de execução aplicável: [`executar-task`](../../.agents/skills/executar-task/SKILL.md). Não há skill específica de backend necessária; seguir as rules.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Leitura concluída de `AGENTS.md` e de todas as rules em `.agents/rules/`: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `folder-structure.md` e `commit_guidelines.md`. Manter aplicativos independentes, funções de até 30 linhas e arquivos TypeScript de até 300 linhas, tipos seguros, imports sem ciclos e testes de comportamento segundo FIRST/AAA. Preservar cobertura mínima de 80%, segredos fora do código e logs sanitizados. Ao executar, revisar o diff, atualizar os checklists e criar commit local coeso com identidade Git configurada e Conventional Commits em inglês; push exige autorização separada.

No backend, agrupar contratos por contexto em `types/`, manter acesso ao banco nos repositories e regras nos services; controllers não convertem erros em respostas. Preservar I/O assíncrono, configuração e logging existentes. Não modificar migrations, CSV ou constraints para acomodar fixtures defensivas.
</rules>

<requirements>
Requisitos relacionados: RF1, RF2, RF3, RF4, RF6, RF7, RF8, RF9, RF13, RF21.

- Conferir todos os 100 processos e 5.568 eventos, inclusive conteúdos ausentes, o maior histórico real e o texto de 15.266 caracteres.
- Derivar expectativas da fixture com lógica independente da implementação, sem usar os serializadores de produção para produzir o resultado esperado.
- Reutilizar o cenário de importação existente antes de seu cleanup, evitando suítes concorrentes sobre os mesmos CNJs.
</requirements>

## Subtarefas

- [ ] 3.1 Estender o cenário existente em persist-seed.integration.test.ts e preparar expectativas independentes por processo e ordem de origem.
- [ ] 3.2 Consultar detalhes e todas as páginas pelas novas leituras e comparar identidade, campos formatados, ordem, vínculo e conteúdo integral.
- [ ] 3.3 Verificar completude dos 100 processos e 5.568 eventos, incluindo ausências e os extremos reais de volume e conteúdo.
- [ ] 3.4 Extrair auxiliar de teste coeso somente se necessário para respeitar o limite de arquivo; manter cleanup e isolamento existentes.
- [ ] 3.5 Executar as validações da tarefa e registrar evidências; atualizar os checklists e criar o commit local do incremento.

## Detalhes de implementação

Seguir as seções abaixo do [techspec.md](./techspec.md), fonte de verdade dos contratos e casos de teste:

- Abordagem de testes: TI-07 e orientações sobre a fixture CSV compartilhada.
- Modelos de dados: mapeamento base importada → contrato.
- Riscos conhecidos: fixture real compartilhada.

A tarefa comprova o contrato de dados que sustenta a apresentação; a expansão visual de CA-06 permanece nas tarefas 6 e 7. Não alterar o CSV, o importador ou as restrições persistidas. Não criar outra suíte que importe e remova os CNJs originais simultaneamente.

## Critérios de aceitação relacionados

Referências ao [PRD](./prd.md). A validação dos critérios é responsabilidade do QA; esta tarefa produz a implementação e/ou as evidências correspondentes.

- CA-01
- CA-02
- CA-04
- CA-05
- CA-06
- CA-21
- CA-22

## Testes da tarefa

IDs, nomes e resultados esperados preservados da TechSpec. Casos compartilhados têm seu recorte explicitado em “Detalhes de implementação”.

### Testes de integração

- [ ] TI-07 — Fixture CSV inteira permanece consultável. Todos os campos dos 100 processos e 5.568 eventos correspondem à origem após formatação.

### Validações de conclusão

Executar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` e `npm run build` no aplicativo afetado. Os scripts atuais existem em ambos os aplicativos; prevalecem sobre as observações antigas de ausência de lint/testes. Não reduzir os limites de cobertura nem excluir código novo para atingir o percentual.

## Arquivos relevantes

- [PRD](./prd.md) e [TechSpec](./techspec.md).
- `backend/src/seed/persist-seed.integration.test.ts`.
- `backend/src/services/process-service.ts`.
- `backend/src/repositories/process-repository.ts`.
- `backend/src/repositories/movement-repository.ts`.
- Testes unitários e de integração adjacentes aos módulos alterados; arquivos novos seguem os nomes da TechSpec.

Os caminhos novos indicam arquivos a criar na implementação; dependências existentes são referências, sem obrigação de alterá-las.
