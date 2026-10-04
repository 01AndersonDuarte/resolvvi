# Resumo das tarefas de implementação de autenticação e consulta CNJ

Estrutura aprovada pelo usuário. Referências: [PRD](./prd.md) e [TechSpec](./techspec.md). Cada arquivo detalha requisitos, dependências, subtarefas e testes próprios. As dez tarefas mapeiam CA-01–CA-28, TU-01–TU-17, TI-01–TI-17 e E2E-01–E2E-05.

O validador CNJ permanece um pré-requisito da fundação, confirmado pelo usuário, e sua implementação não integra este plano. A tarefa 6 e a entrega completa ficam bloqueadas até sua disponibilização. As tarefas 7 e 8 podem avançar após suas dependências, independentemente desse bloqueio; a numeração não impõe dependências adicionais.

Todas as tarefas estão pendentes. A aprovação desta decomposição autoriza a geração dos documentos; iniciar implementação exige a confirmação prevista pela skill criar-tasks. Marcar itens somente após implementação, testes e verificações pertinentes. Aceite real do Resend e verificações manuais de acessibilidade estão na tarefa 10.

## Tarefas

- [ ] 1.0 [Infraestrutura HTTP, configuração, erros, logs e ambiente de testes](./task_1.md) — depende de fundação existente.
- [ ] 2.0 [Persistência de autenticação e segurança de senhas e tokens](./task_2.md) — depende de 1.0.
- [ ] 3.0 [Cadastro e reenvio pelo Resend com limites e recuperação](./task_3.md) — depende de 2.0.
- [ ] 4.0 [Confirmação de e-mail de uso único e controle de concorrência](./task_4.md) — depende de 3.0.
- [ ] 5.0 [Login, sessão, autorização e logout com revogação](./task_5.md) — depende de 4.0.
- [ ] 6.0 [API protegida de consulta CNJ e destino mínimo do processo](./task_6.md) — depende de 5.0 e validador real da fundação (pendente).
- [ ] 7.0 [Base React, cliente HTTP, controle de sessão e rotas protegidas](./task_7.md) — depende de 5.0.
- [ ] 8.0 [Telas de cadastro, confirmação, reenvio e login](./task_8.md) — depende de 3.0, 4.0, 7.0.
- [ ] 9.0 [Interface de consulta, resultado, retorno e recuperação de erros](./task_9.md) — depende de 6.0, 7.0, 8.0.
- [ ] 10.0 [Jornadas E2E, qualidade, documentação e aceite real do Resend](./task_10.md) — depende de 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0.
