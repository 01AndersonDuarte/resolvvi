# Documento de Requisitos do Produto (PRD)

## Visão geral

Este terceiro PRD define a página de detalhes de um processo judicial para pessoas autenticadas que já localizaram um processo pela consulta CNJ. A página deve permitir identificar o processo, compreender suas informações gerais e percorrer suas movimentações em uma sequência temporal clara. A entrega amplia a página mínima existente, utilizando exclusivamente os dados da base previamente importada de `lawsuits_movements.csv`.

A fundação de dados, a autenticação, a página inicial, a busca CNJ, a localização do processo e a navegação até sua página são consideradas implementadas e constituem dependências. O escopo desta etapa é a apresentação dos detalhes e do histórico, incluindo navegação pelo histórico, estados de interface e recuperação de falhas. A organização conceitual parte da consulta processual TJSP/e-SAJ, com linguagem de interface simples e hierarquia entre identificação, informações gerais e movimentações, sem copiar sua apresentação visual.

## Objetivos

- **O1 — Identificação e fidelidade:** disponibilizar os cinco campos processuais existentes para os 100 processos da versão analisada, com valores correspondentes à base importada e nenhum campo processual inventado.
- **O2 — Histórico completo:** tornar acessíveis as 5.568 movimentações existentes, exclusivamente no processo ao qual pertencem, sem perda de conteúdo, omissões ou duplicações introduzidas pela navegação.
- **O3 — Cronologia consistente:** ordenar 100% dos eventos com data válida da mais recente para a mais antiga, preservando a ordem de origem quando houver empate de data.
- **O4 — Leitura e navegação:** apresentar até 20 movimentações por página e permitir acessar todo o histórico, inclusive o maior histórico real, de 120 eventos, e um cenário de teste com 1.000 eventos.
- **O5 — Acesso e recuperação:** permitir operação dos controles por teclado e leitura em celular e desktop, inclusive com zoom de 200% do navegador, e oferecer uma saída ou recuperação para cada estado de erro especificado.
- **O6 — Qualidade:** proteger todas as regras e comportamentos novos com testes automatizados; manter cobertura mínima global de 80% e o mínimo de 80% em cada aplicativo afetado, conforme as regras do projeto.

Os critérios de sucesso desta etapa são de completude, fidelidade, usabilidade verificável e qualidade. Não há meta de conversão, retenção ou implantação de analytics nesta entrega.

## Histórias de usuário

- **US1 — Identificação:** como pessoa autenticada que encontrou um processo, quero ver seu CNJ em destaque para confirmar qual processo estou consultando.
- **US2 — Informações gerais:** como pessoa sem conhecimento jurídico especializado, quero consultar foro, vara, valor da ação e quantidade de autores com rótulos claros para entender os dados disponíveis.
- **US3 — Histórico:** como pessoa que acompanha um processo, quero ler data, título e conteúdo das movimentações em ordem temporal para compreender a sequência dos eventos registrados.
- **US4 — Histórico extenso:** como pessoa que consulta um processo com muitos eventos, quero navegar pelo histórico em partes e abrir textos extensos para encontrar e ler qualquer movimentação.
- **US5 — Dados incompletos:** como pessoa usuária, quero distinguir ausência de informações de falha de carregamento para não interpretar um campo vazio como inexistência de eventos.
- **US6 — Continuidade:** como pessoa usuária, quero abrir ou recarregar o endereço do processo, recuperar falhas temporárias e voltar à consulta existente para continuar minha navegação.

## Principais funcionalidades

### 1. Base factual e regras de exibição

Foram analisados o CSV real, o modelo persistido e as regras da carga inicial. O arquivo tem oito colunas, 5.568 registros lógicos e 100 CNJs distintos. Cada processo possui entre 6 e 120 movimentações. Os dados gerais repetidos entre linhas do mesmo processo são consistentes nesta versão.

| Origem no CSV | Apresentação | Regra de exibição |
| --- | --- | --- |
| `lawsuit_number` | Número do processo (CNJ) | Preservar o identificador textual, os zeros e a pontuação da base. |
| `lawsuit_forum` | Foro | Exibir o texto fornecido, sem abreviação que suprima informação. |
| `lawsuit_court` | Vara | Exibir o texto fornecido, sem inferir órgão adicional. |
| `lawsuit_value` | Valor da ação | Exibir o valor numérico em formato brasileiro, com duas casas decimais para os valores deste dataset; não atribuir moeda, correção monetária ou valor atualizado. |
| `lawsuit_number_of_authors` | Quantidade de autores | Exibir o inteiro informado; não inferir nomes ou outras partes. |
| `movement_date` | Data da movimentação | Exibir `DD/MM/AAAA`, preservando o dia civil da fonte, sem horário e sem deslocamento por fuso. |
| `movement_title` | Título da movimentação | Preservar integralmente o texto e os acentos. |
| `movement_content` | Conteúdo da movimentação | Preservar texto, acentos e quebras de linha; permitir leitura integral quando houver conteúdo. |

O valor `10.000` do CSV representa o número 10000 já convertido na carga e será exibido como `10.000,00`; `10.168,2` será exibido como `10.168,20`. A coluna não informa moeda, portanto a interface não acrescentará símbolo monetário. Essas regras são de apresentação dos valores persistidos, não de nova importação.

Há 1.312 conteúdos de movimentação vazios, títulos de até 119 caracteres e conteúdos de até 15.266 caracteres. Todas as datas e os títulos estão preenchidos na versão analisada; há 1.175 grupos de movimentações do mesmo processo com a mesma data. O estado sem movimentações e as ausências inesperadas de campos obrigatórios são cenários defensivos, a validar com dados de teste, e não ocorrências observadas no CSV.

- **RF1 — Fonte exclusiva:** obter os detalhes somente da base já importada. Consultar a página não altera processos ou movimentações, relê o CSV nem consulta serviços externos.
- **RF2 — Correspondência:** exibir apenas os dados e as movimentações do processo identificado pelo destino existente. Uma troca de processo não pode misturar dados do processo anterior com os do atual.
- **RF3 — Identificação:** apresentar o CNJ como identificação principal da página, sem substituí-lo por um identificador interno. Manter o acesso ao retorno à consulta existente.
- **RF4 — Informações gerais:** apresentar foro, vara, valor da ação e quantidade de autores conforme a tabela. Não extrair campos adicionais de títulos ou conteúdos narrativos.
- **RF5 — Limite da fonte:** informar, de forma discreta, “Informações da base importada, sem atualização automática junto ao tribunal”. Não exibir data de atualização ou de importação inexistente na base, nem apresentar a data do último evento como data de atualização do sistema.

### 2. Movimentações e cronologia

- **RF6 — Seção própria:** apresentar uma seção “Movimentações” após as informações gerais, com o total de eventos do processo e a indicação “Mais recentes primeiro”. Cada item contém data, título e conteúdo, quando disponível.
- **RF7 — Ordenação:** ordenar o histórico completo por data decrescente antes de dividi-lo em páginas. Eventos na mesma data mantêm a ordem em que aparecem no CSV, já preservada pela fundação. Esse desempate é estável e não representa horário ou precedência jurídica. Não deduplicar eventos por semelhança de data, título ou conteúdo.
- **RF8 — Conteúdo longo:** exibir integralmente conteúdos de até 500 caracteres. Acima desse limite, apresentar uma prévia dos primeiros 500 caracteres, indicação de continuação e controle “Ver conteúdo completo”; a expansão mostra todo o texto e oferece “Recolher”. Não dividir caracteres Unicode, alterar a redação jurídica ou resumir o conteúdo. O título permanece sempre disponível integralmente.
- **RF9 — Conteúdo ausente:** quando o conteúdo for nulo, vazio ou composto apenas de espaços, manter a movimentação com data e título e informar “Sem conteúdo complementar na base”. Não oferecer expansão e não tratar a ausência como falha.
- **RF10 — Campos obrigatórios inesperadamente ausentes:** se um registro disponibilizado à página tiver título vazio, exibir “Título não informado”. Se sua data estiver ausente ou inválida, exibir “Data não informada” e posicioná-lo após todos os eventos com data válida, mantendo a ordem de origem entre eventos sem data. Preservar os demais dados disponíveis e incluir esses itens na contagem e na paginação. Essa tolerância de apresentação não muda o contrato de importação nem exige aceitar dados inválidos na persistência.
- **RF11 — Processo sem eventos:** quando a consulta bem-sucedida retornar zero movimentações, manter identificação e informações gerais e exibir “Nenhuma movimentação disponível na base para este processo”. Não inferir que o processo nunca teve movimentações no tribunal.

### 3. Histórico extenso

- **RF12 — Paginação:** iniciar na primeira página, com até 20 movimentações, e permitir avançar e voltar usando “Próxima” e “Anterior”. Informar página atual, total de páginas e intervalo exibido, como “1–20 de 120 movimentações”. Na primeira e na última página, o controle indisponível deve ser reconhecível como tal. Quando houver apenas uma página ou nenhum evento, não apresentar controles desnecessários.
- **RF13 — Integridade entre páginas:** a navegação deve permitir alcançar todos os eventos exatamente uma vez por percurso completo, sem repetir ou omitir eventos em empates de data, inclusive na fronteira entre páginas. Não limitar o histórico a 120 itens: esse é o máximo observado, não um limite de produto.
- **RF14 — Continuidade da leitura:** trocar de página mantém a identificação e as informações gerais. Durante a transição, indicar carregamento e impedir comandos concorrentes de paginação. Em caso de sucesso, identificar a nova página. Em caso de falha, conservar a última página carregada, sua contagem e seu rótulo, oferecendo nova tentativa para o destino solicitado. Ao mudar de página com sucesso, as expansões de conteúdo voltam ao estado inicial; expandir um item não altera os demais.

### 4. Estados e integração com a navegação existente

- **RF15 — Abertura:** obter os detalhes ao chegar pela consulta existente ou ao abrir/recarregar diretamente um endereço válido do processo, desde que a sessão existente seja válida. O conteúdo não depende de ter sido previamente carregado pela tela de busca.
- **RF16 — Carregamento:** indicar “Carregando dados do processo” enquanto a carga inicial estiver pendente. Não apresentar ausência de processo ou histórico vazio antes de concluir a consulta. Ao navegar para outro processo, remover da área de detalhes os dados do anterior enquanto aguarda a resposta atual.
- **RF17 — Ausência e destino inválido:** distinguir processo não encontrado na base de endereço de processo inválido, com mensagem clara e ação para voltar à consulta. Não substituir nenhum desses estados por “sem movimentações”.
- **RF18 — Falha recuperável:** em indisponibilidade ou erro de comunicação, informar que os dados não puderam ser carregados e oferecer “Tentar novamente” e retorno à consulta. Não expor detalhes internos. Se somente o histórico falhar e as informações gerais já estiverem disponíveis, preservá-las e apresentar o erro na seção de movimentações.
- **RF19 — Sessão e retorno:** reutilizar a proteção e o fluxo de sessão existente, inclusive quando a sessão expirar durante paginação ou leitura; deixar de exibir dados protegidos ao detectar sessão inválida e encaminhar ao fluxo de entrada existente. Reutilizar também o retorno à consulta com preservação do último CNJ quando ele existir. Não criar novas regras de login ou recuperação de destino pós-login.
- **RF20 — Ausência em informações gerais:** se um dos quatro campos gerais estiver inesperadamente ausente, informar “Não informado” apenas naquele campo e preservar os demais. Zero é um valor válido, não ausência. Se não for possível identificar o processo pelo CNJ, apresentar falha de carregamento, sem exibir detalhes sem identificação confiável.
- **RF21 — Conteúdo textual seguro:** tratar títulos e conteúdos como texto, sem executar marcação, scripts ou comandos contidos na origem e sem buscar documentos ou endereços mencionados no texto automaticamente.

## Critérios de aceitação

- **CA-01 — Dados gerais (US1, US2; RF1–RF5):** dado um processo da base importada, quando a página for aberta com sessão válida, então CNJ, foro, vara, valor da ação e quantidade de autores correspondem à origem; nenhum campo processual adicional é inferido e a limitação da fonte está visível.
- **CA-02 — Formatação (US1, US2, US3; RF3, RF4, RF6):** dados CNJ com zeros, valor `10.168,2` na origem e data `5/12/2023`, quando exibidos, então os zeros são preservados, o valor aparece como `10.168,20`, sem símbolo monetário, e a data como `05/12/2023`, independentemente do fuso do navegador.
- **CA-03 — Vínculo (US3; RF2, RF6):** dados dois processos com eventos distintos, quando cada página for consultada e houver navegação rápida entre elas, então somente os eventos e dados gerais do processo atual aparecem, mesmo se respostas anteriores chegarem depois.
- **CA-04 — Ordenação (US3; RF7):** dados eventos em dias diferentes e na mesma data, quando todo o histórico for percorrido, então as datas estão em ordem decrescente e os empates mantêm a ordem do CSV em todas as páginas e após recarregamento.
- **CA-05 — Conteúdo ausente (US5; RF9):** dados eventos com conteúdo nulo, vazio ou somente espaços, quando exibidos, então data e título permanecem visíveis com “Sem conteúdo complementar na base”, sem controle de expansão.
- **CA-06 — Expansão (US3, US4; RF8):** dados conteúdos com 500 e 501 caracteres e o conteúdo real de 15.266 caracteres, quando seus itens forem exibidos, então somente os maiores que 500 recebem prévia e expansão; ao expandir e recolher, todo o conteúdo permanece acessível, com acentos e quebras de linha, sem alterar outro item.
- **CA-07 — Ausências defensivas (US5; RF10, RF20):** dados eventos com título ausente ou data inválida e campos gerais ausentes, quando apresentados em cenário controlado, então aparecem os rótulos definidos, zero permanece visível e os eventos sem data ficam após os datados, em ordem de origem. Dados insuficientes para identificar o CNJ produzem falha de carregamento.
- **CA-08 — Histórico vazio (US5; RF11):** dado um processo existente com zero eventos, quando a carga terminar com sucesso, então identificação e informações gerais continuam visíveis com a mensagem de histórico vazio e sem paginação.
- **CA-09 — Limites de paginação (US4; RF12, RF13):** dados históricos com 1, 20, 21 e 120 eventos, quando navegados, então apresentam respectivamente 1, 1, 2 e 6 páginas; a última página exibe apenas os itens restantes e nenhum controle permite sair dos limites.
- **CA-10 — Volume (US4; RF7, RF12, RF13):** dado um histórico controlado com 1.000 eventos e empates nas fronteiras das páginas, quando as 50 páginas forem percorridas, então todos os 1.000 eventos ficam acessíveis uma vez por percurso, com até 20 por página, contagens corretas e sem limite arbitrário de histórico.
- **CA-11 — Falha de paginação (US4, US6; RF14, RF18):** dada uma página carregada, quando a próxima falhar, então os dados e a indicação da página atual permanecem, uma mensagem de erro é exibida e uma nova tentativa bem-sucedida apresenta a página solicitada sem duplicações.
- **CA-12 — Acesso direto (US6; RF15, RF19):** dado um endereço válido e sessão válida, quando aberto diretamente ou recarregado, então os detalhes e a primeira página de movimentações são exibidos sem depender do estado da busca anterior.
- **CA-13 — Carga inicial (US5, US6; RF16):** dada uma resposta ainda pendente, quando a página for aberta, então existe indicação de carregamento, sem mensagens prematuras de processo inexistente ou histórico vazio e sem dados de outro processo.
- **CA-14 — Destinos sem dados (US6; RF17):** dados um endereço inválido e um identificador válido sem processo correspondente, quando acessados, então cada caso apresenta sua mensagem e retorno à consulta, sem exibir um histórico vazio como resultado.
- **CA-15 — Recuperação (US6; RF18):** dada falha inicial ou exclusiva do histórico, quando ocorrer, então aparece uma ação de nova tentativa; as informações gerais já disponíveis são preservadas no segundo caso, e uma resposta posterior bem-sucedida restaura a seção afetada.
- **CA-16 — Sessão (US6; RF19):** dada sessão ausente, revogada ou expirada, quando forem solicitados detalhes ou outra página do histórico, então nenhum dado protegido é entregue; ao detectar essa condição, a interface deixa de exibir detalhes e segue o fluxo de entrada existente.
- **CA-17 — Retorno (US6; RF3, RF19):** dado acesso originado na consulta CNJ, quando a pessoa voltar à consulta, então a entrada anterior é preservada pelo comportamento existente. No acesso direto sem consulta anterior, o retorno abre a consulta sem inventar um histórico de busca.
- **CA-18 — Texto literal (US3; RF21):** dado conteúdo com marcação ou instruções de script, quando exibido ou expandido, então permanece texto, sem execução de código, navegação ou carregamento de recurso externo.
- **CA-19 — Semântica e teclado (US4, US6; RF3, RF8, RF12, RF18):** dada a página com títulos, botões e links semanticamente adequados e rótulos claros, quando a pessoa navegar por teclado, então consegue expandir e recolher conteúdos, paginar, tentar novamente e voltar à consulta, com indicação visível de foco e sem bloqueio de navegação.
- **CA-20 — Responsividade e zoom (US1–US4; RF3, RF4, RF6, RF8, RF12):** dada a página em celular ou desktop, quando usada com zoom padrão ou de 200% do navegador, então textos permanecem legíveis, conteúdos longos se reorganizam e nenhum dado ou controle é cortado ou fica inacessível.
- **CA-21 — Integridade e fonte (US1–US4; RF1, RF2, RF5, RF21):** dada a base carregada, quando forem executadas leitura, expansão, paginação e recuperação, então processos e movimentações permanecem inalterados e nenhuma chamada a tribunal, IA ou serviço de enriquecimento é realizada.
- **CA-22 — Qualidade (O6; RF1–RF21):** dada a implementação concluída, quando forem executadas as verificações dos aplicativos afetados e os E2E críticos, então todos passam, todas as regras novas têm proteção automatizada e a cobertura mínima de 80% é mantida.

## Experiência do usuário

### Perfis e arquitetura de informação

O perfil principal é a pessoa autenticada que deseja compreender os registros de um processo, sem pressupor formação jurídica. O perfil secundário é a pessoa habituada à consulta processual que precisa conferir os dados e percorrer um histórico extenso. Ambos usam os mesmos dados e permissões existentes.

1. **Identificação:** título “Processo”, CNJ em destaque, retorno à consulta e indicação discreta da origem dos dados.
2. **Informações gerais:** pares de rótulo e valor para foro, vara, valor da ação e quantidade de autores. Os quatro campos ficam disponíveis sem uma interação adicional.
3. **Movimentações:** total, indicação da ordenação, lista com data e título em primeiro plano, conteúdo complementar e controles de navegação.

O manual oficial do TJSP descreve a identificação e os dados básicos no topo e uma seção dedicada às movimentações recentes. Essa separação sustenta a referência conceitual; não obriga a copiar campos, controles, símbolos ou layout do tribunal. A página individual fornecida no prompt não ficou acessível durante a pesquisa; foi utilizado o [manual oficial de Consulta Processual do e-SAJ, atualizado em 25/07/2023](https://www.tjsp.jus.br/Download/SPI/Downloads/5-Novo-e-SAJ-Consulta_Processual_25.07_2023.pdf), especialmente as páginas 5 e 7.

### Fluxo principal

1. Após a busca existente localizar o processo, a pessoa chega à página de detalhes.
2. A página indica carregamento e, após sucesso, apresenta identificação, informações gerais e a primeira página do histórico.
3. A pessoa lê os eventos mais recentes, expande os textos que desejar e avança para eventos anteriores.
4. Ao trocar a página do histórico, a identificação e os dados gerais permanecem disponíveis, e a indicação de página atual é atualizada.
5. A pessoa volta à consulta pelo controle existente. A entrada anterior é preservada quando disponível.

### Estados da interface

| Estado | Resultado visível e próxima ação |
| --- | --- |
| Carregamento inicial | Mensagem de carregamento; ainda não indicar ausência de processo ou de eventos. |
| Sucesso com eventos | Identificação, informações gerais e histórico com total e ordenação. |
| Sucesso sem eventos | Identificação e informações gerais, mensagem de ausência na base e nenhum controle de paginação. |
| Evento sem conteúdo | Data e título, mensagem de ausência de conteúdo e nenhuma expansão. |
| Campo incompleto | Rótulo de ausência apenas no campo afetado; outros dados continuam legíveis. |
| Troca de página pendente | Histórico atual identificado, indicação de carga e paginação temporariamente indisponível. |
| Falha inicial | Mensagem de indisponibilidade, “Tentar novamente” e retorno à consulta. |
| Falha somente no histórico | Informações gerais preservadas e recuperação localizada na seção. |
| Falha ao paginar | Última página preservada e tentativa de carregar novamente a página solicitada. |
| Processo não encontrado | Mensagem de ausência na base e retorno à consulta. |
| Endereço inválido | Mensagem de endereço inválido e retorno à consulta. |
| Sessão inválida detectada | Detalhes deixam de ser exibidos; aplicação segue o fluxo de entrada existente. |

### UI, acessibilidade e responsividade

- Usar português brasileiro nos rótulos, ações, datas e mensagens; preservar a redação original dos eventos, sem interpretação ou simplificação automática de termos jurídicos.
- Usar HTML semântico, com títulos de seção em hierarquia coerente, botões e links adequados às ações e rótulos claros.
- Permitir operar os controles por teclado, com a navegação nativa e indicação visível de foco.
- Manter o layout legível em celular e desktop e utilizável com zoom de 200% do navegador. Adaptar as informações gerais e cada evento a uma coluna quando necessário, permitindo quebra de textos extensos sem cortar CNJ, título ou conteúdo.
- Evitar caixas com rolagem interna para textos de movimentação e rolagem infinita; usar a rolagem natural da página e a paginação explícita.

### Premissas registradas

- Ordenação decrescente e paginação fixa de 20 itens foram propostas nas perguntas de esclarecimento e adotadas como premissas de produto na ausência de preferência informada. A ordem crescente suportada pela fundação permanece uma capacidade existente; a apresentação desta página usa a ordem definida neste PRD, sem reordenar os registros armazenados.
- A prévia de 500 caracteres é uma decisão de apresentação para tornar manejáveis os textos extensos encontrados; o conteúdo integral continua acessível na própria página.
- O público principal e os critérios mensuráveis foram definidos a partir do objetivo de consulta simplificada do prompt. O escopo de acessibilidade acordado limita-se a HTML semântico, controles operáveis por teclado e layout utilizável com zoom do navegador. Não foram fornecidos indicadores de negócio nem um limite de latência contratual.

## Restrições técnicas de alto nível

### Dependências e limites

- Reutilizar a fundação descrita em [PRD de domínio e ingestão CSV](../prd-fundacao-dominio-ingestao-csv/prd.md), com processos, movimentações, vínculo entre eles, datas civis e ordem de origem já persistidos.
- Reutilizar a sessão, a consulta CNJ, o destino do processo e o retorno definidos no [PRD de autenticação e consulta CNJ](../prd-autenticacao-consulta-cnj/prd.md). A ampliação do destino para detalhes pertence a esta etapa; cadastro, login e busca não serão reespecificados.
- Manter a separação entre frontend e backend e as tecnologias já adotadas no projeto. Contratos de API, componentes, estratégias de consulta e demais decisões de implementação pertencem à TechSpec.
- O conjunto atual de 100 processos e 5.568 movimentos é referência de aceitação, não limite de capacidade. Validar também navegação em histórico controlado de 1.000 eventos e textos do tamanho máximo observado, sem exigir carregar visualmente todo o histórico de uma vez.
- Não foi estabelecido um SLA de latência nem uma meta de concorrência. A TechSpec deve registrar as condições de medição e eventuais necessidades de desempenho sem transformar premissas em garantias já acordadas.
- Os textos importados podem conter informações pessoais. Aplicar a proteção de acesso existente, evitar reprodução de conteúdo processual em logs e não enviar dados para serviços externos. Não inferir publicidade, sigilo ou permissões judiciais a partir do CSV.

### Requisitos de testes

- Seguir [`.agents/rules/tests.md`](../../.agents/rules/tests.md): testes rápidos, independentes, repetíveis e autovalidáveis, com cenários orientados a comportamento e assertions significativas.
- Proteger todas as regras novas com testes automatizados e associar os cenários aos critérios de aceitação. Atingir 80% não dispensa a cobertura de regras críticas.
- Usar Vitest nos testes unitários e de integração, mantendo uma base ampla de testes unitários, menos testes de integração e poucos E2E críticos com Playwright em `e2e/`.
- Cobrir em unidade ordenação e desempate, datas sem deslocamento, números e zeros, campos ausentes, expansão nos limites de 500/501 caracteres, títulos longos, paginação e estados de recuperação.
- Cobrir em integração vínculo processo–movimentação, acesso protegido, total e continuidade do histórico, destino inválido, processo inexistente, falhas e preservação dos dados persistidos. Validar a apresentação fiel dos campos dos 100 processos e a possibilidade de consultar todos os 5.568 eventos da fixture real, sem depender do tribunal.
- Cobrir em E2E o percurso consulta existente → detalhes → expansão → paginação → retorno, além de acesso direto, recuperação de falha e sessão expirada. Incluir verificações básicas de semântica, operação dos controles por teclado e layout responsivo com ampliação, conforme CA-19 e CA-20.
- Usar ambientes e dados isolados; representar zero movimentos, campos obrigatórios ausentes, conteúdo malicioso e histórico de 1.000 eventos em fixtures controladas, sem alterar o CSV original ou enfraquecer as restrições da base real.
- Executar testes e cobertura dos aplicativos afetados, builds e verificações de lint e tipos exigidas pelo repositório. A verificação de cobertura deve falhar abaixo de 80%.

### Definição de pronto

- Todos os RF1–RF21 implementados e CA-01–CA-22 verificados com evidências rastreáveis.
- Os oito campos da origem estão representados conforme suas regras, sem inclusão de dados processuais inferidos.
- O histórico integral pode ser percorrido, com desempates estáveis, ausência de conteúdo explicada e textos completos acessíveis.
- Estados vazios, falhas, recuperação, acesso direto, expiração de sessão, HTML semântico, teclado, responsividade e zoom validados.
- Suítes automatizadas, cobertura mínima, builds e verificações exigidas aprovados nos aplicativos afetados, sem regressão dos fluxos existentes.
- CSV e registros processuais preservados e nenhuma dependência de tribunal, scraping ou IA introduzida.

Esta entrega documental define os requisitos; implementação e execução dos testes de produto ocorrerão nas etapas posteriores de TechSpec e tarefas.

## Fora do escopo

- Criar controles próprios de ampliação, anúncios dinâmicos para leitores de tela, gerenciamento programático de foco ou uma matriz dedicada de testes com leitores de tela.
- Reimplementar banco, importação, autenticação, página inicial, busca CNJ, localização e navegação já existentes.
- Gerar resumo por IA, integrar LLM, avaliar resumos ou reservar antecipadamente uma área de resumo na interface.
- Consultar automaticamente o TJSP ou outro tribunal, fazer scraping, sincronizar ou enriquecer os registros.
- Exibir como campos estruturados classe, assunto, situação, juiz, nomes de partes, advogados, documentos, audiências, prazos ou qualquer informação ausente das oito colunas. Menções existentes no conteúdo de uma movimentação permanecem apenas como texto original.
- Inferir resultado do processo, fase atual, encerramento, prognóstico ou orientação jurídica a partir das movimentações.
- Visualizar autos, baixar documentos do tribunal, exportar relatórios ou criar funcionalidades específicas de impressão.
- Editar processos e movimentos, corrigir a fonte, refazer importações, deduplicar registros ou modificar as regras de validação da carga.
- Criar filtros, busca textual dentro do histórico, seletor de ordenação, seletor de tamanho de página, favoritos, alertas ou notificações.
- Implantar novos perfis de acesso, regras de sigilo judicial, indicadores de negócio ou coleta de analytics.
