# Tarefa 10.0: Cadastro por e-mail sintático e limpeza do fluxo

## Visão geral

Alinhar implementação, persistência, interface, testes e documentação ao cadastro com e-mail e senha, em que o valor de e-mail precisa apenas ter estrutura sintática válida. Após cadastro, a pessoa vai ao login com o e-mail preenchido e informa a senha.

## Subtarefas

- [x] 10.1 Simplificar contratos, serviços, controladores, configuração e repositórios do backend.
- [x] 10.2 Remover do schema persistido os estados e registros que não fazem mais parte da conta; criar migration preservando usuário, hash de senha e sessão.
- [x] 10.3 Simplificar frontend para cadastro, login e navegação pós-cadastro escolhida.
- [x] 10.4 Ajustar testes unitários, integração e E2E para cadastro, duplicidade, login e sessão.
- [x] 10.5 Atualizar PRD, TechSpec, tarefas e README para refletir o comportamento atual.
- [x] 10.6 Executar suítes, cobertura, lint, typecheck e builds dos aplicativos afetados; corrigir falhas.
- [x] 10.7 Aplicar migration em banco isolado e executar jornada E2E.
- [x] 10.8 Revisar diff, garantir ausência de configuração de provedor no runtime e criar commit local.

## Critérios de aceitação relacionados

- CA-01–CA-08 do PRD: cadastro, conta duplicada, senha, login e sessão.
- CA-14 e CA-15: qualidade, cobertura e segurança.

## Testes da tarefa

- Backend unitários e integração com PostgreSQL isolado.
- Frontend unitários e verificação do redirecionamento após cadastro.
- Playwright: cadastro com endereço sintético, login, duplicidade sem troca da senha, consulta protegida e sessão expirada.

## Resultado

Concluída. As verificações estão registradas em [evidences/task-10.md](./evidences/task-10.md) e o commit local contém o código, os testes e a documentação atualizada.
