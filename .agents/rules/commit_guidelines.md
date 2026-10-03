# Diretrizes de Commit para o Harness

Todos os commits automatizados gerados pelo Harness devem seguir estritamente as regras abaixo:

## 1. Formato e Estrutura

Use a estrutura básica do Conventional Commits (letras minúsculas, **sem corpo**, **sem descrição** e **sem rodapé**):

```text
<tipo>(<escopo>): <ação curta e autoexplicativa>
```

### Tipos Permitidos

- `feat`: Novas funcionalidades ou adições.
- `fix`: Correções de bugs.
- `docs`: Alterações em documentações.
- `style`: Formatação, pontos e vírgulas ausentes, etc. (sem alteração de código).
- `refactor`: Reestruturação de código sem alterar o comportamento.
- `test`: Adição ou modificação de testes.
- `chore`: Atualização de tarefas de build, dependências ou configurações.

## 2. Restrições e Regras

- **Idioma:** Sempre em **inglês**.
- **Tamanho:** Mantido **curto**, conciso e autoexplicativo.
- **Escopo:** Commits pequenos e atômicos, com contexto claro.
- **Conteúdo:** Apenas a linha do título. **Não inclua nenhuma descrição ou corpo no texto.**
- **Autor:** Deve ser commitado apenas com o **Autor/Usuário registrado**. Não injete a palavra "Harness" nos campos de autor ou committer.

## 3. Frequência e automação

- Após concluir e validar um incremento coeso, crie automaticamente um commit local com o código e seus testes. Não acumule tarefas concluídas sem commit.
- Antes de cada commit, confira o diff e adicione arquivos ou trechos explicitamente; preserve alterações alheias e o conteúdo previamente staged.
- Use a identidade Git configurada. Se estiver ausente, solicite sua configuração; não invente autoria.
- Antes de finalizar a tarefa, inclua a atualização dos checklists no último commit e informe os hashes criados. Não crie commits vazios.
- Push exige autorização separada.

## 4. Exemplos Visuais

- `feat(auth): add JWT token validation`
- `fix(ui): resolve login button alignment issue`
- `chore(deps): upgrade lodash to version 4.17.21`
- `docs(readme): update installation steps`
- `refactor(db): optimize user query performance`
