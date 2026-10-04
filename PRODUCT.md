# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, TypeScript, Vite, Tailwind CSS, React Router; stack definida pelo plano aprovado.

## Users

Pessoas com acesso ao próprio e-mail que conhecem o número CNJ do processo que desejam localizar. Não precisam ter conhecimento técnico ou jurídico. Responsáveis por disponibilizar o serviço configuram o ambiente e o envio de confirmação; não há interface administrativa nesta etapa.

## Product Purpose

Permitir cadastro com e-mail e senha, confirmação obrigatória do endereço, autenticação e localização de um processo existente na base disponível por seu número CNJ. O sucesso é chegar ao registro correto após uma consulta simples e protegida.

## Capabilities and Constraints

- A jornada inclui cadastro, confirmação por e-mail, login, consulta CNJ protegida e destino mínimo do processo.
- A consulta é somente leitura e usa a base processual existente; não consulta serviços externos nem altera processos ou movimentações.
- A autorização é igual para todas as contas confirmadas; não há relação de titularidade entre conta e processo.
- O cadastro solicita somente e-mail e senha. A confirmação não cria sessão automaticamente.
- A interface e as mensagens são em português do Brasil.
- O validador CNJ real da fundação é uma dependência; não deve ser substituído por outro algoritmo.
- A visualização completa de dados e movimentações processuais pertence a uma etapa futura.

## Evidence on Hand

- Requisitos de produto e critérios de aceitação em `tasks/prd-autenticacao-consulta-cnj/prd.md`.
- Contratos e arquitetura em `tasks/prd-autenticacao-consulta-cnj/techspec.md`.
- API de autenticação implementada em `backend/src/`.
- A fixture processual documentada para testes é `1001399-31.2023.8.26.0070`; seu ID persistido não é fixo.

## Product Principles

- Simplificar a consulta para pessoas sem conhecimento jurídico.
- Exigir confirmação de e-mail e sessão válida antes de revelar registros.
- Diferenciar ausência de resultado de falhas de validação ou infraestrutura.
- Preservar os dados da fundação e limitar a consulta ao necessário.

## Accessibility & Inclusion

Manter fluxo utilizável por teclado, nomes e mensagens semânticas para leitor de tela, e layout funcional em viewport de 320 px e zoom de 200%.
