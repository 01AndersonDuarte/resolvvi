# Tarefa 4.0: Validar a carga inicial e documentar a execução

## Visão geral

Executar o seed em uma base vazia, verificar os totais e a relação entre entidades e documentar o comando e os pré-requisitos. Esta tarefa fecha a etapa com evidência da carga única.

**Dependências:** [3.0](./task_3.md).
**Estado:** pendente.

<skills>
### Conformidade com skills

Não há frontend nesta tarefa; a skill React não se aplica.
</skills>

<rules>
### Conformidade com o AGENTS.md e as rules

Foram lidos `AGENTS.md` e todos os arquivos em `.agents/rules/`. A validação seguirá FIRST, usará uma base controlada e não criará cenários artificiais de ETL.
</rules>

<requirements>

- Implementar RF8.
- Confirmar CA-01 a CA-06 com os testes e comandos aplicáveis.
- Registrar no README somente a execução do seed inicial e os comandos de qualidade.
- Manter o CSV original inalterado.
</requirements>

## Subtarefas

- [ ] 4.1 Executar a suíte unitária, integração, lint, typecheck, coverage e build.
- [ ] 4.2 Executar o seed contra uma base vazia e conferir 100 processos e 5.568 movimentações.
- [ ] 4.3 Conferir amostras de texto, conteúdo ausente, datas e ordenação.
- [ ] 4.4 Registrar resultados no README e atualizar esta tarefa.

## Detalhes de implementação

Consultar [TechSpec — Abordagem de testes](./techspec.md#abordagem-de-testes) e [Sequenciamento do desenvolvimento](./techspec.md#sequenciamento-do-desenvolvimento). A validação não inclui reexecução, recuperação ou relatório de importação.

## Critérios de aceitação relacionados

- CA-01
- CA-02
- CA-03
- CA-04
- CA-05
- CA-06

## Testes da tarefa

### Testes de unidade

- [ ] TU-01 — Mapear as oito colunas do registro
- [ ] TU-02 — Converter data, valor e quantidade
- [ ] TU-03 — Preservar a ordem de origem

### Testes de integração

- [ ] TI-01 — Criar processos e movimentações relacionadas
- [ ] TI-02 — Respeitar unicidade do CNJ
- [ ] TI-03 — Falhar sem persistência parcial

### Testes E2E

Não aplicável.

## Arquivos relevantes

- `backend/README.md`
- `backend/src/**/*.test.ts`
- `backend/prisma/`
- `lawsuits_movements.csv`
