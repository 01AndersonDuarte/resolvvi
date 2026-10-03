---
name: react
description: Padrões para implementar, revisar e refatorar código React 19 com TypeScript neste projeto, incluindo componentes, props, hooks, efeitos, memoização, integração com backend, acessibilidade e Tailwind CSS. Use ao trabalhar em arquivos React do frontend, criar ou alterar componentes e hooks, revisar estado e efeitos, ou avaliar a qualidade de uma interface React.
---

# Regras para React

Estas regras se aplicam ao código do frontend React deste projeto.

## Como usar esta skill

Aplicar estas regras ao criar, alterar ou revisar código React. Carregar os exemplos somente quando forem necessários:

- [Componentes pequenos e props explícitas](references/examples/components.md)
- [Hooks, efeitos e memoização](references/examples/hooks-effects.md)
- [Acesso ao backend](references/examples/backend.md)
- [Acessibilidade](references/examples/accessibility.md)
- [Estilização](references/examples/styling.md)
- [10 boas práticas adicionais de React](references/react-best-practices.md)

## Componentes pequenos e reutilizáveis

- Crie componentes com uma única responsabilidade.
- Não crie componentes com mais de 30 linhas. Extraia partes da interface, regras de negócio ou estados para componentes e hooks menores.
- Prefira nomes que expressem o papel do componente, como `StatusCard`, `HealthMessage` e `LoadingIndicator`.
- Reutilize componentes para comportamentos e estruturas visuais comuns, evitando duplicação.

Consulte os [exemplos de componentes pequenos e props explícitas](references/examples/components.md).

## Props explícitas

Evite encaminhar props com o spread operator, pois isso esconde a API do componente e pode repassar atributos inesperados.

Declare e utilize as propriedades explicitamente.

Consulte os [exemplos de props explícitas](references/examples/components.md).

## Hooks e efeitos

- Prefira componentes funcionais.
- Crie hooks customizados com o prefixo `use`, como `useApiHealth` ou `useUsers`.
- Use `useEffect` somente para sincronizar o React com sistemas externos, como requisições, assinaturas, timers ou APIs do navegador.
- Não use `useEffect` para calcular valores derivados, responder a eventos de clique ou manter estados que podem ser obtidos diretamente de props e estado existente.

Consulte os [exemplos de hooks, efeitos e memoização](references/examples/hooks-effects.md).

## Memoização

Use `useMemo` para evitar cálculos realmente pesados entre re-renders. As dependências devem representar todos os valores usados no cálculo. Não use `useMemo` para operações simples, pois isso aumenta a complexidade sem benefício relevante.

Consulte os [exemplos de memoização](references/examples/hooks-effects.md).

## Acesso ao backend

- Separe o acesso ao backend do código visual do componente.
- Coloque chamadas HTTP e transformação de respostas em módulos próprios, como `src/lib/api/health.ts`.
- Encapsule carregamento, sucesso e erro em hooks customizados.
- O componente deve consumir o estado do hook e cuidar apenas da apresentação e das interações.

Consulte os [exemplos de acesso ao backend](references/examples/backend.md).

## Acessibilidade

- Sempre forneça propriedades de acessibilidade `aria-*` adequadas ao elemento e ao estado apresentado.
- Prefira elementos semânticos (`button`, `nav`, `main`, `section`, `form`) e complemente-os com `aria-label`, `aria-live`, `aria-busy`, `aria-expanded` ou `aria-pressed` quando aplicável.
- Controles interativos devem indicar seu estado e ter um nome acessível.
- Mensagens assíncronas, de carregamento ou erro devem ser anunciadas quando necessário.

Consulte os [exemplos de acessibilidade](references/examples/accessibility.md).

## Estilização

- Utilize Tailwind CSS para estilizar os componentes.
- Prefira classes utilitárias diretamente no JSX e variantes condicionais claras.
- Evite CSS inline e folhas de estilo específicas quando as classes Tailwind atenderem ao caso.
- Mantenha classes relacionadas ao componente próximas de sua estrutura e garanta estados de foco, hover, disabled e responsividade.

Consulte os [exemplos de estilização](references/examples/styling.md).

## Boas práticas adicionais

Aplicar também as [10 boas práticas adicionais de React](references/react-best-practices.md), especialmente pureza de componentes, regras dos Hooks, imutabilidade, chaves estáveis, modelagem de estado, compartilhamento de estado, atualizadores funcionais, limpeza de efeitos, controle de preservação de estado e uso criterioso de reducers.
