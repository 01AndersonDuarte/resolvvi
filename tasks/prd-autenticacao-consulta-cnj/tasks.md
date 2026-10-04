# Resumo das tarefas de implementação de autenticação e consulta CNJ

PRD: [prd.md](./prd.md)
TechSpec: [techspec.md](./techspec.md)

As tarefas 1.0 a 9.0 registram as entregas já existentes. A tarefa 10.0 alinha cadastro, persistência, interface, testes e documentação ao escopo atual. Marcar a conclusão após executar as verificações listadas na tarefa.

## Tarefas

- [x] 1.0 [Infraestrutura HTTP, configuração, erros, logs e ambiente de testes](./task_1.md).
- [x] 2.0 [Persistência de autenticação e segurança de senhas e tokens](./task_2.md) — depende de 1.0.
- [x] 3.0 [Cadastro de conta com e-mail e senha](./task_3.md) — depende de 2.0.
- [x] 5.0 [Login, sessões revogáveis e autorização](./task_5.md) — depende de 2.0 e 3.0.
- [x] 6.0 [Consulta protegida e acesso ao repositório existente](./task_6.md) — depende de 5.0.
- [x] 7.0 [Busca CNJ e resultado mínimo](./task_7.md) — depende de 6.0.
- [x] 8.0 [Telas de cadastro e login](./task_8.md) — depende de 3.0 e 5.0.
- [x] 9.0 [Tela de consulta e resultado do processo](./task_9.md) — depende de 6.0, 7.0 e 8.0.
- [x] 10.0 [Alinhar cadastro, testes e documentação ao escopo atual](./task_10.md) — depende das tarefas 1.0 a 9.0.
