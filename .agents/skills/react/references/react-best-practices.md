# 10 boas práticas adicionais de React

Estas práticas complementam as regras originais da skill. Foram consolidadas a partir da documentação oficial do React, consultada em 2 de agosto de 2026.

## Índice

1. [Manter componentes e Hooks puros](#1-manter-componentes-e-hooks-puros)
2. [Seguir as Rules of Hooks](#2-seguir-as-rules-of-hooks)
3. [Tratar props e estado como imutáveis](#3-tratar-props-e-estado-como-imutáveis)
4. [Usar chaves estáveis em listas](#4-usar-chaves-estáveis-em-listas)
5. [Modelar o estado sem redundância](#5-modelar-o-estado-sem-redundância)
6. [Manter uma única fonte de verdade](#6-manter-uma-única-fonte-de-verdade)
7. [Usar atualizadores funcionais quando necessário](#7-usar-atualizadores-funcionais-quando-necessário)
8. [Limpar efeitos e proteger requisições assíncronas](#8-limpar-efeitos-e-proteger-requisições-assíncronas)
9. [Controlar conscientemente a preservação do estado](#9-controlar-conscientemente-a-preservação-do-estado)
10. [Extrair lógica complexa para reducers puros](#10-extrair-lógica-complexa-para-reducers-puros)

## 1. Manter componentes e Hooks puros

Faça componentes e Hooks serem idempotentes: com as mesmas entradas, produza o mesmo resultado. Não execute efeitos colaterais durante a renderização nem altere valores não locais. Coloque mutações e efeitos em handlers de eventos ou Effects, conforme a causa da operação.

Fonte: [Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure).

## 2. Seguir as Rules of Hooks

Chame Hooks somente no nível superior de componentes funcionais ou de Hooks customizados. Não os chame dentro de condições, loops, funções aninhadas, handlers, `try`/`catch`/`finally` ou depois de um retorno condicional. Mantenha o `eslint-plugin-react-hooks` habilitado para detectar violações.

Fonte: [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).

## 3. Tratar props e estado como imutáveis

Não altere diretamente props, estado ou objetos e arrays armazenados no estado. Crie uma nova referência e passe-a ao setter. Para estruturas aninhadas, copie cada nível necessário até o valor alterado.

Fonte: [Updating Objects in State](https://react.dev/learn/updating-objects-in-state) e [Updating Arrays in State](https://pt-br.react.dev/learn/updating-arrays-in-state).

## 4. Usar chaves estáveis em listas

Ao renderizar listas, use uma `key` estável e única derivada da identidade do item. Evite índices do array quando a lista puder ser reordenada, inserida ou removida, e nunca gere chaves durante a renderização com `Math.random()` ou valores equivalentes. Não espere receber `key` como prop: passe outro nome de prop quando o componente também precisar do identificador.

Fonte: [Rendering Lists](https://react.dev/learn/rendering-lists).

## 5. Modelar o estado sem redundância

Mantenha no estado apenas os dados que precisam ser lembrados entre renderizações. Evite estado derivado, contraditório ou duplicado; calcule informações a partir de props e do estado existente durante a renderização. Prefira estruturas rasas quando isso tornar as atualizações mais claras.

Fonte: [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure).

## 6. Manter uma única fonte de verdade

Quando componentes precisam coordenar o mesmo dado, mantenha o estado no ancestral comum mais próximo e passe valor e handlers por props. Para cada informação, defina um único componente proprietário. Use componentes controlados quando o pai precisar determinar o comportamento do filho.

Fonte: [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components).

## 7. Usar atualizadores funcionais quando necessário

Quando o próximo estado depender do estado anterior, use a forma funcional do setter, como `setCount((count) => count + 1)`. Isso é especialmente importante quando várias atualizações são enfileiradas no mesmo evento ou quando uma atualização ocorre de forma assíncrona.

Fonte: [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates).

## 8. Limpar efeitos e proteger requisições assíncronas

Todo Effect que cria uma assinatura, timer, conexão ou outro recurso externo deve retornar uma limpeza que desfaça essa configuração. Em requisições assíncronas iniciadas manualmente, aborte a requisição ou ignore resultados obsoletos para evitar condições de corrida e atualizações de estado de uma operação anterior.

Fonte: [useEffect](https://react.dev/reference/react/useEffect) e [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects).

## 9. Controlar conscientemente a preservação do estado

Lembre que React associa estado à posição de um componente na árvore de renderização. Preserve o estado mantendo a identidade estrutural; quando uma troca representar uma entidade diferente e exigir reinicialização, forneça uma `key` diferente para a subárvore apropriada.

Fonte: [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state).

## 10. Extrair lógica complexa para reducers puros

Quando muitos handlers atualizam o mesmo estado complexo, centralize as transições em uma função reducer pura e use `useReducer`. Faça cada ação representar uma interação ou evento significativo, mantenha efeitos fora do reducer e retorne novos objetos ou arrays sem mutação.

Fonte: [Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer).
