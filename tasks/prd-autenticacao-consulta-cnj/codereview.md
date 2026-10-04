# Revisão de código — autenticação e consulta CNJ

## Escopo

Cadastro por identificador de e-mail sintaticamente válido e senha; autenticação, sessão, autorização e consulta CNJ.

## Conformidade

- O serviço normaliza e valida o e-mail localmente, deriva a senha e cria uma conta sem iniciar sessão.
- A unicidade é protegida no serviço e no banco; conflitos concorrentes preservam o hash já armazenado.
- Login usa a senha existente e emite segredo somente no cookie protegido.
- A verificação de sessão não depende de atributo de confirmação do endereço.
- O schema e a migration refletem os campos usados pela aplicação; a migration mantém contas e sessões.
- A interface leva ao login com o e-mail preenchido e pede a senha antes de autenticar.
- Configuração HTTP e execução não exigem provedor externo.

## Verificações

- Backend: lint, typecheck, build, 130 testes e cobertura total de 86,41% aprovados.
- Frontend: lint, typecheck, build, 100 testes e cobertura total de 92,69% aprovados.
- Playwright: cinco jornadas aprovadas em Chromium.
- Migration aplicada nos bancos isolados de testes e E2E.

## Veredito

APROVADO. Não foram encontrados problemas de conformidade no diff revisado.
