# Documento de Requisitos do Produto (PRD)

## Visão geral

Esta primeira etapa estabelece o domínio de processos judiciais e movimentações processuais e permite importar e persistir o arquivo `lawsuits_movements.csv`. Resolve a necessidade de transformar uma fonte tabular em uma base íntegra, rastreável e reutilizável, identificando cada processo pelo número CNJ e vinculando suas movimentações em ordem cronológica. O usuário desta etapa é o operador técnico responsável pela carga; pessoas que futuramente consultarão processos não interagem com esta entrega.

O escopo compreende modelos conceituais, validação, importação operacional, persistência, prevenção de duplicidades, tratamento de erros, reexecução e diagnóstico. A fonte de requisitos é `CURRENT_PROMPT.md`; os dados vêm exclusivamente do CSV local. A referência e-SAJ contextualiza o domínio, mas não integra o fluxo. Arquitetura, esquema físico, bibliotecas, interfaces internas e código pertencem à TechSpec.

### Evidências da fonte fornecida

Inspeção do arquivo completo, com leitura de CSV que respeita campos entre aspas e quebras de linha internas:

| Característica | Resultado observado |
| --- | --- |
| Arquivo | `lawsuits_movements.csv` |
| Identificação da versão inspecionada | SHA-256 `ff787b0e95aaca3dca88943bf8606a3c96fa0f00b4218844545790f9656697c9` |
| Tamanho | 2.262.442 bytes |
| Codificação e delimitador | UTF-8; vírgula; aspas duplas para delimitar campos quando necessário |
| Registros de dados | 5.568, desconsiderando o cabeçalho; registros podem ocupar várias linhas físicas |
| Processos distintos | 100 números CNJ, todos com formato e dígitos verificadores válidos |
| Movimentações distintas | 5.568 pela identidade de negócio definida neste PRD |
| Datas de movimentação | De 05/03/2020 a 26/04/2025; dia e mês com um ou dois dígitos, ano com quatro |
| Conteúdo vazio | 1.312 movimentações; os demais campos não estão vazios |
| Empates de data | 1.175 combinações de processo e data possuem mais de uma movimentação |
| Texto de maior extensão | 15.266 caracteres em `movement_content` |
| Metadados de processo | Nenhum conflito observado entre registros do mesmo CNJ |

Esses totais são critérios de reconciliação desta versão do arquivo, não limites de quantidade nem uma alegação de completude dos históricos judiciais.

### Premissas de produto

P1 e P2 foram confirmadas pelo solicitante durante o esclarecimento. O solicitante também definiu o significado das oito colunas, incorporado em RF1–RF3, inclusive a natureza opcional do conteúdo. Sua resposta sobre as colunas não confirmou a regra de duplicidade: P3 permanece como premissa explícita. P4 e P5 são decisões de escopo adotadas neste PRD. Essas decisões não representam características adicionais inferidas do CSV:

- P1: a carga será iniciada manualmente por comando operacional, sem interface gráfica, endpoint público, autenticação nova ou agendamento.
- P2: erros de dados rejeitam somente o registro afetado; falhas operacionais interrompem a execução e preservam unidades já confirmadas.
- P3: CNJ, data, título e conteúdo normalizados identificam uma movimentação. Eventos com esses quatro valores idênticos serão tratados como uma única movimentação, pois a fonte não fornece identificador independente.
- P4: dados conflitantes de um processo não substituem dados anteriormente aceitos; o registro conflitante é rejeitado integralmente.
- P5: uma importação por vez por base de destino; não é necessário oferecer processamento paralelo nesta etapa.

## Objetivos

| Objetivo | Métrica e critério de sucesso |
| --- | --- |
| Estabelecer uma base fiel ao arquivo | Em base vazia, a versão inspecionada resulta em exatamente 100 processos, 5.568 movimentações e zero rejeições |
| Garantir integridade | Zero processos duplicados por CNJ normalizado, zero movimentações órfãs e zero processos novos sem movimentação válida |
| Permitir repetição segura | A segunda carga do mesmo arquivo cria zero processos e zero movimentações; classifica 5.568 registros como duplicados e preserva os dados existentes |
| Preservar a cronologia disponível | 100% das movimentações mantêm a data de origem e obedecem à ordenação e ao desempate definidos em RF6 |
| Diagnosticar resultados | Toda execução iniciada recebe identificação e resultado consultável pelo operador; toda rejeição informa localização e motivo, e os totais reconciliam com os registros processados |
| Recuperar falhas | Reexecutar após falha resulta no mesmo conjunto de dados de uma execução completa, sem perda, duplicação ou gravação parcial de um registro |
| Proteger as regras | Todos os cenários críticos deste PRD possuem testes automatizados aprovados; cobertura mínima de 80% em linhas, instruções, funções e ramificações do código da etapa, sem reduzir a exigência de 80% para a codebase final |

## Histórias de usuário

- **US1:** Como operador técnico, quero importar o CSV fornecido para estabelecer uma base de processos e movimentações consistente com a fonte.
- **US2:** Como responsável pela qualidade dos dados, quero validar CNJs e demais campos para impedir a persistência de registros inválidos ou vínculos incorretos.
- **US3:** Como operador técnico, quero reexecutar uma carga, inclusive após interrupção, para concluir o trabalho sem duplicar ou corromper dados.
- **US4:** Como responsável pela manutenção, quero localizar rejeições e falhas por execução e registro para corrigir a fonte ou o ambiente e repetir a operação.
- **US5:** Como responsável pelo domínio, quero preservar datas, textos e a ordem disponível das movimentações para que a base represente fielmente o histórico fornecido.
- **US6:** Como responsável pela qualidade, quero comprovar os resultados por testes e reconciliação para aceitar esta etapa independentemente de funcionalidades futuras.

## Principais funcionalidades

### 1. Modelo conceitual e contrato dos dados

**RF1 — Processo.** Representar um processo com número CNJ como identificador de negócio obrigatório e imutável, foro no qual foi protocolado, vara para a qual foi sorteado, valor da ação proposto pelo advogado e quantidade de autores. O CNJ deve ser preservado como identificador textual, incluindo zeros à esquerda. Identificadores internos, se necessários, não substituem sua unicidade de negócio.

**RF2 — Movimentação Processual.** Representar uma atualização associada a exatamente um processo, com data, título, conteúdo opcional e referência à primeira ocorrência aceita na fonte. Um processo persistido nesta etapa possui uma ou várias movimentações. Nenhuma movimentação pode existir sem processo, e nenhum processo novo pode permanecer gravado quando sua primeira movimentação não for aceita.

**RF3 — Mapeamento da fonte.** Cada registro lógico do CSV representa uma movimentação e repete os dados de seu processo. Utilizar exclusivamente as oito colunas observadas:

| Coluna real | Conceito | Obrigatoriedade e regra |
| --- | --- | --- |
| `lawsuit_number` | Número CNJ do processo | Obrigatório; validação e normalização de RF4 |
| `lawsuit_forum` | Foro no qual o processo foi protocolado | Texto obrigatório, não vazio após remoção de espaços externos |
| `lawsuit_court` | Vara para a qual o processo foi sorteado | Texto obrigatório, não vazio após remoção de espaços externos |
| `lawsuit_value` | Valor da ação proposto pelo advogado | Obrigatório; número decimal não negativo segundo RF5 |
| `lawsuit_number_of_authors` | Quantidade de autores | Obrigatório; inteiro positivo em dígitos ASCII |
| `movement_date` | Data da movimentação | Obrigatória; data civil válida segundo RF5 |
| `movement_title` | Título da movimentação | Texto obrigatório, não vazio após remoção de espaços externos |
| `movement_content` | Conteúdo da movimentação | Opcional; vazio é válido e não exige texto substituto |

Não há coluna de identificador da movimentação, horário, fuso, moeda, classe processual, nomes de partes ou estado do processo. Não produzir esses dados por inferência. O valor deve manter sua representação numérica exata, sem atribuir código de moeda não fornecido.

### 2. Validação e regras de negócio

**RF4 — Número CNJ.** A numeração possui a estrutura `NNNNNNN-DD.AAAA.J.TR.OOOO`, com vinte dígitos; `DD` verifica a integridade dos demais campos por Módulo 97 Base 10. Base normativa: [Resolução CNJ nº 65, Anexo VIII](https://atos.cnj.jus.br/files/resolucao_65_16122008_04032013165912.pdf) e [explicação oficial dos campos](https://www.cnj.jus.br/programas-e-acoes/numeracao-unica/perguntas-frequentes/).

Regras de aceitação desta etapa:

- Aceitar a máscara completa ou exatamente vinte dígitos ASCII sem pontuação, removendo somente espaços externos antes da verificação. Não aceitar pontuação parcial, letras, espaços internos, notação científica ou dígitos ausentes.
- Normalizar as duas formas para a mesma identidade de vinte dígitos; oferecer a máscara completa nos diagnósticos que exibam o CNJ. Nunca completar zeros ausentes por tentativa.
- Verificar `DD` considerando a concatenação dos campos na ordem `NNNNNNN`, `AAAA`, `J`, `TR`, `OOOO`, seguida de `00`. O dígito esperado é 98 menos o resto da divisão desse número por 97, expresso com dois dígitos. Rejeitar divergência; não corrigir automaticamente.
- Aceitar `J` entre 1 e 9 e ano entre 0001 e 9999. A aplicação não restringirá a importação ao TJSP nem rejeitará por comparação com o ano corrente.
- Validar a largura de `TR` e `OOOO`, preservando zeros. Verificação de existência de tribunal, unidade ou processo em cadastros externos não integra esta etapa. Um CNJ aprovado aqui é estruturalmente válido; sua existência judicial não é comprovada pelo importador.

**RF5 — Valores e textos.** Aplicar regras determinísticas, independentes do idioma, fuso ou relógio da máquina:

- Datas: aceitar exclusivamente `D/M/AAAA`, `DD/M/AAAA`, `D/MM/AAAA` ou `DD/MM/AAAA`, após remover espaços externos, com ano de 0001 a 9999 e verificação de calendário e anos bissextos. `5/12/2023` significa 5 de dezembro. Rejeitar datas impossíveis, vazias ou com horário. Não converter para outro dia por fuso nem impor inferências entre a data e o ano do CNJ.
- Valores: aceitar parte inteira em dígitos, com ou sem pontos de milhar; quando houver pontos, o primeiro grupo contém de um a três dígitos e os demais exatamente três. Aceitar vírgula opcional com uma ou duas casas decimais. `10.000` equivale a dez mil; `10.168,2` equivale a 10.168,20. Rejeitar sinais, símbolos de moeda, espaços internos, expoentes, separadores incompatíveis e mais de duas casas decimais. Não arredondar nem usar aproximação para decidir igualdade.
- Quantidade de autores: aceitar somente dígitos cujo valor seja maior que zero; rejeitar frações, sinal ou texto. Representações como `01` e `1` têm o mesmo valor.
- Foro, vara, título e conteúdo: conservar o texto original aceito, incluindo acentos, aspas, pontuação e quebras de linha, sem truncar. Para comparação, normalizar Unicode em NFC, converter CRLF e CR para LF e remover espaços externos. Manter diferenças de maiúsculas, acentos, pontuação e espaços internos. Não resumir, remover marcação ou interpretar conteúdo como código.
- Conteúdo vazio ou composto apenas por espaços corresponde à mesma ausência de conteúdo para deduplicação. Não exigir conteúdo quando há título e data válidos.
- Campo obrigatório inválido rejeita o registro inteiro; não substituir por zero, data corrente, texto genérico ou valor herdado de outro registro.

**RF6 — Cronologia.** A sequência lógica de um processo será ordenada por data crescente. Entre movimentações da mesma data, manter a ordem de primeira aceitação: no mesmo arquivo, a posição do registro lógico; em cargas posteriores, novas movimentações dessa data ficam após as já existentes. Reexecuções e arquivos reordenados não alteram o desempate já registrado. Esse desempate é operacional e não afirma a ordem real dos eventos no dia, pois a fonte não contém horário. A sequência deve ser verificável pelos testes e pela inspeção da persistência, sem criar tela ou API de consulta.

**RF7 — Identidade e duplicidade.** Existirá no máximo um processo por CNJ normalizado. Existirá no máximo uma movimentação por combinação de CNJ normalizado, data civil, título normalizado e conteúdo normalizado. A regra vale dentro de um arquivo e entre execuções, independentemente de nome ou localização do arquivo. Uma diferença em qualquer componente da identidade da movimentação cria um evento distinto, desde que os outros campos sejam válidos e os metadados do processo sejam compatíveis. Número de linha, nome do arquivo e identificação da execução não integram essa identidade.

**RF8 — Conflitos de processo.** Antes de classificar uma movimentação como nova ou duplicada, comparar foro, vara, valor e quantidade de autores com o processo existente, segundo RF5. Diferenças apenas de representação normalizada são compatíveis. Divergência real em qualquer campo rejeita o registro com motivo de conflito e indicação dos campos envolvidos; não cria sua movimentação nem altera o processo. Dentro de uma carga, o primeiro registro válido e confirmado estabelece os dados do processo. Correções e substituições de dados já aceitos não são suportadas nesta etapa.

### 3. Importação e reexecução

**RF9 — Entrada operacional.** Permitir que o operador informe o caminho de um arquivo local e inicie a importação para a base configurada. Documentar pré-requisitos, execução, localização do relatório e reexecução. Não depender de navegador ou serviço externo para obter dados processuais.

**RF10 — Contrato CSV.** Ler UTF-8, aceitando BOM inicial, vírgula como delimitador e aspas duplas, inclusive aspas escapadas, vírgulas e quebras de linha dentro de campos delimitados. Aceitar LF e CRLF como terminadores de registros. O cabeçalho deve conter exatamente uma ocorrência de cada nome de RF3; a ordem pode variar. Rejeitar arquivo sem cabeçalho, com coluna ausente, extra ou repetida ou com codificação inválida. Cabeçalho válido sem dados é uma execução concluída sem alterações, com aviso de arquivo vazio de dados. Linhas físicas vazias fora de campos delimitados são ignoradas e contabilizadas separadamente; um registro com oito campos vazios é inválido, não uma linha ignorada.

**RF11 — Processamento e classificação.** Percorrer registros lógicos na ordem do arquivo, validar os campos, verificar conflitos e só então persistir ou reconhecer duplicidade. Cada registro processado recebe exatamente uma classificação:

- **Importado:** criou uma movimentação e, se necessário, seu processo.
- **Duplicado:** a movimentação já existia, os dados do processo eram compatíveis e nada foi alterado.
- **Rejeitado:** violou uma ou mais regras de dados e nada desse registro foi gravado.

Continuar depois de rejeições recuperáveis, inclusive quantidade incorreta de campos quando os limites do registro continuarem identificáveis. Informar todos os erros de validação detectados no registro; não produzir erros derivados de campos cuja leitura ou validação anterior falhou. Rejeições não impedem que um registro posterior válido do mesmo CNJ seja aceito.

**RF12 — Integridade da gravação.** A unidade de confirmação é um registro lógico válido: criação do processo, quando necessária, e de sua movimentação devem ter resultado indivisível. Se a gravação falhar, não deixar processo novo vazio ou movimentação incompleta. Confirmações anteriores permanecem. O relatório deve permitir distinguir resultados confirmados de uma operação cujo resultado ainda precisa ser reconciliado após interrupção abrupta; não contabilizar uma tentativa como sucesso sem confirmação.

**RF13 — Reexecução e recuperação.** Permitir executar novamente o arquivo completo, sem exigir sua edição para remover registros já importados. Reaplicar todas as validações e regras de identidade; não excluir ou substituir dados existentes. Novos registros válidos adicionam movimentações, duplicados não alteram dados e inválidos continuam diagnosticados. Depois de interrupção, a nova execução reconcilia o estado persistido antes de contabilizar novas gravações. Não há obrigação de retomar a leitura de uma posição intermediária.

**RF14 — Exclusão de execução simultânea.** Se houver importação ativa na mesma base, rejeitar uma segunda solicitação antes de qualquer gravação de domínio e informar o motivo. Uma execução encerrada abruptamente não deve bloquear indefinidamente uma nova carga: o procedimento operacional deve permitir confirmar o encerramento e recuperar a disponibilidade sem apagar dados importados. O mecanismo de controle será definido na TechSpec.

### 4. Erros, diagnóstico e resultados

**RF15 — Erros fatais.** Arquivo inexistente ou sem permissão, codificação inválida, cabeçalho incompatível, leitura interrompida, aspas malformadas que impeçam determinar limites de registros, banco indisponível e falha de persistência interrompem a execução. Não tentar adivinhar fronteiras de registros nem seguir gravando após erro operacional. Falhas anteriores ao processamento não alteram o domínio; falhas posteriores preservam somente unidades confirmadas. O relatório informa que o restante não foi processado e recomenda corrigir a causa e reexecutar.

**RF16 — Resultado de execução.** Expor identificação única da tentativa e um dos resultados: `concluída`, `concluída com rejeições`, `falhou` ou `interrompida`. Duplicidades, isoladamente, não são rejeições. Se todos os registros forem inválidos, o resultado é `concluída com rejeições` e há zero gravações. A conclusão deve ser distinguível por automação: código de saída zero para `concluída` e códigos não zero distintos para rejeições e falha operacional, documentados na implementação. Uma interrupção abrupta pode deixar uma execução sem resultado final; deve ser reconhecida como interrompida na recuperação, sem inventar horário de término ou sucesso.

**RF17 — Registro mínimo de diagnóstico.** Produzir relatório persistente, disponível após o fim do comando, com:

- Identificação da execução; nome do arquivo e identificação de seu conteúdo; destino lógico da carga sem credenciais; início, fim quando conhecido e duração quando calculável.
- Estado e motivo de encerramento; quantidade de registros processados, importados, duplicados e rejeitados; processos criados; movimentações criadas; linhas vazias ignoradas; registros não processados, se conhecidos. Se a leitura não terminou, marcar o total restante como desconhecido.
- Para cada rejeição: número do registro lógico de dados, começando em 1 após o cabeçalho; linha física inicial quando disponível; campo; código estável do erro; explicação em português; CNJ no formato completo com pontuação apenas quando validado. Não registrar indiscriminadamente valores inválidos.
- Para falhas fatais: etapa afetada, categoria, última posição confirmada quando conhecida e orientação de recuperação. Interrupção abrupta deve deixar rastros suficientes para reconciliar a execução com os dados persistidos.
- Associação de cada movimentação com a identificação da execução e posição de sua primeira importação aceita. Duplicidades posteriores não substituem essa origem.

Categorias mínimas distinguíveis: arquivo inacessível, codificação inválida, cabeçalho incompatível, CSV malformado, quantidade de campos, campo obrigatório, CNJ malformado, dígito verificador inválido, campo CNJ inválido, data inválida, valor inválido, quantidade de autores inválida, conflito de processo, execução concorrente e falha de persistência. O relatório não deve conter conteúdo completo das movimentações, nomes de partes extraídos dos textos, senhas, credenciais ou conexões com segredos.

**RF18 — Reconciliação.** Em execução finalizada normalmente, `processados = importados + duplicados + rejeitados` e `movimentações criadas = importados`. `Processos criados` conta CNJs efetivamente novos, não registros. Cabeçalho e linhas vazias ignoradas ficam fora dessa soma. Em falhas, reportar separadamente o registro em tentativa ou de resultado incerto e o restante não processado, sem incluí-los em totais confirmados. Cada tentativa tem seu próprio relatório; resultados de tentativas anteriores não são sobrescritos.

## Critérios de aceitação

| ID | Vínculo | Cenário verificável |
| --- | --- | --- |
| CA-01 | US1; RF1–RF3, RF9–RF11 | Dada uma base vazia e a versão do CSV identificada neste PRD, quando a carga terminar, então haverá 100 processos e 5.568 movimentações, todas vinculadas corretamente, zero rejeições e nenhum truncamento de texto. |
| CA-02 | US2; RF4, RF7 | Dado um CNJ válido com zero inicial, quando chegar com máscara e depois em vinte dígitos, então ambos identificarão o mesmo processo e o zero será preservado. |
| CA-03 | US2; RF4 | Dados CNJs com dígito verificador alterado, largura incorreta, letra, espaço interno, máscara parcial, `J` fora de 1–9 ou ano 0000, quando importados, então cada registro será rejeitado com motivo específico e sem gravação parcial. |
| CA-04 | US2; RF5 | Dadas datas como 29/02/2024 e 29/02/2023, quando validadas, então a primeira será aceita e a segunda rejeitada; repetir em fusos distintos preservará o mesmo dia. |
| CA-05 | US2; RF3, RF5 | Dados `10.000`, `10.168,2` e `10.168,20`, quando interpretados, então representarão respectivamente 10000,00 e duas ocorrências do mesmo valor 10168,20; valor malformado ou autores zero/fração rejeitará o registro. |
| CA-06 | US5; RF3, RF5, RF10 | Dado conteúdo vazio ou texto com vírgulas, aspas escapadas, acentos e múltiplas linhas, quando importado, então cada registro continuará sendo uma única movimentação, com conteúdo preservado; título vazio rejeitará o registro. |
| CA-07 | US3; RF7, RF13 | Dada a primeira carga completa, quando o arquivo idêntico for importado novamente, então haverá zero criações, 5.568 duplicados e os mesmos dados, origens e ordem de desempate. |
| CA-08 | US3; RF5, RF7 | Dadas duas ocorrências com mesma identidade, inclusive diferenças apenas de NFC, espaços externos ou terminadores de linha, quando importadas no mesmo arquivo ou em arquivos diferentes, então apenas uma movimentação será persistida. |
| CA-09 | US5; RF7 | Dadas movimentações iguais em três componentes da identidade e diferentes no quarto, quando importadas com metadados compatíveis, então ambas serão preservadas; texto com diferença real de caixa, acento ou pontuação não será fundido. |
| CA-10 | US5; RF6 | Dado arquivo fora de ordem de data e com eventos no mesmo dia, quando persistido, então a sequência lógica será crescente por data e estável pela primeira aceitação nos empates; reimportar em outra ordem não alterará empates existentes. |
| CA-11 | US2; RF8 | Dado processo persistido, quando outro registro trouxer valor ou texto de metadado realmente divergente, então o registro inteiro será rejeitado, mesmo que sua movimentação já exista, e o processo original permanecerá inalterado. |
| CA-12 | US1–US2; RF11–RF12 | Dado arquivo com registros válidos antes e depois de um registro inválido, quando processado, então os válidos serão aceitos, o inválido será rejeitado e seu erro ficará localizado no relatório. |
| CA-13 | US2; RF2, RF12 | Dado um processo ainda inexistente, quando sua movimentação for inválida ou a gravação dela falhar, então nenhum processo vazio nem movimentação parcial ficará persistido. |
| CA-14 | US3; RF12–RF13, RF15 | Dada falha induzida após algumas confirmações ou no meio de uma gravação, quando o arquivo completo for reexecutado após recuperação, então o conjunto final de processos e movimentações será igual ao da carga sem falha. |
| CA-15 | US4; RF10, RF15 | Dado arquivo inacessível, cabeçalho inválido ou UTF-8 inválido, quando a falha for detectada, então a execução falhará com motivo correspondente; se detectada antes do processamento, haverá zero gravações. |
| CA-16 | US4; RF10–RF11, RF15 | Dado registro com quantidade errada de campos e limites identificáveis, quando lido, então somente ele será rejeitado; dada quebra irrecuperável de aspas, então a execução será interrompida e o restante não será importado por suposição. |
| CA-17 | US4; RF10, RF16 | Dado cabeçalho válido sem dados, quando importado, então a execução concluirá com aviso e totais zero; dado arquivo com somente registros inválidos, então concluirá com rejeições e zero gravações. |
| CA-18 | US3; RF14 | Dada uma carga ativa, quando outra for solicitada na mesma base, então a segunda será recusada antes de gravar; após término ou recuperação da primeira, uma nova tentativa poderá executar. |
| CA-19 | US4; RF16–RF18 | Dada execução concluída, com rejeições ou falha, quando o operador inspecionar sua saída e relatório, então distinguirá o resultado, reconciliará totais confirmados e localizará erros sem exposição de textos processuais completos ou segredos. |
| CA-20 | US3–US4; RF13, RF16–RF18 | Dado encerramento abrupto depois de uma gravação, quando a operação for recuperada, então a tentativa anterior será identificada como interrompida, o estado persistido será reconciliado e a nova carga não duplicará a movimentação. |
| CA-21 | US6; RF1–RF18 | Dado ambiente isolado com acesso externo a tribunais e LLMs indisponível, quando a suíte e a importação completa forem executadas, então todos os cenários críticos passarão e a carga dependerá somente do CSV e da persistência configurada. |

### Requisitos de testes

Aplicam-se as regras de `.agents/rules/tests.md`: Vitest para unidade e integração, princípios FIRST, testes independentes e repetíveis, asserts de comportamento e prioridade para integridade, idempotência e recuperação. O caminho existente no repositório é `.agents/rules/tests.md`.

| Camada | Cobertura obrigatória |
| --- | --- |
| Unidade — CNJ | Máscara e vinte dígitos, zeros iniciais, campos e dígito verificador, caracteres inválidos e equivalência de identidade; usar casos válidos de referência e mutações inválidas, sem calcular a expectativa pela própria função testada |
| Unidade — dados | Datas e bissextos, formatos recusados, valores exatos e separadores, inteiros positivos, obrigatoriedade, conteúdo vazio, Unicode, espaços e quebras de linha |
| Unidade — domínio | Identidade de movimentação, diferenças reais de texto, conflitos, ordenação e empate, classificação de registros e reconciliação de contadores |
| Integração — CSV | Cabeçalho em outra ordem, colunas ausentes/extras/repetidas, UTF-8 com/sem BOM, aspas escapadas, campos multilinha, linhas vazias, registro vazio, quantidade incorreta de campos e estrutura irrecuperável |
| Integração — persistência | Unicidade efetiva, vínculos, atomicidade por registro, precisão numérica, preservação de texto e origem, idempotência dentro/entre arquivos, inclusão de nova movimentação e rejeição de conflito |
| Integração — recuperação | Falha de banco antes e durante gravação, falha após confirmação, leitura interrompida, encerramento abrupto, relatório incompleto, reexecução e exclusão de concorrência |
| Ponta a ponta operacional | Executar o comando com CSV e banco isolado, conferir o corpus completo, repetir a carga e recuperar uma falha induzida; verificar saída, relatório e estado final persistido |

Testes unitários não dependem de rede ou banco real. Integração e ponta a ponta usam persistência isolada e controlada; não substituir por mocks a unicidade e a atomicidade que se pretende verificar. Controlar relógio quando relevante e restaurar mocks. Os testes de ponta a ponta ficam em `e2e/`; não há jornada de navegador que justifique uma interface nesta etapa. Usar casos sintéticos para falhas e casos de borda; o corpus original permanece inalterado como referência de reconciliação.

A verificação automatizada deve falhar abaixo de 80% em qualquer uma das quatro métricas de cobertura declaradas nos objetivos. Atingir o percentual não dispensa casos de falha e recuperação nem autoriza excluir regras relevantes da medição.

### Definição de pronto

- RF1–RF18 implementados e CA-01–CA-21 comprovados por evidências automatizadas.
- Carga do corpus original e reexecução reconciliadas com os totais esperados, em base inicialmente vazia.
- Cenários de falha e recuperação sem duplicação, perda de confirmações anteriores ou entidades parciais.
- Comando, pré-requisitos, contrato CSV, relatórios, categorias de erro e recuperação documentados para o operador.
- Suíte, cobertura mínima e build do backend aprovados; executar `npm run test` e `npm run build` no aplicativo correspondente e o comando de cobertura configurado pela implementação.
- Relatórios sem conteúdo processual completo ou segredos e fluxo sem consulta externa a tribunais ou LLMs.
- Nenhuma funcionalidade excluída incorporada à entrega. Este PRD, por ser documental, especifica os testes da implementação e não afirma que eles já existem ou foram executados.

## Experiência do usuário

O operador técnico seleciona o arquivo e a base configurada, inicia a carga por comando, recebe a identificação da execução e consulta seu resultado e relatório. Quando houver rejeições, usa posição, campo e motivo para localizar o problema na fonte; quando houver falha operacional, corrige o ambiente e executa novamente o arquivo completo. A equipe de qualidade usa o mesmo fluxo em ambiente isolado para conferir integridade e resultados.

Mensagens e documentação serão em português, com termos consistentes: processo, movimentação, registro importado, duplicado e rejeitado. O relatório deve distinguir registro lógico de linha física para não induzir correções erradas em conteúdo multilinha. Informações essenciais devem estar disponíveis em texto e por operação de teclado, sem depender de cor, animação ou interação gráfica. Não há telas, requisitos visuais, navegação ou formulários nesta etapa.

## Restrições técnicas de alto nível

### Requisitos não funcionais

- **RNF1 — Integridade e durabilidade:** preservar todas as unidades confirmadas após encerramento e respeitar unicidade, vínculos e gravação indivisível definidos no domínio, inclusive em falhas e reexecuções.
- **RNF2 — Reprodutibilidade:** regras de validação, comparação e datas independem de locale, fuso e relógio do sistema. Para a mesma sequência de entradas e o mesmo estado inicial, produzir o mesmo estado de domínio e as mesmas classificações, excetuados metadados operacionais da execução.
- **RNF3 — Capacidade mínima verificável:** suportar integralmente o corpus de 2.262.442 bytes, 5.568 registros, campos multilinha e conteúdo de até 15.266 caracteres já observado, sem truncamento ou perda. Esses números não são limites de aceitação. Não foi fornecido SLA de tempo ou volume futuro; medir e registrar duração e ambiente da carga de referência, sem criar promessa arbitrária de desempenho.
- **RNF4 — Privacidade e acesso:** tratar texto processual como dado potencialmente pessoal; manter arquivo, base e relatórios no ambiente operacional controlado, sem publicação ou transmissão a serviços externos. Acesso é responsabilidade do ambiente existente, sem criar autenticação de produto. Retenção legal e exposição pública não são definidas nesta entrega.
- **RNF5 — Observabilidade:** relatórios de tentativas anteriores permanecem disponíveis durante execução e reexecução, sem sobrescrita nem limpeza automática nesta etapa. Qualquer resultado incerto deve ser explicitado e reconciliável.
- **RNF6 — Qualidade:** cumprir os requisitos de testes e cobertura deste PRD e as regras do repositório. Não depender de acesso ao TJSP, CNJ ou fornecedores de IA para executar importação ou testes.

### Dependências e limites de decisão

- Disponibilidade do `lawsuits_movements.csv` e preservação da versão identificada para o teste de reconciliação. Arquivos posteriores devem obedecer ao mesmo contrato; alteração de colunas exige revisão explícita do contrato antes da carga.
- Disponibilidade de banco de dados persistente, configuração de acesso e ambiente isolado para testes. Escolha de banco, modelo físico, mecanismo de atomicidade, índices, parser, estrutura de relatórios e recuperação ficam para a TechSpec, respeitando os resultados exigidos aqui.
- O `AGENTS.md` descreve backend em Node.js, TypeScript e Express e separação entre frontend e backend. Na inspeção deste checkout não há diretório `backend/` nem `frontend/` ou seus manifests; portanto, não presumir infraestrutura executável já instalada. A TechSpec deve considerar a preparação mínima do backend necessária à carga, sem criar frontend para esta etapa.
- A fonte não permite distinguir dois eventos reais com CNJ, data, título e conteúdo idênticos. A deduplicação de RF7 é uma decisão de produto limitada aos dados disponíveis; não oferecer garantia de distinção que o arquivo não suporta.
- A fonte não permite atribuir horários ou comprovar a ordem real de eventos no mesmo dia, nem inferir moeda ou completude de um histórico. Preservar essas limitações no domínio e na documentação.
- Referências oficiais do CNJ fundamentam apenas a estrutura e validação da numeração. Regras de ingestão, conflitos, deduplicação e desempate são decisões desta etapa, não exigências atribuídas ao Judiciário.

## Fora do escopo

- Autenticação de usuários ou gestão de permissões dentro do produto.
- Tela de consulta, busca pública, página pública ou privada de processo e API de consulta destinada a consumidores.
- Resumo por IA, avaliação de resumo e integração com APIs de LLM.
- Scraping, consulta ao e-SAJ/TJSP, integração com outro tribunal ou enriquecimento por fontes externas.
- Interface gráfica para upload, agendamento de cargas, sincronização automática e processamento paralelo de importações.
- Edição, substituição, exclusão ou conciliação automática de dados de processo já aceitos; mudanças de metadados geram conflito conforme RF8.
- Identificação semântica de movimentações equivalentes, correção automática de CNJs e reconstrução de horários ou identificadores ausentes.
- Importador genérico com mapeamento configurável de colunas ou aceitação silenciosa de outros formatos de arquivo.
- Implementação de funcionalidades futuras apenas para demonstrar a base; a comprovação desta entrega ocorre por testes, relatórios e inspeção controlada da persistência.
