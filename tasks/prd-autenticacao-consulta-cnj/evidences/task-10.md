# Evidências da tarefa 10

Data da execução: 4 de outubro de 2026.

## Verificações locais

- Playwright/Chromium: `npm run test:e2e` — 5 testes aprovados em 41,5 s. E2E-01 a E2E-05 cobrem a jornada de conta, confirmação simulada em contexto separado, consulta, recuperação, autorização, saída e navegação por teclado, incluindo logout sincronizado entre abas.
- Revalidação da largura/zoom simulados: `npx playwright test --grep E2E-05` — 1 teste aprovado. O teste mede ausência de overflow a 320 px e aplica `zoom: 200%` por CSS em viewport de 640 px; isso não substitui a ampliação real do navegador.
- Frontend: lint, typecheck, build, `npm test` e `npm run test:coverage` aprovados. Vitest: 18 arquivos e 122 testes. Cobertura: 95,21% statements; 90,52% branches; 97,11% funções; 97,23% linhas.
- Backend: lint, typecheck, build, `npm test` e `npm run test:coverage` aprovados. Vitest: 37 arquivos e 183 testes, incluindo integrações no banco de testes. Cobertura: 86,00% statements; 81,25% branches; 88,43% funções; 89,32% linhas.
- Banco E2E isolado `dev_test_resolvvi_e2e_test`: migrations aplicadas e fixture carregada (100 processos, 5.568 movimentações). Contagens e hashes integrais de `Process` e `Movement` coincidiram entre as bases local e E2E: processos `1b00d95d087cc84928eb421f90abbb16`; movimentações `e1b9aaf982fa84a38055b7ba87ff324e`.
- A API, o coletor e a SPA foram encerrados pelo Playwright ao final; as portas 3050, 3051 e 5100 ficaram livres. O PostgreSQL já existente permaneceu ativo.

## Aceite ainda necessário

- **10.6 permanece aberto.** Falta executar o envio e recebimento reais pelo Resend com domínio/remetente verificados, credencial protegida, URL pública correta e uma caixa controlada. Não houve envio real nesta execução.
- Falta completar a conferência manual da jornada com leitor de tela e zoom real do navegador. A automação verifica teclado, viewport de 320 px e uma aproximação de zoom por CSS, mas não declara CA-17 nem CA-28 aceitos.
