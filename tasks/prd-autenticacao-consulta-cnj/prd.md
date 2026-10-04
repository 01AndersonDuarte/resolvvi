# Documento de Requisitos do Produto (PRD)

## Visão geral

Esta funcionalidade permite que uma pessoa crie uma conta com e-mail e senha, entre e consulte um processo por seu número CNJ. A consulta reutiliza a base de processos existente e mostra uma página mínima do processo encontrado.

O e-mail é o identificador único da conta. O cadastro exige somente que o valor tenha estrutura sintática de e-mail; a pessoa pode usar um endereço que não recebe mensagens. A senha continua obrigatória para cadastro e login.

## Objetivos

- **O1 — Criar conta:** permitir cadastro público com e-mail sintaticamente válido e senha aceita.
- **O2 — Entrar e sair:** autenticar com e-mail e senha, manter uma sessão protegida e permitir encerrá-la.
- **O3 — Consultar processo:** permitir a busca exata por CNJ para uma sessão válida.
- **O4 — Explicar resultados:** distinguir entrada inválida, processo ausente e falha temporária sem apagar o CNJ informado.
- **O5 — Preservar a fundação:** reutilizar a persistência e a busca de processos sem alterar os dados existentes.
- **O6 — Qualidade:** cobrir fluxos críticos com testes automatizados, manter cobertura mínima de 80% nos aplicativos e cumprir as regras do repositório.

## Histórias de usuário

- **US1 — Cadastro:** como visitante, quero criar uma conta com e-mail e senha para acessar a consulta.
- **US2 — Login:** como pessoa cadastrada, quero entrar com minhas credenciais para consultar processos.
- **US3 — Busca:** como pessoa autenticada, quero informar o número CNJ e ver se o processo está na base.
- **US4 — Resultado:** como pessoa que encontrou um processo, quero ver seu identificador e voltar à busca sem perder o CNJ.
- **US5 — Recuperação:** como pessoa usuária, quero receber mensagens claras para corrigir dados inválidos ou tentar novamente após uma falha.
- **US6 — Sessão:** como pessoa autenticada, quero que páginas e chamadas protegidas exijam uma sessão válida e que a saída encerre essa sessão.

## Funcionalidades e requisitos

### Cadastro e autenticação

- **RF1 — Campos de cadastro:** apresentar somente e-mail e senha.
- **RF2 — Formato do e-mail:** validar sintaxe e limite técnico de 254 caracteres sem consultar DNS nem tentar entregar mensagem; remover espaços externos e converter para minúsculas antes de persistir.
- **RF3 — Senha:** exigir de 8 a 128 pontos de código Unicode; preservar espaços e caracteres exatamente como enviados.
- **RF4 — Unicidade:** permitir uma conta por e-mail normalizado. Uma tentativa duplicada informa que a conta já existe e orienta a entrar; não altera a senha existente.
- **RF5 — Próximo passo:** depois do cadastro aceito, encaminhar à tela de login com o e-mail preenchido e informar que a conta foi criada.
- **RF6 — Login:** exigir e-mail e senha válidos. Credenciais incorretas usam uma resposta comum que não revela qual campo falhou.
- **RF7 — Senha armazenada:** armazenar somente hash derivado com salt; nunca persistir ou registrar a senha em texto claro.
- **RF8 — Sessão:** criar sessão após autenticação correta, com validade absoluta de oito horas e segredo somente em cookie HTTP-only.
- **RF9 — Proteção:** verificar a sessão no servidor em cada chamada protegida; recusar sessão ausente, revogada ou expirada.
- **RF10 — Saída:** revogar a sessão no servidor e limpar o cookie após a operação ser concluída.

### Consulta CNJ

- **RF11 — Acesso:** exigir sessão válida na tela e na API de busca.
- **RF12 — Entrada CNJ:** aceitar somente a estrutura CNJ com 20 dígitos e separadores nas posições previstas. Não recalcular o dígito verificador.
- **RF13 — Busca exata:** consultar o repositório existente por igualdade do CNJ; não chamar tribunal, serviço externo ou mecanismo aproximado.
- **RF14 — Resposta mínima:** retornar identificador e CNJ formatado, sem partes, movimentações ou outros dados processuais.
- **RF15 — Destino:** abrir rota de processo apenas com identificador inteiro positivo e revalidar a sessão antes de obter os dados.
- **RF16 — Retorno:** preservar o último CNJ informado ao voltar do resultado para a busca.
- **RF17 — Falhas:** distinguir CNJ malformado, processo ausente e indisponibilidade; preservar a entrada e permitir nova tentativa.

## Regras de negócio

- **RN1:** o e-mail normalizado é único e identifica a conta; sua existência ou capacidade de receber mensagens não é verificada.
- **RN2:** a senha é mantida no fluxo de cadastro e login, sempre transformada em hash antes de persistência.
- **RN3:** repetir um cadastro existente não modifica a conta nem sua senha.
- **RN4:** login correto cria sessão; nenhuma chamada pública diferente do login cria sessão.
- **RN5:** a sessão expira após oito horas, não é renovada por atividade e pode ser revogada na saída.
- **RN6:** busca e destino do processo exigem sessão válida no backend.
- **RN7:** uma consulta retorna no máximo um processo de correspondência exata e não inclui detalhes processuais.

## Critérios de aceitação

- **CA-01 — Cadastro aceito:** e-mail sintaticamente válido e senha dentro dos limites criam uma conta com senha derivada; a resposta não cria sessão.
- **CA-02 — E-mail sintético:** endereço como `example@email.com` é aceito sem verificar se existe ou pode receber mensagens.
- **CA-03 — Cadastro inválido:** e-mail malformado ou senha fora dos limites são recusados antes da persistência, com erro associado ao campo.
- **CA-04 — Cadastro duplicado:** nova tentativa com o mesmo e-mail normalizado não cria outra conta nem substitui a senha original.
- **CA-05 — Navegação após cadastro:** cadastro aceito abre o login com e-mail preenchido e mensagem de sucesso; a pessoa informa sua senha para entrar.
- **CA-06 — Login:** senha correta cria cookie seguro de sessão; senha incorreta e usuário inexistente recebem erro comum.
- **CA-07 — Sessão:** sessão expirada ou revogada bloqueia chamadas protegidas; a API não expõe o segredo do cookie.
- **CA-08 — Saída:** saída bem-sucedida revoga a sessão e remove o cookie; falha mantém o estado local recuperável.
- **CA-09 — Consulta:** sessão válida e CNJ estruturalmente válido buscam por igualdade na base existente.
- **CA-10 — Processo ausente:** consulta sem correspondência apresenta orientação clara, conserva o CNJ e permite correção.
- **CA-11 — Entrada inválida:** CNJ malformado não executa consulta e permanece disponível para correção.
- **CA-12 — Falha de serviço:** indisponibilidade apresenta mensagem recuperável sem perder a entrada.
- **CA-13 — Integridade de dados:** cadastro e consulta não modificam processos ou movimentações da fundação.
- **CA-14 — Qualidade:** testes dos aplicativos afetados passam, cobertura é de ao menos 80% e fluxos críticos têm testes unitários, de integração e E2E apropriados.
- **CA-15 — Segurança:** logs e respostas não contêm senha, hash de senha, segredo de sessão ou conteúdo pessoal desnecessário.

## Jornada principal

1. A pessoa abre criar conta, informa um endereço no formato de e-mail e escolhe uma senha.
2. A API valida os dois campos, normaliza o identificador, deriva a senha e cria a conta.
3. A aplicação abre o login com o e-mail preenchido e informa que a conta foi criada.
4. A pessoa informa a senha, entra e recebe uma sessão protegida.
5. Na consulta, informa o CNJ; a API valida o formato e busca correspondência exata.
6. Se encontrado, o processo é exibido de forma mínima. A pessoa pode voltar à busca com o CNJ preservado.

## Estados da interface

- Cadastro: inicial, validação local, solicitação em andamento, sucesso seguido de login preenchido, erro de validação, conta existente e falha recuperável.
- Login: inicial, validação, solicitação em andamento, erro de credenciais, falha recuperável e sessão criada.
- Consulta: inicial, validação, busca em andamento, processo encontrado, processo ausente e indisponibilidade.
- Sessão: carregando, anônima, autenticada, expirada e saída pendente após falha de revogação.

Mensagens de erro são associadas aos campos quando possível e não dependem apenas de cor.

## Restrições técnicas de alto nível

- Backend Node.js, Express e TypeScript; frontend React, TypeScript, Vite e Tailwind; persistência PostgreSQL via Prisma.
- Reutilizar os padrões, scripts e limites de cobertura documentados em `AGENTS.md` e `.agents/rules/`.
- Manter frontend e backend como aplicações independentes, cada uma com seus scripts e dependências.
- Usar ambiente de banco isolado para testes de integração e fixtures determinísticas para E2E.
- Não introduzir serviços externos para cadastro, autenticação ou busca CNJ.

## Fora do escopo

- Recuperação ou redefinição de senha.
- Autenticação multifator, OAuth e cadastro administrativo.
- Verificação de titularidade do endereço informado.
- Alteração da fundação de dados processuais, importação ou atualização de movimentações.
- Consulta remota a tribunais ou exibição de detalhes processuais nesta etapa.
