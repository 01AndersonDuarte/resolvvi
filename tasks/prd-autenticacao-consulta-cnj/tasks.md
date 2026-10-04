# Resumo das tarefas de implementação de autenticação e consulta CNJ

Estrutura aprovada pelo usuário. Referências: [PRD](./prd.md) e [TechSpec](./techspec.md). Cada arquivo detalha requisitos, dependências, subtarefas e testes próprios. As dez tarefas mapeiam CA-01–CA-28, TU-01–TU-17, TI-01–TI-17 e E2E-01–E2E-05.

Na tarefa 6, a entrada CNJ é validada somente pela estrutura completa e pelos 20 dígitos ASCII; o cálculo dos dígitos verificadores não integra esta entrega. As tarefas 7 e 8 podem avançar após suas dependências próprias; a numeração não impõe dependências adicionais.

As tarefas 1.0 a 9.0 foram concluídas; a tarefa 10.0 permanece pendente. A aprovação desta decomposição autorizou a geração dos documentos; a execução explícita das tarefas anteriores autorizou suas implementações. Marcar itens somente após implementação, testes e verificações pertinentes. Aceite real do Resend e verificações manuais de acessibilidade estão na tarefa 10.

## Tarefas

- [x] 1.0 [Infraestrutura HTTP, configuração, erros, logs e ambiente de testes](./task_1.md) — depende de fundação existente.
- [x] 2.0 [Persistência de autenticação e segurança de senhas e tokens](./task_2.md) — depende de 1.0.
- [x] 3.0 [Cadastro e reenvio pelo Resend com limites e recuperação](./task_3.md) — depende de 2.0.
- [x] 4.0 [Confirmação de e-mail de uso único e controle de concorrência](./task_4.md) — depende de 3.0.
- [x] 5.0 [Login, sessão, autorização e logout com revogação](./task_5.md) — depende de 4.0.
- [x] 6.0 [API protegida de consulta CNJ e destino mínimo do processo](./task_6.md) — depende de 5.0.
- [x] 7.0 [Base React, cliente HTTP, controle de sessão e rotas protegidas](./task_7.md) — depende de 5.0.
- [x] 8.0 [Telas de cadastro, confirmação, reenvio e login](./task_8.md) — depende de 3.0, 4.0, 7.0.
- [x] 9.0 [Interface de consulta, resultado, retorno e recuperação de erros](./task_9.md) — depende de 6.0, 7.0, 8.0.
- [ ] 10.0 [Jornadas E2E, qualidade, documentação e aceite real do Resend](./task_10.md) — depende de 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0.
