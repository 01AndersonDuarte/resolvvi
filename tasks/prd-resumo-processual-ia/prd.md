# Documento de Requisitos do Produto (PRD)

## Visão geral

Este quarto PRD adiciona à página de detalhes do processo uma seção de resumo produzido por inteligência artificial, destinada principalmente a pessoas autenticadas sem conhecimento jurídico. A partir exclusivamente das movimentações persistidas, o resumo deve explicar o que aconteceu, destacar acontecimentos relevantes e descrever a situação indicada pelos registros disponíveis, em português brasileiro e em até três parágrafos. A seção também permite avaliar se o resumo foi útil.

A importação CSV, a persistência dos dados processuais, a autenticação, a consulta CNJ, a página do processo e a visualização das movimentações são dependências existentes. O escopo desta etapa compreende geração por LLM, validação, reutilização e atualização do resumo, rastreabilidade, falhas, transparência e persistência da avaliação. A interpretação automatizada deve ser distinguida dos registros processuais e explicitar suas limitações, sem constituir decisão oficial, informação em tempo real ou aconselhamento jurídico.

## Objetivos

- **O1 — Compreensão:** em todos os cenários de aceitação com evidência suficiente, produzir um texto que cubra acontecimentos, fatos relevantes e situação indicada pela base; quando uma dessas respostas não for possível, declarar a insuficiência. Todo resumo publicado terá de um a três parágrafos e linguagem compreensível para pessoas leigas.
- **O2 — Fidelidade:** vincular 100% dos resumos publicados à versão dos dados utilizados e suas afirmações factuais às movimentações de origem. Na amostra de aceitação, não admitir fatos inventados, conclusões sem suporte, aconselhamento jurídico ou instruções maliciosas seguidas pelo modelo. Essa meta de aceitação não representa garantia de ausência de erros futuros da LLM.
- **O3 — Atualidade e economia:** reutilizar todo resumo válido para a mesma versão das movimentações e das regras de geração, sem novas chamadas ao modelo por recarga, paginação ou avaliação. Solicitações simultâneas equivalentes devem compartilhar uma única geração.
- **O4 — Recuperação:** encerrar cada tentativa em até 30 segundos com resultado válido ou estado de falha recuperável; manter os dados e as movimentações consultáveis quando apenas a funcionalidade de IA falhar.
- **O5 — Utilidade percebida:** permitir calcular a proporção de respostas “Sim” entre avaliações vigentes, acompanhada da quantidade de pares distintos de usuário e versão de resumo avaliados. Persistir 100% das avaliações confirmadas, sem meta percentual inicial de utilidade ou amostra mínima para entrega. Na ausência de votos, registrar ausência de avaliações, sem atribuir taxa de 0% ou 100%.
- **O6 — Qualidade:** proteger todas as regras novas com testes automatizados e manter cobertura global mínima de 80%, também nos aplicativos afetados, sem substituir a validação de cenários críticos pelo percentual.

As métricas mínimas são utilidade (`Sim / (Sim + Não)`), quantidade de avaliações, resultados e duração das tentativas, reutilizações, falhas por motivo e chamadas ao provedor. As avaliações devem poder ser segmentadas por versão de resumo e configuração de geração, sem dashboard nesta etapa. Ausência de voto não conta como “Não”; trocar o voto substitui seu valor no cálculo.

## Histórias de usuário

- **US1 — Entendimento:** como pessoa sem conhecimento jurídico, quero solicitar uma explicação curta do histórico para compreender o que os registros disponíveis indicam sobre meu processo.
- **US2 — Conferência:** como pessoa que acompanha o processo, quero identificar que o texto foi gerado por IA e conferir suas movimentações de origem para avaliar a interpretação recebida.
- **US3 — Limitações:** como pessoa usuária, quero ser informada sobre registros insuficientes, mudanças na base e indisponibilidade da IA para não confundir ausência de informação com uma conclusão sobre o processo.
- **US4 — Continuidade:** como pessoa usuária, quero reutilizar o resumo disponível e recuperar falhas sem perder acesso aos dados processuais.
- **US5 — Avaliação:** como pessoa autenticada, quero informar se o resumo foi útil e corrigir minha resposta para contribuir com a avaliação da qualidade.
- **US6 — Qualidade operacional:** como responsável pelo produto, quero relacionar resumos, fontes, versões de geração, falhas e avaliações para investigar problemas e medir utilidade sem expor desnecessariamente os textos processuais.

## Principais funcionalidades

### 1. Acesso e solicitação

- **RF1 — Seção de IA:** adicionar “Resumo por inteligência artificial” à página existente, após as informações gerais e antes das movimentações, com apresentação própria e acesso ao histórico original. Aplicar as permissões e o fluxo de sessão existentes a leitura, geração e avaliação.
- **RF2 — Geração sob demanda:** ao abrir a página, recuperar um resumo válido já existente. Se não houver resumo válido e houver movimentações utilizáveis, apresentar “Gerar resumo”. Abrir a página não inicia uma chamada ao modelo; o clique inicia a tentativa e mostra “Gerando resumo…”. Paginar as movimentações não altera a fonte nem dispara geração.
- **RF3 — Isolamento:** obter a fonte no sistema a partir do processo autorizado. Não aceitar como fonte um histórico fornecido pelo navegador, misturar processos ou mostrar uma resposta atrasada na página de outro processo. A geração não altera registros processuais.

### 2. Fonte, linguagem e prevenção de alucinações

- **RF4 — Fonte factual:** considerar o histórico completo disponível na base, independentemente da página de movimentações aberta. Utilizar data, título, conteúdo disponível e ordem de origem, preservando sua associação. Ordenar a análise cronologicamente, mantendo o desempate existente sem interpretá-lo como horário ou precedência jurídica. Não consultar tribunais, sites, documentos externos ou conhecimento do modelo para acrescentar fatos do caso.
- **RF5 — Conteúdo e formato:** publicar somente texto em português brasileiro, de um a três parágrafos não vazios, sem títulos internos, listas, tabelas, HTML, blocos de código ou respostas de conversa. Cobrir o que aconteceu, os acontecimentos relevantes e a situação indicada pelos registros, conforme houver suporte. O limite conta o corpo do resumo; título da seção, avisos fixos, metadados, referências e avaliação são elementos separados. Não cortar automaticamente parágrafos ou conclusões para adequar uma resposta inválida.
- **RF6 — Linguagem simples:** usar frases diretas, explicar siglas e evitar juridiquês. Quando um termo jurídico for indispensável, explicá-lo junto ao primeiro uso em linguagem comum. Não prescrever ações, calcular prazos, recomendar estratégia, prever resultado ou sugerir probabilidade de êxito. Explicações gerais de termos não podem introduzir fatos sobre o caso.
- **RF7 — Limites da interpretação:** distinguir registro de um evento de conclusão sobre seu resultado. Por exemplo, um título que mencione sentença, sem conteúdo que descreva o resultado, não sustenta dizer quem ganhou. A ausência de novos eventos não sustenta encerramento. Relatar a situação como indicada pelos dados disponíveis, sem afirmar atualização junto ao tribunal. Não resolver contradições por suposição; descrevê-las e declarar o que não é possível concluir.
- **RF8 — Evidência por afirmação:** toda afirmação factual deve possuir associação verificável às movimentações que a sustentam; todas as referências precisam pertencer ao processo e à versão de fonte utilizada. Disponibilizar referências de apoio fora do corpo, identificadas por data e título, para conferência manual no histórico existente, inclusive por sua paginação. Não haverá navegação automática, expansão ou foco em um evento citado nesta etapa. Uma referência existente, sozinha, não comprova que a interpretação está correta: exigir também avaliação de fidelidade nos cenários de aceitação.
- **RF9 — Pouca informação:** um ou poucos eventos não impedem geração se houver conteúdo informativo no título ou texto. Resumir apenas o que está sustentado e declarar a insuficiência para determinar a situação geral, quando aplicável. Título sem conteúdo complementar continua sendo fonte válida limitada. Se não houver nenhum título ou conteúdo informativo, apresentar estado de dados insuficientes sem chamar a LLM. Não estabelecer um número mínimo arbitrário de movimentações como medida de qualidade.
- **RF10 — Entrada não confiável:** instruções, links, scripts e pedidos contidos nas movimentações são dados do processo, nunca comandos para a geração. Não segui-los, buscar seus destinos ou expor segredos. Tratar a saída como texto, sem execução de marcação. As instruções ao modelo devem exigir fonte exclusiva, formato, linguagem simples, evidências, explicitação de incerteza e ausência de aconselhamento; seu texto técnico definitivo pertence à TechSpec.
- **RF11 — Validação antes da publicação:** aceitar apenas resposta completa, não vazia, no formato e limite definidos, com referências válidas e sem violação detectada das regras de conteúdo. Resposta truncada, recusa do provedor, falta de evidências ou falha de validação produz estado de falha, nunca texto publicado parcialmente. A TechSpec definirá mecanismos e limites da validação sem presumir que validação estrutural garante fidelidade semântica.

### 3. Contexto, reutilização e atualização

- **RF12 — Limite de contexto:** avaliar o histórico completo em relação ao limite do modelo configurado, incluindo espaço necessário às instruções, referências e resposta. Se exceder esse limite, não chamar o modelo nem selecionar ou cortar silenciosamente eventos. Exibir “Este histórico excede o limite disponível para gerar um resumo completo. Consulte as movimentações”. Essa é a estratégia de fallback desta etapa, inclusive para um único evento muito extenso; resumo parcial ou geração por múltiplas etapas ficam fora do escopo.
- **RF13 — Persistência e reutilização:** persistir o resumo validado e reutilizá-lo entre pessoas com acesso ao mesmo processo enquanto fonte e versão das regras de geração forem compatíveis. O resumo é comum ao processo; a avaliação é individual. Não expirar apenas por passagem do tempo nem gerar outro texto para satisfazer voto negativo. Uma falha de provedor não impede leitura de resumo válido já armazenado.
- **RF14 — Invalidação:** considerar relevante qualquer inclusão, remoção ou alteração de data, título, conteúdo, vínculo ou ordem de movimentação que componha a fonte, mesmo fora da página visível. Antes de reutilizar ou publicar, conferir a versão atual. Se ela mudou, retirar o texto anterior da apresentação como resumo atual e oferecer “Atualizar resumo”. A nova geração depende do clique e não cria um fluxo de edição ou importação de movimentações.
- **RF15 — Concorrência e mudanças durante geração:** permitir no máximo uma tentativa ativa por processo e versão da fonte e das regras, compartilhada por solicitações equivalentes. Cliques repetidos, abas e usuários concorrentes não multiplicam chamadas. Se a fonte mudar durante a tentativa, não publicar seu resultado como atual; informar a mudança e oferecer nova tentativa para a versão atual. Resposta recebida após timeout não pode substituir o estado por sucesso nem tornar-se o resumo atual.
- **RF16 — Versionamento:** uma nova geração aceita cria uma versão própria de resumo. Alterações incompatíveis das regras de geração invalidam a reutilização; mera troca operacional de fornecedor não exige regenerar textos válidos, salvo mudança explícita dessa versão de regras. Preservar a associação dos votos e evidências às versões originais. Versões substituídas não serão exibidas como resumo atual nem receberão novos votos.

### 4. Integração com LLM, erros e fallback

- **RF17 — Provedor substituível:** tratar a LLM como dependência substituível, sem fixar fornecedor ou modelo no requisito de produto. O provedor escolhido precisa permitir geração em português, limite de contexto conhecido, prazo de resposta controlável e identificação da configuração utilizada. Credenciais e acesso ao provedor ficam protegidos no servidor.
- **RF18 — Prazo e chamadas:** cada tentativa admite no máximo uma chamada de geração ao provedor e deve encerrar em até 30 segundos, incluindo preparação, geração, validação e persistência. Não haverá repetição automática para corrigir formato ou falhas. Nova tentativa após falha depende de ação explícita e respeita um intervalo mínimo de 30 segundos desde o início da tentativa anterior para o mesmo processo e versão, além de eventual prazo maior informado pelo provedor. O limite deve valer também fora da interface.
- **RF19 — Falhas isoladas:** distinguir ausência de dados, limite de contexto, indisponibilidade, limite de uso do provedor, timeout, erro de geração, resposta inválida e erro de persistência. Exibir mensagens compreensíveis sem detalhes internos. Nenhuma falha de IA deve bloquear informações gerais ou movimentações já disponíveis. Não produzir um texto substituto que aparente ser resumo gerado com sucesso.
- **RF20 — Recuperação:** oferecer “Tentar novamente” para falhas transitórias e explicar a espera quando aplicável. Não oferecer repetição idêntica para histórico sem dados ou excesso de contexto enquanto a condição persistir. Falha ao consultar resumo persistido não deve ser interpretada como ausência de resumo nem iniciar nova geração. Publicar sucesso somente após persistência confirmada; em falha de persistência, não exibir texto como versão avaliável.

| Condição | Resultado observável | Chamada à LLM e recuperação |
| --- | --- | --- |
| Zero movimentações | “Não há movimentações disponíveis para gerar um resumo”. | Nenhuma chamada e nenhuma avaliação. |
| Registros sem texto informativo | “As informações disponíveis são insuficientes para gerar um resumo”. | Nenhuma chamada; manter acesso aos registros. |
| Poucos eventos informativos | Resumo restrito aos fatos disponíveis, com ressalva quando necessária. | Uma chamada, se couber no contexto. |
| Histórico acima do contexto | Aviso de limite de resumo completo e acesso às movimentações. | Nenhuma chamada; reavaliar se fonte ou capacidade configurada mudar. |
| Provedor indisponível ou erro de geração | “Não foi possível gerar o resumo agora”. | Encerrar e permitir nova tentativa conforme RF18. |
| Limite de uso do provedor | Aviso de indisponibilidade temporária e espera. | Respeitar prazo do provedor e RF18. |
| Prazo de 30 segundos excedido | “A geração demorou mais que o esperado. Tente novamente”. | Encerrar sem publicação posterior da resposta atrasada. |
| Resposta fora das regras, incompleta ou recusada | “Não foi possível gerar um resumo válido”. | Sem publicação ou reparo automático; nova tentativa explícita. |
| Falha ao salvar o resumo | “Não foi possível salvar o resumo. Tente novamente”. | Sem versão avaliável; nova tentativa com regras de concorrência. |
| Falha ao recuperar resumo existente | “Não foi possível carregar o resumo”. | Repetir a leitura, sem chamar a LLM. |
| Fonte alterada durante geração | “As movimentações mudaram. Gere um resumo atualizado”. | Não publicar resultado da fonte antiga. |

### 5. Avaliação e persistência

- **RF21 — Elegibilidade:** exibir “Este resumo foi útil?” com “Sim” e “Não” apenas para um resumo válido, persistido, atual e apresentado à pessoa autenticada. Não aceitar voto para estado vazio, geração pendente, falha, versão substituída ou resumo de outro processo informado na solicitação. Verificar sessão, acesso, vínculo e versão também no servidor. A apresentação prévia é uma condição da interface; o servidor não exige comprovante de entrega nem atesta que a pessoa leu o resumo.
- **RF22 — Unicidade e alteração:** manter uma avaliação vigente por usuário e versão de resumo. Repetir o mesmo voto não cria duplicata; escolher a opção oposta atualiza o voto existente. Durante o envio, impedir comandos concorrentes na mesma interface. Requisições concorrentes para o mesmo par devem manter uma única avaliação e retornar seu estado persistido; em abas diferentes, prevalece a última gravação concluída. Uma nova versão começa sem voto desse usuário, preservando o voto anterior em sua versão original.
- **RF23 — Feedback e falha:** após confirmação de persistência, destacar a opção vigente e mostrar “Avaliação registrada”. Ao trocar, mostrar “Avaliação atualizada”. Enquanto salva, indicar envio. Em falha, manter o último voto confirmado ou o estado sem voto e oferecer nova tentativa; não confirmar sucesso antes da gravação. Recarregar a página recupera o voto vigente. Votos de outras pessoas não são expostos.
- **RF24 — Dados do resumo:** persistir identificação e versão do resumo, processo, corpo aprovado, data e hora de geração, versão das regras, fornecedor e modelo/configuração, identificação da tentativa e vínculo com a versão exata da fonte. Registrar quais movimentos e versões de seus conteúdos foram usados e quais sustentam cada afirmação factual, mantendo evidência recuperável mesmo depois de mudanças. Identificadores de registros mutáveis, sozinhos, não atendem à rastreabilidade; a representação será definida na TechSpec.
- **RF25 — Dados da avaliação:** persistir resumo e versão avaliados, identificador interno do usuário, valor “Sim” ou “Não”, data e hora de criação e última alteração. Usar o vínculo com o resumo para analisar processo e configuração de geração, sem copiar texto processual, e-mail ou outros dados pessoais para o voto. Histórico de cada troca de voto e campo de comentário não são necessários nesta etapa.
- **RF26 — Integridade:** manter versões, evidências e votos associados de forma consistente, sem migrar avaliações para textos novos nem sobrescrever um texto já avaliado. Operações inválidas ou falhas não podem deixar votos órfãos, resumos marcados como sucesso sem corpo válido ou múltiplos resumos atuais equivalentes. Manter esses registros na persistência da aplicação entre recargas e reinícios; cache volátil pode complementar a leitura, mas não substituir essa persistência.

### 6. Transparência e observabilidade

- **RF27 — Avisos:** exibir junto ao texto, de forma permanente: “Resumo gerado por inteligência artificial a partir das movimentações disponíveis. Pode conter erros; não é uma decisão oficial nem orientação jurídica”. Preservar o aviso existente sobre base importada sem atualização automática no tribunal. Mostrar data e hora de geração, sem apresentá-las como atualização do processo; informar a quantidade de movimentações consideradas e oferecer conferência das referências.
- **RF28 — Observabilidade mínima:** registrar tentativa e resultado, duração, motivo de falha ou rejeição, reutilização, concorrência evitada, invalidação, configuração de geração e contagem de chamadas. Associar eventos a identificadores internos de processo, versão e tentativa. Registrar consumo informado pelo provedor, quando disponível, sem inventar tokens ou custos ausentes. Permitir calcular as métricas de O3–O5 com registros operacionais e persistência, sem dashboard, serviço analítico ou envio de textos a ferramentas externas de observabilidade.
- **RF29 — Proteção dos registros:** não registrar corpos de movimentações, prompts completos, respostas brutas, senhas, cookies, tokens ou chaves do provedor em logs. Evidências processuais persistidas para rastreabilidade devem seguir a proteção de acesso da aplicação. Falhas externas devem ser categorizadas e sanitizadas antes de aparecerem em logs ou respostas.

## Critérios de aceitação

- **CA-01 — Solicitação (US1, US4; RF1–RF3):** dada uma página sem resumo e com fonte utilizável, quando aberta, então mostra “Gerar resumo” sem chamada à LLM; quando acionado, então indica geração e mantém os dados processuais acessíveis.
- **CA-02 — Fidelidade e formato (US1, US2; RF4–RF8, RF11):** dado histórico com fatos e resultado expressos, quando um resumo válido for publicado, então possui um a três parágrafos em português simples, cobre acontecimentos e situação sustentada e permite conferir as evidências de cada afirmação factual, sem novos fatos ou aconselhamento.
- **CA-03 — Conclusão insuficiente (US1, US3; RF6, RF7, RF9):** dados poucos eventos, título de sentença sem resultado, ausência de eventos recentes ou registros contraditórios, quando gerado o resumo, então não afirma vencedor, encerramento ou resolução de contradição sem evidência e explicita as limitações pertinentes.
- **CA-04 — Sem fonte utilizável (US3; RF9, RF19):** dados zero eventos ou eventos sem qualquer texto informativo, quando a seção carregar, então exibe a mensagem correspondente sem chamar a LLM ou habilitar avaliação; um evento com título informativo e conteúdo vazio permite solicitação.
- **CA-05 — Fonte integral (US1, US2; RF4, RF12):** dado histórico distribuído em várias páginas e dentro do contexto, quando solicitado o resumo, então considera todo o histórico, inclusive fatos fora da página aberta, respeitando datas e empates sem inferir horário.
- **CA-06 — Contexto excedido (US3, US4; RF12):** dados históricos exatamente dentro e acima da capacidade efetiva configurada, incluindo evento único extenso, quando solicitada a geração, então o primeiro permite chamada e o segundo apresenta o fallback sem chamada, omissão ou truncamento silencioso.
- **CA-07 — Entrada maliciosa (US2; RF10, RF29):** dados movimentos com instruções para inventar fatos, revelar segredos, executar HTML ou abrir links, quando processados, então tais instruções não são seguidas, recursos externos não são acessados e nenhum conteúdo executável ou segredo é exibido.
- **CA-08 — Saída inválida (US1, US3; RF5, RF8, RF11):** dadas saídas vazias, com quatro parágrafos, listas, HTML, idioma incorreto, recusa, truncamento, referência inexistente, referência de outro processo ou conteúdo proibido detectado, quando validadas, então não são publicadas ou avaliáveis e a interface informa falha sem segunda chamada automática.
- **CA-09 — Reutilização (US4; RF2, RF13):** dado resumo válido persistido, quando houver recarga, outro usuário autorizado, paginação, voto ou indisponibilidade do provedor, então o mesmo texto e versão permanecem disponíveis sem nova chamada ao modelo.
- **CA-10 — Alteração da fonte (US3; RF14, RF16):** dado resumo existente, quando qualquer evento for incluído, removido ou tiver campo relevante alterado, mesmo fora da página visível, então a próxima consulta identifica invalidação e oferece atualização por clique; a nova versão não herda votos.
- **CA-11 — Corrida e resposta atrasada (US3, US4; RF3, RF15):** dadas solicitações simultâneas equivalentes, quando processadas, então iniciam no máximo uma geração; se houver troca de processo, alteração da fonte ou timeout, nenhuma resposta antiga é mostrada como resumo atual indevidamente.
- **CA-12 — Substituição de provedor (US6; RF16, RF17):** dada uma integração alternativa controlada, quando selecionada, então preserva os requisitos de produto sem depender de marca específica; trocar fornecedor não regenera resumos válidos salvo invalidação explícita das regras.
- **CA-13 — Falhas e prazo (US3, US4; RF18–RF20):** dados timeout, indisponibilidade, limite de uso ou erro de geração, quando ocorrerem, então a tentativa termina em até 30 segundos com erro compreensível e recuperação adequada; dados processuais continuam disponíveis e o intervalo de repetição é aplicado no servidor.
- **CA-14 — Persistência falha (US4, US5; RF20, RF26):** dada falha ao carregar um resumo, quando ocorrer, então a recuperação repete a leitura sem gerar; dada falha ao salvar, então não há sucesso aparente, versão avaliável ou registros parciais inconsistentes.
- **CA-15 — Voto e troca (US5; RF21–RF23, RF25):** dado resumo atual apresentado, quando o usuário votar, repetir e depois trocar o voto, então existe uma avaliação com o último valor confirmado; recarga recupera esse valor e a interface informa o sucesso correspondente.
- **CA-16 — Voto inválido e concorrência (US5; RF21, RF22, RF26):** dados resumo ausente, substituído, de outro processo, sessão inválida ou requisições concorrentes, quando enviado voto, então os casos inválidos são rejeitados e os válidos mantêm uma única avaliação por par, sem sobrescrever a de outro usuário.
- **CA-17 — Falha ao avaliar (US5; RF23):** dado voto pendente, quando a gravação falhar, então não aparece confirmação de sucesso, o último estado confirmado permanece e uma nova tentativa pode concluir sem duplicação.
- **CA-18 — Rastreabilidade (US2, US6; RF8, RF24–RF26):** dado resumo substituído após mudança de conteúdo da fonte, quando inspecionados seus registros, então texto original, versão da fonte, evidências, configuração e avaliações permanecem associados corretamente, sem exigir histórico de versões na interface.
- **CA-19 — Transparência (US1–US3; RF1, RF27):** dado resumo disponível, quando exibido, então o usuário identifica sua origem automatizada, limitações, data de geração, quantidade de eventos e referências por frase, com data e título, separadamente das movimentações originais e dos avisos de atualização da base; a conferência no histórico é manual.
- **CA-20 — Sessão e isolamento (US2, US5; RF1, RF3, RF21, RF29):** dada sessão ausente ou expirada, quando solicitado resumo, geração ou avaliação, então nenhum dado protegido é entregue nem chamada à LLM é iniciada; a interface segue o fluxo existente e não mistura dados entre processos ou usuários.
- **CA-21 — Observabilidade e métricas (US6; RF25, RF28, RF29):** dados sucessos, reutilizações, rejeições, falhas e votos alterados, quando inspecionados registros controlados, então é possível calcular as métricas com denominadores corretos, correlacionar tentativas e diagnosticar motivos sem conteúdo processual ou segredos em logs.
- **CA-22 — Acessibilidade (US1, US4, US5; RF1, RF23, RF27):** dada a seção em celular, desktop e zoom de 200%, quando operada por teclado, então é possível gerar, recuperar, ler referências, navegar manualmente pelo histórico e avaliar, com foco visível, rótulos semânticos, estados distinguíveis sem depender de cor e sem cortes de texto ou controles.
- **CA-23 — Qualidade e regressão (US1–US6; RF1–RF29):** dada a implementação concluída, quando executadas as suítes e verificações exigidas, então todas passam, cada regra nova possui cenário automatizado, a cobertura mínima de 80% é mantida e os fluxos anteriores de consulta e histórico permanecem funcionais.

## Experiência do usuário

### Jornada e apresentação

1. A pessoa autenticada encontra ou abre um processo pelo fluxo existente e acessa suas informações gerais.
2. Na seção identificada como IA, lê um resumo válido já disponível ou aciona “Gerar resumo”. Se os dados tiverem mudado, encontra “Atualizar resumo”.
3. Durante a tentativa, vê o estado de geração e pode continuar lendo as movimentações. O controle não permite disparos repetidos.
4. Em sucesso, lê até três parágrafos, os avisos de interpretação automatizada e os metadados; pode conferir manualmente os eventos citados no histórico existente usando data, título e paginação, sem perder a identidade do processo.
5. Responde “Sim” ou “Não” à pergunta de utilidade. Após gravação, vê confirmação e pode trocar a resposta.
6. Em falha ou limitação, recebe a mensagem correspondente e a ação de recuperação disponível. A seção não apresenta erro de IA como ausência de movimentações.

O público principal precisa de linguagem simples e explicação de incerteza. Pessoas que desejam conferir a interpretação precisam acessar as referências e os textos originais. O responsável pelo produto utiliza os registros existentes para avaliação futura, sem interface administrativa nova.

### Estados e acessibilidade

Estados distintos: carregando resumo armazenado, disponível para gerar, gerando, resumo válido, atualização necessária, sem movimentos, dados insuficientes, contexto excedido, falha recuperável e espera para nova tentativa. Na avaliação: sem voto, enviando, voto confirmado e falha com preservação do estado anterior. Nenhum estado transitório deve parecer uma conclusão sobre a situação jurídica.

Usar títulos e controles semânticos, rótulos em português brasileiro, foco visível e operação por teclado. “Sim” e “Não” devem estar associados à pergunta e expor a opção selecionada semanticamente. Mensagens e seleção precisam de indicação textual, além de cor. Adaptar textos e controles a celular e desktop e permitir zoom de 200%, seguindo a interface existente. A IA não deve ser apresentada com selo de tribunal, aparência de decisão oficial ou promessa de exatidão.

A opção por frases diretas e explicação de termos é coerente com a referência de linguagem acessível do [Pacto Nacional do Judiciário pela Linguagem Simples, do CNJ](https://www.cnj.jus.br/gestao-da-justica/acessibilidade-e-inclusao/pacto-nacional-do-judiciario-pela-linguagem-simples/). Essa referência orienta a redação; não implica certificação ou vínculo institucional do produto.

### Premissas registradas

- Simplificação aprovada no planejamento: cinco tarefas; avaliação sem comprovante HMAC de apresentação, referências com consulta manual ao histórico e adiamento da coordenação de capacidade global entre instâncias. A implantação inicial deve operar com uma única instância executora de IA, com limite local de quatro execuções. Antes de operar múltiplas instâncias executoras, implementar a coordenação global; deduplicação por processo/versão e cooldown permanecem persistidos no banco.

- O prompt define objetivo, público, fonte, limite de três parágrafos, avaliação binária, escopo e meta de cobertura. Este documento mantém a estrutura do template da skill, distribuindo os 19 tópicos solicitados entre suas seções.
- O usuário confirmou geração por clique com reutilização enquanto as movimentações não mudarem, avaliação por usuário e versão com possibilidade de alteração e prazo de 30 segundos por tentativa. Também definiu que a utilidade será apenas medida, sem meta percentual inicial. Não há quantidade mínima de votos para entrega.
- O fallback para contexto excedido é não gerar um resumo incompleto. A seleção de fornecedor deverá buscar capacidade adequada ao histórico real; nenhuma quantidade fixa de eventos garante caber no modelo, pois os textos têm tamanhos diferentes.
- Reutilização compartilhada, invalidação conservadora por qualquer alteração na fonte, uma chamada por tentativa e intervalo mínimo de repetição são decisões de escopo para reduzir custo e inconsistências.
- Reutilizar o nível de acessibilidade da página existente. Não foram acordados orçamento monetário, SLA de disponibilidade externa ou volume de usuários simultâneos; a TechSpec deverá registrar os limites operacionais escolhidos sem apresentá-los como metas já aprovadas.

## Restrições técnicas de alto nível

### Dependências, integração e privacidade

- Reutilizar a fonte e os vínculos definidos no [PRD de domínio e ingestão CSV](../prd-fundacao-dominio-ingestao-csv/prd.md), a proteção do [PRD de autenticação e consulta CNJ](../prd-autenticacao-consulta-cnj/prd.md) e a página do [PRD de detalhes do processo](../prd-detalhes-processo/prd.md).
- A geração de interpretação e a integração externa de LLM são a extensão desta quarta etapa. Os limites da terceira etapa que excluíam IA aplicavam-se àquela entrega; a apresentação dos dados originais continua submetida às regras existentes.
- Preservar frontend e backend independentes e os padrões do projeto. Arquitetura, contratos HTTP, modelos de persistência, seleção técnica do fornecedor, algoritmo de versionamento, mecanismos de coordenação e prompt definitivo pertencem à TechSpec.
- Enviar ao provedor somente dados necessários das movimentações, sem credenciais, dados da conta ou identificadores pessoais adicionais. Não inferir publicidade ou sigilo a partir do CSV. Registrar na escolha da integração como o provedor trata retenção e uso dos dados; não autorizar uso dos textos para treinamento como parte desta funcionalidade.
- O serviço externo precisa ser substituível e oferecer limites de contexto e uso conhecidos. O sistema deve impedir chamadas desnecessárias conforme RF12–RF18 e proteger suas credenciais.
- Identificação de fonte, validade e conteúdo persistido devem sobreviver a reinícios. O prazo máximo de 30 segundos refere-se à tentativa completa controlada pela aplicação; falhas de rede do cliente também precisam encerrar o estado de espera. A TechSpec definirá como cumprir o orçamento entre as etapas.

### Requisitos de testes

- Seguir [as regras de testes do projeto](../../.agents/rules/tests.md), com princípios FIRST, assertions de comportamento e a pirâmide de testes. Usar Vitest para unidade e integração e Playwright para os E2E críticos em `e2e/`.
- Associar RF1–RF29 e CA-01–CA-23 a cenários automatizados. Testar elegibilidade, fontes vazias e escassas, formato de um/três/quatro parágrafos, respostas vazias e truncadas, referências, instruções maliciosas, invalidação, voto, troca, idempotência, recuperação e proteção de sessão.
- Exercitar integração com LLM por mocks, fakes ou stubs controlados: sucesso, recusa, retorno malformado, indisponibilidade, limite de uso, timeout, resposta tardia, contexto no limite e acima, e substituição do provedor. Testes comuns não devem exigir credenciais, rede externa ou chamadas reais cobradas.
- Validar persistência com banco isolado: reuso após reinício, vínculo e unicidade de voto, versões antigas, evidências recuperáveis após mudança de fonte, concorrência e falhas de gravação. Controlar relógio e respostas externas para testar o prazo de 30 segundos e intervalos sem esperas reais.
- Testar no frontend a apresentação dos estados, falha ao recuperar resumo sem geração indevida, respostas atrasadas ao trocar de processo, confirmação de voto somente após sucesso e preservação do último estado confirmado.
- Cobrir em poucos E2E os fluxos consulta → página → gerar → conferir → avaliar → alterar voto → recarregar, reutilização sem nova chamada, atualização após mudança da fonte e recuperação de falha. Incluir teclado, semântica, responsividade e zoom.
- Manter conjunto versionado de históricos e respostas de referência com fatos permitidos, conclusões proibidas e evidências esperadas. Incluir títulos sem conteúdo, eventos contraditórios, empates de data e fatos relevantes fora da página visível. Automatizar a regressão desses casos sem comparação rígida de toda a redação.
- Distinguir validação determinística de formato, referências e estados da avaliação semântica da LLM. Antes da entrega, revisar uma amostra de 20 resumos produzidos pela configuração escolhida, ou todos os casos elegíveis se houver menos de 20, incluindo as situações de ambiguidade acima. Todos devem cumprir a rubrica de fidelidade, ausência de conselho e linguagem simples. Eventuais chamadas reais dessa avaliação são explícitas e separadas da suíte comum; seus resultados preservados alimentam fixtures de regressão. Mocks não comprovam, sozinhos, a qualidade do modelo real.
- Executar testes, cobertura, builds e verificações de lint e tipos exigidas pelo repositório nos aplicativos afetados. A cobertura deve falhar abaixo de 80%; nenhuma regra crítica pode ficar descoberta mesmo com a meta global atingida.

### Definição de pronto

- RF1–RF29 implementados e CA-01–CA-23 verificados com evidências, mantendo o escopo das etapas anteriores.
- Integração substituível funcional, limites operacionais documentados e geração restrita à fonte, com validação anterior à publicação.
- Reutilização, invalidação, concorrência, timeout e demais fallbacks demonstrados sem resumo parcial apresentado como completo.
- Resumos, evidências e avaliações persistidos e rastreáveis; alterações de voto e versão preservam a integridade.
- Transparência, português simples, operação por teclado, responsividade e estados de erro validados; amostra semântica aprovada conforme a rubrica.
- Observabilidade permite inspecionar tentativas e calcular métricas sem expor conteúdo processual ou segredos; ausência de votos de produção não impede a entrega.
- Suítes, cobertura mínima de 80%, builds e verificações exigidas aprovados, com fluxos anteriores preservados.

Este PRD é a entrega documental. Implementação, avaliação da integração real e execução dos testes de produto pertencem às próximas etapas.

## Fora do escopo

- Comprovante criptográfico de entrega do resumo, endpoint de localização de referência, salto/expansão/foco automático em movimentação citada e coordenação de capacidade global entre instâncias nesta entrega.

- Reimplementar importação, banco de processos, autenticação, consulta CNJ, página de detalhes ou navegação do histórico.
- Consultar tribunais, fazer scraping, atualizar automaticamente a fonte, buscar documentos mencionados ou enriquecer fatos com fontes externas.
- Criar chat jurídico, perguntas livres, orientação jurídica, cálculo de prazos, prognóstico, recomendações de ação ou novos campos oficiais de situação do processo.
- Alterar textos originais, corrigir registros, editar resumos manualmente, personalizá-los por usuário, exportar ou compartilhar resumos.
- Resumir apenas parte do histórico, decompor geração em múltiplas etapas, selecionar trechos silenciosamente ou implantar troca automática de fornecedor durante falhas.
- Criar botão de regeneração arbitrária de resumo válido, geração em lote ou agendada, notificações e atualização automática em tempo real enquanto a página permanece aberta.
- Criar comentários de avaliação, histórico de cada troca de voto, dashboard, relatórios analíticos, moderação ou interface administrativa de versões.
- Treinar ou ajustar modelos com os dados, definir um fornecedor obrigatório, escrever o prompt técnico definitivo, arquitetura, código ou tarefas de implementação neste documento.
