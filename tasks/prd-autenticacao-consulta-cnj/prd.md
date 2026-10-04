# Documento de Requisitos do Produto (PRD)

## Visão geral

Esta é a segunda etapa do produto de consulta simplificada de processos judiciais, definida pelo [CURRENT_PROMPT.md](../../CURRENT_PROMPT.md) e complementada pelo requisito de cadastro com confirmação obrigatória de e-mail. Ela permite que uma pessoa sem conhecimento técnico ou jurídico se cadastre somente com e-mail e senha, confirme seu e-mail, entre no sistema, informe um número CNJ e encontre um processo na base disponível. A entrega cobre cadastro público (sign-up), confirmação de e-mail pelo Resend, autenticação, autorização da consulta, validação da entrada, busca exata e navegação para uma página mínima que identifica o processo encontrado.

A [etapa anterior](../prd-fundacao-dominio-ingestao-csv/prd.md) fornece a persistência de processos e movimentações, seus relacionamentos e a carga inicial do CSV. Esta etapa consome essa fundação. A página de destino mostra somente o necessário para confirmar a localização do processo e permitir outra consulta; a experiência completa de leitura dos dados processuais será definida no próximo PRD.

## Objetivos

- **O1 — Concluir a jornada principal:** em todos os cenários de aceitação com cadastro válido, e-mail confirmado, credenciais corretas e CNJ existente, permitir cadastrar, confirmar o e-mail, autenticar, consultar e chegar à página do processo correto. Contas já confirmadas iniciam a jornada pelo login.
- **O2 — Simplificar a consulta:** após autenticação, permitir consultar com um único campo obrigatório e uma ação principal, `Consultar`.
- **O3 — Proteger o acesso:** bloquear 100% das tentativas de consulta e acesso à página de processo sem sessão válida de uma conta com e-mail confirmado, sem revelar existência ou dados de processos. Impedir também o login de contas com confirmação pendente, mesmo com credenciais corretas.
- **O4 — Diferenciar os resultados:** apresentar respostas distintas e compreensíveis para entrada inválida, processo ausente, sessão expirada e indisponibilidade, cobrindo todos os estados definidos neste documento.
- **O5 — Preservar a base existente:** realizar a jornada sem criar, alterar ou excluir processos ou movimentações.
- **O6 — Proteger as regras com testes:** cobrir todas as regras introduzidas com testes automatizados significativos e manter cobertura mínima de 80% em cada aplicativo afetado, respeitando as regras do projeto.
- **O7 — Concluir a confirmação:** enviar a confirmação pelo Resend nos cenários de cadastro aceito e reenvio permitido, e manter 100% das contas não confirmadas sem acesso, inclusive em falhas de envio, links inválidos ou expirados.

As métricas desta etapa são aferidas na aceitação e na suíte automatizada. Não há meta de adoção ou conversão, nem dependência de implantação de analytics.

## Histórias de usuário

- **US1:** Como pessoa com uma conta e e-mail confirmado, quero entrar com minhas credenciais para utilizar a consulta.
- **US2:** Como pessoa sem conhecimento jurídico, quero digitar ou colar o número do processo em uma tela simples para encontrá-lo sem aprender conceitos internos do sistema.
- **US3:** Como pessoa autenticada, quero ser levada ao processo correspondente ao número informado para ter certeza de que encontrei o registro correto.
- **US4:** Como pessoa que informou um número incorreto ou ausente na base, quero entender o resultado e corrigir a consulta sem perder o que digitei.
- **US5:** Como pessoa que enfrenta uma falha temporária ou uma sessão expirada, quero receber uma orientação clara para retomar a jornada.
- **US6:** Como pessoa que usa teclado, leitor de tela ou celular, quero concluir a mesma jornada com controles identificáveis e mensagens acessíveis.
- **US7:** Como pessoa autenticada, quero sair do sistema para encerrar meu acesso, inclusive em um dispositivo compartilhado.
- **US8:** Como responsável pela disponibilização do produto, quero assegurar que somente usuários autenticados e com e-mail confirmado acessem a base disponibilizada.
- **US9:** Como pessoa sem conta, quero me cadastrar informando somente e-mail e senha para começar a usar o produto sem fornecer dados adicionais.
- **US10:** Como pessoa recém-cadastrada, quero receber um e-mail e confirmar meu endereço para poder entrar na conta.
- **US11:** Como pessoa que não recebeu a mensagem ou deixou o link expirar, quero solicitar outro e-mail de confirmação para concluir meu acesso sem criar outra conta.

## Principais funcionalidades

### 1. Autenticação e autorização

Oferece a entrada no produto após a confirmação do e-mail e protege a consulta e seu destino. O cadastro público e o uso do Resend são requisitos definidos pelo usuário; a abrangência da autorização permanece registrada nas restrições de alto nível.

- **RF1 — Entrada:** apresentar uma tela de acesso com e-mail, senha, ação `Entrar` e acesso a `Criar conta`. Somente uma conta com e-mail confirmado e credenciais corretas deve permitir a entrada. Campos obrigatórios vazios ou e-mail com formato inválido devem receber feedback antes do envio. O cadastro e a confirmação devem permitir obter a conta de aceitação, sem exigir criação manual de contas nem uma interface administrativa.
- **RF2 — Credenciais recusadas:** informar `E-mail ou senha incorretos. Confira os dados e tente novamente.` tanto para e-mail desconhecido quanto para senha incorreta. Uma falha deve permitir nova tentativa; a mensagem não deve confirmar a existência da conta.
- **RF3 — Sessão:** somente conceder uma sessão após login com credenciais corretas e e-mail confirmado; cadastro, envio da mensagem e confirmação do e-mail não autenticam automaticamente. Após a entrada, apresentar a página inicial de consulta. Manter o acesso em recarregamentos enquanto a sessão estiver válida. Adotar, como premissa de produto, duração máxima de oito horas a partir da autenticação, sem renovação automática; ao expirar, exigir nova entrada antes de permitir acesso protegido.
- **RF4 — Proteção efetiva:** exigir sessão válida de uma conta com e-mail confirmado para realizar a busca, obter seu resultado e acessar a página mínima de processo. A proteção deve valer também para solicitações diretas ao backend e navegação por endereço, sem depender dos controles da interface. Verificar a autorização antes de buscar ou revelar a existência do processo.
- **RF5 — Abrangência da autorização:** qualquer conta autenticada pode consultar qualquer processo da base disponibilizada nesta etapa, com acesso somente de leitura. Não há vínculo entre usuário e processo nem perfis distintos de acesso nesta entrega.
- **RF6 — Saída:** disponibilizar `Sair` nas telas autenticadas. Ao sair, encerrar a sessão e retornar ao acesso. A sessão encerrada não pode ser reutilizada; voltar pelo navegador, recarregar ou abrir um endereço protegido não deve recuperar dados visíveis nem autorizar novas consultas.

### 2. Página inicial e entrada do número CNJ

Concentra a jornada em uma busca simples por um número conhecido pelo usuário.

- **RF7 — Consulta simples:** após autenticação, destacar o campo `Número do processo (CNJ)` e o botão `Consultar`. Incluir orientação breve de preenchimento, sem listas, indicadores ou conteúdo processual adicional na página inicial. A ação de sair deve ter destaque secundário.
- **RF8 — Formas de preenchimento:** aceitar o número completo com a pontuação padrão ou seus 20 dígitos, preservando zeros à esquerda. Desconsiderar somente espaços antes e depois do valor. Rejeitar letras, números incompletos ou excedentes, pontuação fora do padrão e espaços entre os dígitos; não corrigir dígitos automaticamente.
- **RF9 — Validação antes da busca:** validar no backend que a entrada contém somente a estrutura CNJ completa e dígitos ASCII, aceitando a máscara padrão ou os 20 dígitos sem pontuação. Distinguir campo vazio e formato inválido antes de consultar os processos. Não calcular nem confirmar matematicamente os dígitos verificadores; a consulta exata ao registro persistido determina se há correspondência.
- **RF10 — Envio e espera:** permitir envio pelo botão ou pela tecla Enter. Enquanto houver uma consulta em andamento, mostrar `Consultando…`, impedir nova submissão e alteração do campo até a conclusão. Uma falha deve devolver o controle ao usuário. Cada solicitação deve terminar em resultado ou mensagem de falha; adotar tempo máximo de espera de 15 segundos como premissa de experiência.

### 3. Localização e navegação

Usa a base já persistida para responder se o número informado está disponível e conduzir ao registro correto.

- **RF11 — Busca exata:** localizar o único processo correspondente ao CNJ validado, considerando equivalentes as duas formas de preenchimento aceitas. A consulta utiliza somente a base existente e não altera seus dados. A validade do número não comprova a existência de um registro nessa base.
- **RF12 — Processo encontrado:** encaminhar automaticamente para um destino específico e estável do processo encontrado. A página mínima deve apresentar `Processo encontrado`, o CNJ completo formatado, a ação `Voltar à consulta` e a ação `Sair`. O CNJ exibido deve corresponder ao resultado, sem inventar dados de processos ausentes.
- **RF13 — Acesso ao destino:** permitir recarregar ou abrir diretamente o endereço de um processo existente quando houver sessão válida. Para destino inválido ou processo ausente, mostrar uma mensagem de indisponibilidade do registro e uma ação para voltar à consulta. Ao voltar pela ação da página, manter o último CNJ consultado durante a mesma sessão.
- **RF14 — Processo não encontrado:** permanecer na consulta, preservar o número informado e apresentar `Não encontramos esse processo na base disponível. Confira o número e tente novamente.`. Essa resposta não deve afirmar que o processo inexiste no Judiciário, nem sugerir que uma consulta externa foi realizada.

### 4. Recuperação de erros e acessibilidade

Permite corrigir o preenchimento e retomar a jornada sem mensagens técnicas ou resultados ambíguos.

- **RF15 — Falhas previsíveis:** distinguir erro de preenchimento, credenciais recusadas, e-mail não confirmado, falha de envio da confirmação, link inválido ou expirado, processo ausente, falta de conexão, indisponibilidade do serviço e perda de sessão. Em falhas de consulta, preservar o campo e permitir nova tentativa manual, sem exigir recarga da aplicação. Falhas de infraestrutura nunca devem ser apresentadas como processo não encontrado.
- **RF16 — Sessão expirada durante a jornada:** interromper o acesso protegido e apresentar `Sua sessão expirou. Entre novamente para continuar.`. Nenhuma resposta de consulta recebida após a perda ou encerramento da sessão deve exibir dados ou encaminhar ao processo. Após nova autenticação, voltar à página inicial; não é obrigatório recuperar a consulta interrompida.
- **RF17 — Experiência acessível:** oferecer rótulos permanentes, operação completa por teclado, foco visível e ordem de navegação compreensível. Associar erros aos campos, anunciar carregamento e resultados a tecnologias assistivas e não depender apenas de cor. Permitir colar CNJs e senhas e utilizar gerenciadores de senha. Após a navegação, tornar identificável o título da nova página.

### 5. Cadastro e confirmação obrigatória de e-mail

Permite criar a própria conta e comprovar acesso ao endereço informado antes de entrar. A tela de cadastro tem somente os campos de e-mail e senha; o Resend é o serviço obrigatório para envio das mensagens de confirmação.

- **RF18 — Sign-up:** disponibilizar uma tela pública `Criar conta`, acessível pelo login, com somente e-mail, senha, ação `Criar conta` e retorno para `Entrar`. Não solicitar nome, telefone, CPF, confirmação de senha ou outros campos. Validar ambos os campos na interface e no backend antes de aceitar o cadastro: e-mail com formato válido e senha entre 8 e 128 caracteres, sem regras obrigatórias de composição, conforme premissa P7. Desconsiderar espaços externos do e-mail e diferenças entre maiúsculas e minúsculas para identificar a conta; preservar exatamente a senha informada. Um cadastro válido deve criar uma única conta com confirmação pendente, sem iniciar sessão.
- **RF19 — E-mail já cadastrado:** impedir contas duplicadas para o mesmo e-mail, inclusive em solicitações simultâneas ou repetidas. Uma nova tentativa de cadastro não pode substituir a senha ou o estado de confirmação da conta existente. Apresentar uma orientação comum para cadastros aceitos e e-mails já cadastrados: `Confira seu e-mail para continuar. Se já possui conta confirmada, entre.`. Para contas pendentes, permitir o reenvio conforme RF22; para contas já confirmadas, manter o acesso pelo login sem emitir nova confirmação.
- **RF20 — Envio pelo Resend:** após aceitar um novo cadastro, solicitar ao Resend o envio de uma mensagem ao e-mail cadastrado, contendo identificação do produto, finalidade da confirmação, prazo de validade e um link para confirmar o endereço. Não incluir senha, CNJ ou dados processuais. O aceite ou a entrega da mensagem pelo provedor não confirma a conta: a confirmação depende do uso válido do link pelo destinatário. O link não exige sessão autenticada, permite concluir a confirmação em outro navegador ou dispositivo e só pode confirmar a conta para a qual foi emitido.
- **RF21 — Confirmação e liberação do login:** adotar link de uso único com validade de 24 horas a partir de sua emissão. Uma confirmação válida deve mudar a conta de pendente para confirmada e apresentar `E-mail confirmado. Agora você pode entrar.` com ação `Entrar`. Links inválidos, adulterados, expirados ou substituídos não podem confirmar a conta. Um link já consumido não pode executar nova confirmação nem autenticar; informar que não é mais válido e oferecer entrada ou reenvio. Se uma conta pendente tentar entrar com credenciais corretas, não conceder sessão e mostrar `Confirme seu e-mail para entrar.` com acesso ao reenvio. Para credenciais incorretas, manter a resposta de RF2.
- **RF22 — Reenvio:** disponibilizar `Reenviar confirmação` na etapa de espera, no tratamento de link inválido ou expirado e após uma tentativa de login com credenciais corretas de uma conta pendente. Permitir informar o e-mail quando o contexto do link não identificar um destinatário válido. Adotar intervalo mínimo de 60 segundos e máximo de cinco solicitações de envio por e-mail em qualquer período de uma hora, contando envio inicial, repetições de cadastro e reenvios. A aplicação deve impor esses limites também no backend. Um novo link emitido substitui os anteriores; se o envio falhar, a conta permanece pendente e pode solicitar outro após o intervalo. Para endereço inexistente ou conta já confirmada, não criar conta nem enviar confirmação, e responder de forma neutra: `Se houver confirmação pendente para este e-mail, enviaremos as instruções.`. Informar a espera necessária ao atingir os limites.
- **RF23 — Recuperação do cadastro e do envio:** distinguir falha ao criar a conta de falha posterior ao solicitar o e-mail. Se a conta já tiver sido criada, preservá-la pendente e permitir reenvio, sem exigir novo cadastro ou alterar sua senha. Falhas, rejeições ou indisponibilidade do Resend não liberam login nem consulta. Cadastro, confirmação e reenvio devem indicar andamento, impedir envios repetidos e retornar controle em até 15 segundos, preservando o e-mail. Um timeout não implica que a conta deixou de ser criada ou que a mensagem não será entregue; orientar a conferir o e-mail, tentar entrar ou reenviar, e manter novas tentativas sem duplicação de conta.

### Regras de negócio

- **RN1 — Ordem da jornada:** para novos usuários, cadastro → confirmação do e-mail → login → sessão válida → entrada de CNJ válida → busca exata na base → resultado ou falha. Usuários com conta confirmada iniciam pelo login. Uma consulta rejeitada por autenticação, confirmação pendente ou validação não deve buscar processos.
- **RN2 — Identidade preservada:** remover a pontuação aceita para comparar duas entradas não modifica o identificador armazenado. O CNJ continua textual e seus zeros são significativos.
- **RN3 — Estrutura do domínio:** a numeração segue a estrutura `NNNNNNN-DD.AAAA.J.TR.OOOO`, com 20 dígitos. Nesta entrega, validar apenas essa estrutura e os caracteres numéricos; não verificar o cálculo dos dígitos verificadores. A Resolução CNJ nº 65 documenta o padrão e o cálculo oficial, que não integra a validação do produto nesta tarefa. Fontes: [explicação da numeração pelo CNJ](https://www.cnj.jus.br/programas-e-acoes/numeracao-unica/perguntas-frequentes/) e [Resolução nº 65](https://atos.cnj.jus.br/atos/detalhar/119).
- **RN4 — Validade e disponibilidade:** `1002271-82.2025.8.26.0003`, fornecido no prompt, é um exemplo válido de preenchimento, não uma promessa de resultado encontrado. A conferência do CSV atual não encontrou esse CNJ entre seus 100 processos. O cenário de sucesso deve utilizar um registro efetivamente disponível na base controlada de aceitação.
- **RN5 — Leitura:** todas as operações relativas a processos e movimentações nesta etapa são de leitura. Uma busca sem resultado não inicia carga, atualização, cadastro ou consulta externa.
- **RN6 — Resultado correto:** somente a correspondência exata autoriza o encaminhamento. Não apresentar aproximações, sugestões de outros processos ou resultados parciais.
- **RN7 — Confirmação obrigatória:** somente o uso válido do link confirma a conta. Cadastro realizado, mensagem aceita ou entregue pelo Resend e credenciais corretas, isoladamente, não concedem acesso. A confirmação libera o login por e-mail e senha; não é repetida a cada entrada.
- **RN8 — Identidade da conta:** um e-mail corresponde a no máximo uma conta, ignorando espaços externos e diferenças de maiúsculas e minúsculas. Cadastro repetido, reenvio e confirmação não alteram a senha existente nem os dados processuais.

## Critérios de aceitação

- **CA-01 — Entrada válida (US1; RF1, RF3):** dada uma conta com e-mail confirmado, quando forem informadas credenciais corretas, então a página inicial autenticada será exibida com o campo de CNJ e a ação `Consultar`.
- **CA-02 — Entrada recusada (US1, US4; RF1, RF2):** dados campos vazios ou e-mail malformado, quando houver tentativa de entrada, então os campos terão feedback compreensível. Dados e-mail desconhecido ou senha incorreta, então a mensagem de credenciais recusadas será a mesma e nenhuma sessão será concedida.
- **CA-03 — Acesso sem autorização (US8; RF4):** dada uma sessão ausente, inválida, expirada ou encerrada, ou uma conta com e-mail não confirmado, quando forem solicitadas a consulta ou a página de processo, inclusive diretamente ao backend, então o acesso será negado antes da busca e nenhum dado ou indicação de existência será retornado; na interface, haverá encaminhamento para entrar ou concluir a confirmação.
- **CA-04 — Abrangência da autorização (US3, US8; RF5):** dadas duas contas autenticadas e um processo existente na base disponibilizada, quando cada conta consultar seu CNJ, então ambas poderão chegar ao mesmo processo, sem exigir vínculo prévio de titularidade.
- **CA-05 — Campo vazio (US4; RF8, RF9):** dado um campo vazio ou preenchido apenas por espaços, quando houver envio, então será apresentada a mensagem `Informe o número do processo.` e nenhuma busca será realizada.
- **CA-06 — Formato incorreto (US4; RF8, RF9):** dados números incompletos ou excedentes, letras, pontuação incorreta ou espaços internos, quando houver envio pela interface ou diretamente ao backend, então a entrada será recusada antes da busca. Na interface, a mensagem orientará como preencher.
- **CA-07 — Formas equivalentes (US2, US3; RF8, RF11; RN2):** dado um CNJ com estrutura completa existente, quando for informado com a pontuação padrão ou somente com 20 dígitos, inclusive com espaços externos, então ambas as formas localizarão o mesmo processo, preservando os zeros e o identificador persistido.
- **CA-08 — Consulta exata sem cálculo do dígito verificador (US4; RF9; RN3):** dado um número com estrutura completa e dígitos ASCII, quando os dígitos verificadores não forem calculados pela aplicação, então a entrada ainda será normalizada e consultada exatamente na base; a resposta dependerá exclusivamente de existir o mesmo CNJ armazenado.
- **CA-09 — Processo encontrado (US3; RF11, RF12):** dado um CNJ com estrutura completa existente, quando a consulta terminar com sucesso, então o usuário será encaminhado à página específica desse processo, com seu CNJ correto e as ações `Voltar à consulta` e `Sair`.
- **CA-10 — Processo ausente (US4; RF14; RN4):** dado um CNJ válido ausente da base, quando a consulta terminar, então a aplicação permanecerá na consulta, preservará o valor e informará que não encontrou o processo na base disponível. Para o CSV atual, o exemplo do prompt deve produzir esse resultado, salvo alteração controlada da base de aceitação.
- **CA-11 — Consulta em andamento (US2; RF10):** dada uma consulta pendente, quando o usuário tentar clicar novamente ou pressionar Enter, então não haverá outra consulta simultânea, o campo estará temporariamente indisponível e o estado `Consultando…` será perceptível visualmente e por leitor de tela.
- **CA-12 — Falha recuperável (US5; RF10, RF15):** dada uma falha de rede, indisponibilidade ou ausência de resposta por 15 segundos, quando a tentativa terminar, então uma mensagem de falha será apresentada, o campo será preservado e uma nova tentativa ficará disponível. A aplicação não apresentará processo ausente nem navegará devido a uma resposta atrasada daquela tentativa.
- **CA-13 — Expiração (US5; RF3, RF16):** dada uma sessão que atinja oito horas desde a autenticação, quando houver acesso protegido, então será exigida nova entrada. Se a sessão perder a validade durante uma consulta, a interface não exibirá seu resultado e orientará a autenticar novamente.
- **CA-14 — Saída (US7; RF6, RF16):** dada uma sessão válida, quando a pessoa escolher `Sair`, então voltará à tela de acesso e a sessão anterior deixará de autorizar consultas. Voltar pelo navegador, recarregar ou abrir o endereço anterior não permitirá recuperar conteúdo protegido, inclusive se houver resposta pendente.
- **CA-15 — Destino e retorno (US3; RF3, RF13):** dada uma sessão válida, quando um destino existente for aberto diretamente ou recarregado, então o mesmo processo será identificado. Para destino inválido ou ausente, haverá mensagem clara e retorno à consulta. Ao usar `Voltar à consulta`, o último CNJ estará preenchido.
- **CA-16 — Correção após erro (US4; RF14, RF15):** dada uma consulta com resultado ausente ou falha, quando o campo for corrigido e enviado novamente, então o novo resultado corresponderá somente à nova entrada, sem manter mensagem incompatível da tentativa anterior.
- **CA-17 — Acessibilidade e telas pequenas (US6; RF17):** dada a jornada de cadastro, confirmação, reenvio, entrada, consulta e retorno, quando executada apenas por teclado, com leitor de tela, em largura de 320 pixels CSS ou com zoom de 200%, então os controles permanecerão identificáveis, utilizáveis e sem sobreposição ou rolagem horizontal necessária para concluir as ações.
- **CA-18 — Base preservada (US3, US8; RF11; RN5):** dados processos e movimentações previamente persistidos, quando forem executadas consultas com sucesso, sem resultado e com falha, então seus registros, relacionamentos, quantidades e valores permanecerão inalterados.
- **CA-19 — Qualidade (O6; RF1–RF23):** dado o código produzido, quando forem executadas as suítes e verificações dos aplicativos afetados, então os cenários relevantes passarão, a cobertura mínima de 80% será respeitada em cada aplicativo e os fluxos críticos estarão protegidos com o Resend simulado, sem depender de tribunais ou serviços externos na suíte automatizada.
- **CA-20 — Cadastro mínimo (US9; RF18, RF20):** dado um e-mail ainda não cadastrado e uma senha aceita, quando forem enviados os únicos dois campos da tela de sign-up, então será criada uma conta pendente, será solicitado o envio da confirmação pelo Resend e nenhuma sessão ou consulta será liberada.
- **CA-21 — Cadastro inválido (US9; RF18):** dados campos vazios, e-mail malformado ou senha fora dos limites de 8 a 128 caracteres, quando houver envio pela tela ou diretamente ao backend, então a entrada será recusada com orientação compreensível, sem criar conta nem solicitar envio ao Resend. Senhas nos limites aceitos devem ser preservadas sem remoção de espaços ou alteração de caracteres.
- **CA-22 — Cadastro repetido (US9, US11; RF19; RN8):** dado um e-mail já cadastrado, quando houver novo cadastro, inclusive simultâneo, com variação de maiúsculas ou espaços externos, então continuará existindo uma única conta, sua senha e estado de confirmação serão preservados, a orientação será a mesma do cadastro aceito e os limites de envio continuarão valendo.
- **CA-23 — Login antes da confirmação (US10, US8; RF3, RF21; RN7):** dada uma conta pendente com credenciais corretas, quando tentar entrar, então receberá a orientação para confirmar o e-mail e a opção de reenvio, sem obter sessão. O aceite ou a entrega do e-mail pelo Resend não muda esse resultado. Com senha incorreta, a resposta continuará sendo a de credenciais recusadas.
- **CA-24 — Confirmação válida (US10; RF20, RF21):** dado um link válido e ainda não consumido, quando a confirmação for concluída antes de 24 horas, inclusive em outro navegador sem sessão, então somente a conta associada terá o e-mail confirmado, haverá orientação para entrar e nenhuma sessão será criada automaticamente. O login posterior com a senha cadastrada permitirá continuar a jornada.
- **CA-25 — Link sem validade (US10, US11; RF21):** dado um link inválido, adulterado, expirado por ter atingido 24 horas desde a emissão, substituído ou já consumido, quando houver tentativa de confirmação, então nenhuma conta pendente será confirmada e nenhuma sessão será criada; a interface explicará a indisponibilidade do link e oferecerá entrada ou reenvio. Uma conta já confirmada permanecerá confirmada.
- **CA-26 — Reenvio e limites (US11; RF22):** dada uma conta pendente dentro dos limites, quando solicitar reenvio, então o Resend será acionado para o e-mail cadastrado e o novo link substituirá os anteriores. Tentativas antes de 60 segundos ou acima de cinco envios solicitados na última hora, inclusive por cadastro repetido ou chamada direta ao backend, serão impedidas com orientação sobre a espera. Para e-mail inexistente ou conta confirmada, a resposta será neutra, sem envio ou criação de conta.
- **CA-27 — Falha de envio e recuperação (US9, US11; RF23):** dado um cadastro persistido e uma falha ou rejeição do Resend, quando o envio não puder ser concluído, então a conta permanecerá pendente, sem sessão, e a interface permitirá tentar reenviar respeitando os limites. Dado um timeout com resultado desconhecido, então haverá orientação para conferir o e-mail, entrar ou reenviar, e repetir a operação não criará outra conta nem substituirá a senha.
- **CA-28 — Conteúdo da confirmação (US10; RF20):** dado um cadastro aceito, quando a mensagem de confirmação for gerada, então conterá identificação do produto, finalidade, prazo e link direcionado ao ambiente correto, sem senha ou dados processuais. A aceitação em ambiente controlado deve comprovar envio pelo Resend, recebimento na caixa de e-mail de aceitação e conclusão do fluxo pelo link.

### Definição de pronto

- Todos os critérios CA-01 a CA-28 atendidos, com evidências de aceitação e associação dos testes aos comportamentos relevantes.
- Jornada completa de cadastro com somente e-mail e senha, envio pelo Resend, confirmação obrigatória, login e consulta disponível em ambiente controlado, usando a base da etapa anterior.
- Envio e recebimento da confirmação pelo Resend verificados com uma caixa de e-mail controlada de aceitação; contas pendentes continuam bloqueadas em todas as formas de acesso. Esse aceite da integração complementa a suíte automatizada com o provedor simulado.
- Entrada CNJ estruturalmente validada no backend e busca exata comprovada, sem cálculo matemático dos dígitos verificadores.
- Testes unitários, de integração e E2E pertinentes aprovados; cobertura mínima de 80% por aplicativo afetado, sem exclusões artificiais para atingir o percentual.
- Lint, verificação de tipos e build aprovados nos aplicativos afetados; documentação suficiente para acessar o ambiente, configurar o envio de confirmação sem expor credenciais, cadastrar e confirmar a conta de aceitação e executar as verificações.
- Nenhum defeito pendente que comprometa cadastro, confirmação de e-mail, autenticação, autorização, identidade do processo, preservação da base ou conclusão acessível da jornada.

## Experiência do usuário

### Perfis e fluxo principal

O perfil principal é uma pessoa que possui um e-mail acessível e conhece o número do processo, mas não precisa saber o significado dos campos do CNJ ou como a base foi alimentada. Ela pode criar a própria conta e precisa confirmar seu endereço antes de entrar. O perfil secundário é o responsável por disponibilizar o ambiente e o envio das confirmações pelo Resend; não haverá uma tela administrativa para ele nesta etapa.

1. A pessoa abre a aplicação e, sem sessão válida, encontra a tela de acesso com a opção `Criar conta`.
2. Se ainda não possui conta, abre o sign-up, informa somente e-mail e senha e escolhe `Criar conta`.
3. Recebe orientação para conferir o e-mail. A conta fica pendente enquanto a mensagem enviada pelo Resend não for usada para confirmar o endereço. Se necessário, solicita reenvio.
4. Abre o link e conclui a confirmação; a aplicação informa que o e-mail foi confirmado e oferece `Entrar`. Quem já tem uma conta confirmada pode iniciar diretamente pelo login.
5. Informa e-mail e senha e escolhe `Entrar`. Uma conta ainda pendente recebe orientação de confirmação e continua sem acesso.
6. Na página inicial autenticada, encontra o campo `Número do processo (CNJ)` e a ação `Consultar`.
7. Digita ou cola o CNJ e envia a consulta; recebe feedback de preenchimento ou de espera.
8. Se o processo estiver na base, chega à página mínima que confirma o CNJ encontrado.
9. Pode voltar à consulta ou sair. Se o processo estiver ausente ou houver falha, recebe orientação na própria jornada e pode tentar novamente.

### Estados da interface e mensagens

| Estado | Conteúdo e comportamento esperado |
| --- | --- |
| Acesso inicial | E-mail, senha, `Entrar` e acesso a `Criar conta`, com rótulos visíveis e sem dados de processos. |
| Cadastro inicial | Somente e-mail e senha, orientação sobre os limites da senha, `Criar conta` e retorno a `Entrar`. |
| Cadastro em andamento | `Criando conta…`; impedir submissões repetidas e devolver controle em até 15 segundos. |
| Cadastro inválido | Indicar o campo obrigatório, e-mail inválido ou `Use uma senha de 8 a 128 caracteres.`, junto ao campo correspondente. |
| Cadastro aceito ou e-mail já cadastrado | `Confira seu e-mail para continuar. Se já possui conta confirmada, entre.`; oferecer entrada e reenvio, sem substituir credenciais existentes. |
| Falha ao criar conta | `Não foi possível concluir o cadastro agora. Tente novamente.`; preservar o e-mail. Se o resultado for desconhecido, orientar também a conferir a caixa de entrada. |
| Confirmação pendente | `Confirme seu e-mail para entrar.`; orientar a conferir a caixa de entrada e o spam e disponibilizar `Reenviar confirmação`. |
| Confirmação concluída | `E-mail confirmado. Agora você pode entrar.` e ação `Entrar`, sem login automático. |
| Link inválido, expirado ou já utilizado | `Este link não é mais válido. Solicite outra confirmação ou entre se já confirmou seu e-mail.`; não liberar acesso. |
| Confirmação ou reenvio em andamento | `Confirmando e-mail…` ou `Solicitando confirmação…`; impedir repetição e devolver controle em até 15 segundos. |
| Falha ao concluir a confirmação | `Não foi possível concluir a confirmação agora. Abra o link novamente ou tente entrar se já confirmou seu e-mail.`; não conceder sessão. |
| Reenvio solicitado | `Se houver confirmação pendente para este e-mail, enviaremos as instruções.`; não afirmar entrega na caixa de entrada. |
| Reenvio limitado | `Aguarde para solicitar outro e-mail.` com indicação do tempo restante para uma nova tentativa permitida. |
| Falha no envio da confirmação | `Não foi possível enviar a confirmação agora. Tente reenviar.`; manter a conta pendente e permitir recuperação. |
| Resultado do envio desconhecido | `Não foi possível confirmar o envio. Confira seu e-mail; se a mensagem não chegar, tente reenviar.`; não recriar a conta. |
| Autenticando | `Entrando…`; impedir envios repetidos e concluir em sucesso ou falha, adotando o mesmo limite de espera de 15 segundos. |
| Credenciais recusadas | `E-mail ou senha incorretos. Confira os dados e tente novamente.`; manter o e-mail para correção. |
| Falha ao entrar | `Não foi possível entrar agora. Tente novamente.`; permitir nova tentativa, sem tratar indisponibilidade como senha incorreta. |
| Consulta inicial | Campo destacado, `Consultar` e ajuda: `Digite os 20 números do processo, com ou sem pontos e traço.`; o exemplo pode aparecer como ajuda adicional, sem sugerir disponibilidade. |
| Campo vazio | `Informe o número do processo.` associado ao campo. |
| Formato inválido | `Confira o formato: digite os 20 números do processo, com ou sem pontos e traço.` |
| Número inválido | `Esse número de processo não é válido. Confira os números e tente novamente.` |
| Consultando | `Consultando…`; impedir outro envio e preservar o campo. |
| Processo encontrado | Navegar e mostrar `Processo encontrado`, CNJ completo e ações de retorno e saída. |
| Processo ausente | `Não encontramos esse processo na base disponível. Confira o número e tente novamente.`; manter campo e ação de consulta. |
| Falha de conexão identificada | `Não foi possível conectar. Verifique sua conexão e tente novamente.`; não descartar o campo. |
| Serviço indisponível ou tempo excedido | `Não foi possível concluir a consulta agora. Tente novamente.`; reabilitar a consulta e preservar o campo. |
| Sessão expirada | `Sua sessão expirou. Entre novamente para continuar.`; retirar conteúdo protegido e apresentar acesso. |
| Destino inválido ou ausente | `Não encontramos esse processo na base disponível.` e ação `Voltar à consulta`, quando autenticado. |
| Saída concluída | Tela de acesso, sem CNJ ou resultado da sessão encerrada. |

### Diretrizes de UI/UX e acessibilidade

- Usar português claro e dar prioridade visual à ação principal de cada tela. A pessoa não deve precisar conhecer CSV, banco de dados, identificadores internos, endpoints ou códigos de erro.
- Manter rótulos além dos placeholders, indicar erros próximos aos campos e posicionar o foco de modo previsível. Uma nova tentativa deve substituir o estado da tentativa anterior.
- Garantir leitura e operação em telas pequenas, teclado e ampliação, conforme CA-17. Mensagens devem ser anunciadas sem depender de mudanças de cor ou de uma animação.
- Mostrar senha de forma protegida por padrão; não bloquear preenchimento assistido por gerenciadores de senha.
- Aplicar as mesmas diretrizes de acessibilidade ao cadastro, à confirmação e ao reenvio. O e-mail deve ter uma ação textual compreensível para confirmar o endereço, com alternativa de link copiável, sem depender apenas de imagens.
- Não prometer informação atualizada no tribunal: a mensagem de resultado refere-se à base disponível no produto.

## Restrições técnicas de alto nível

### Contexto e premissas

| Identificador | Premissa adotada para esta versão |
| --- | --- |
| P1 | Requisito confirmado pelo usuário: cadastro público com somente e-mail e senha, confirmação obrigatória do e-mail antes do login e uso do Resend para enviar as mensagens. Não há dependência de criação manual de contas. |
| P2 | Todas as contas autenticadas têm o mesmo acesso de leitura a todos os processos da base disponibilizada. Abrangência proposta na pergunta de esclarecimento, sem resposta recebida até a redação. |
| P3 | A base disponibilizada ao produto é adequada ao acesso compartilhado previsto em P2. Se houver necessidade de restrições por processo ou usuário, essa premissa exige revisão antes da exposição desses dados. |
| P4 | Sessão de no máximo oito horas e espera de no máximo 15 segundos por tentativa de cadastro, confirmação, reenvio, entrada ou consulta são decisões propostas neste PRD para tornar expiração e recuperação verificáveis. O limite de espera não é uma promessa de entrega do e-mail. |
| P5 | A validação desta entrega limita-se à estrutura CNJ e aos 20 dígitos ASCII; o cálculo do dígito verificador fica fora do escopo. |
| P6 | Confirmação por link de uso único válido por 24 horas, reenvio a partir de 60 segundos e máximo de cinco solicitações de envio por e-mail em qualquer período de uma hora são decisões propostas do produto, não limites atribuídos ao Resend. |
| P7 | Senhas de 8 a 128 caracteres, sem composição obrigatória e sem transformações do conteúdo informado, são a política proposta para o cadastro nesta etapa. |

### Dependências e integração com a fundação

- Reutilizar a base de processos e movimentações, o CNJ textual único e a capacidade de busca por CNJ da primeira etapa. Os 100 processos e 5.568 movimentações são a referência da carga fornecida, não limites gerais da aplicação.
- A conferência do CSV atual encontrou 100 CNJs com formato e dígitos verificadores consistentes. O exemplo do prompt é válido, mas não está presente nesse conjunto. Os dados de aceitação devem distinguir explicitamente um CNJ existente e outro válido ausente.
- **Validação de entrada:** a API confere estrutura completa e dígitos ASCII, aceita a máscara padrão ou os 20 dígitos sem pontuação e preserva zeros à esquerda. Não calcula os dígitos verificadores nesta entrega.
- A entrega depende de ambientes de aceitação isolados, com cadastro e confirmação disponíveis. Criar contas não deve apagar ou recarregar processos.
- A integração de envio depende de uma conta Resend configurada, credencial de API protegida no backend, domínio de envio verificado, remetente definido e endereço público correto para o retorno da confirmação. Esses pré-requisitos de envio são documentados pelo provedor em [envio com Node.js](https://resend.com/docs/send-with-nodejs) e [domínios verificados](https://resend.com/docs/dashboard/domains/introduction); os detalhes de configuração pertencem à TechSpec.
- O repositório inspecionado contém a fundação do backend, mas não um frontend ou uma API HTTP de consulta prontos. A interface e a exposição protegida da consulta fazem parte desta entrega; seus contratos e organização serão definidos na TechSpec.

### Tecnologia, segurança e privacidade

- Preservar a separação entre frontend e backend e o PostgreSQL existente. Seguir as tecnologias e regras do projeto: React com TypeScript no frontend e Node.js com TypeScript no backend. Arquitetura, contratos HTTP, mecanismo de sessão, armazenamento de credenciais e bibliotecas pertencem à TechSpec.
- Credenciais e material de sessão não podem aparecer em mensagens, endereços ou logs. Senhas não podem ser armazenadas em texto puro nem devolvidas ao cliente.
- Resend é a integração externa obrigatória para envio de confirmação. O estado de confirmação, a validade dos links e a autorização pertencem à aplicação; eventos de envio ou entrega não substituem a confirmação pelo usuário. Links de confirmação só devem ser expostos no e-mail e na jornada prevista, sem registro de seus segredos em logs. A credencial do Resend não pode ser exposta ao frontend.
- Compartilhar com o Resend apenas o destinatário e o conteúdo necessário à confirmação; nunca enviar senhas, CNJs ou movimentações. A integração não inclui campanhas, listas de marketing ou envio de dados processuais.
- Proteger a comunicação de autenticação e consulta em ambientes publicados. O CNJ deve ser tratado como dado processual; não encaminhá-lo a serviços externos para completar a busca.
- Expor somente as informações necessárias à página mínima desta etapa. A proteção deve ser aplicada no backend e continuar válida após saída ou expiração.
- Os tempos de oito horas e 15 segundos são limites de comportamento do produto. Esta etapa não estabelece metas de tráfego de produção ou testes de carga em larga escala.

### Requisitos de testes

Seguir [as regras de testes do projeto](../../.agents/rules/tests.md), com testes independentes, repetíveis e assertions sobre comportamentos. Usar Vitest para unidade e integração e Playwright para os fluxos E2E; preservar a cobertura mínima de 80% em cada aplicativo afetado e os testes da fundação.

| Camada | Comportamentos mínimos a proteger |
| --- | --- |
| Unidade | Entrada obrigatória, política de senha, identidade do e-mail, formatos aceitos e recusados, preservação de zeros, uso da validação de CNJ, decisões de autorização e expiração, estados da interface e mensagens. Controlar tempo para limites de sessão, espera, validade do link e reenvio. |
| Integração | Cadastro e unicidade de conta, confirmação válida/inválida/expirada/repetida, reenvio e limites, falhas e timeout do Resend simulado, autenticação válida e recusada inclusive com e-mail pendente, sessão ausente/inválida/expirada/encerrada, proteção de solicitações diretas, uso da busca existente, processo encontrado/ausente, preservação da base e falhas de dependências. |
| Interface | Cadastro com somente dois campos, espera pela confirmação, retorno ao login, feedback de reenvio, envio por Enter, prevenção de duplicidade, rótulos e erros acessíveis, preservação do campo, recuperação após falha e descarte de respostas após timeout, saída ou perda da sessão. |
| E2E | Cadastro → bloqueio antes da confirmação → confirmação → entrada → consulta existente → destino → retorno; link expirado → reenvio → confirmação; consulta ausente → correção; bloqueio de acesso sem sessão; saída e tentativa de retorno. Cobrir a jornada essencial por teclado e em tela pequena. |

Usar contas e dados controlados e isolar o banco de testes. Simular Resend, expiração, rede e indisponibilidade; os testes automatizados não dependem de tribunais, IA, e-mails reais ou provedores externos. Verificar a colaboração com o provedor por cenários de aceite, rejeição e resultado desconhecido, sem esconder falhas de confirmação. Complementar a suíte com a aceitação controlada do envio real e recebimento pelo Resend, sem torná-la uma dependência de cada execução de testes. A evidência de aceitação deve incluir conferência com leitor de tela, ampliação e largura mínima, complementando os testes automatizados de acessibilidade.

## Fora do escopo

- Redefinição de processos, movimentações, seus relacionamentos, ingestão CSV ou armazenamento. O cálculo dos dígitos verificadores CNJ também permanece fora do escopo.
- Visualização completa dos dados do processo, metadados adicionais e lista visual de movimentações. A página de destino se limita ao CNJ encontrado e às ações de navegação e saída.
- Resumo por IA, integração com LLM, avaliação de resumo ou qualquer funcionalidade desses PRDs posteriores.
- Scraping, consultas ao portal do TJSP, atualização de andamentos ou consulta de dados processuais em fontes externas. O envio de confirmação pelo Resend está incluído nesta etapa.
- Busca por nome, CPF, parte, assunto ou outros filtros; pesquisa parcial, aproximada, sugestões, listagens e mecanismos avançados de pesquisa.
- Recuperação ou alteração de senha ou e-mail pela interface, login social, múltiplos fatores e painel de gestão de contas. Cadastro público com e-mail e senha, confirmação obrigatória e reenvio pelo Resend estão incluídos nesta etapa.
- Perfis administrativos no produto, permissões por processo, vínculo entre usuários e processos ou separação de dados por organização, sob a premissa P2.
- Histórico de consultas, favoritos, notificações, exportações, painéis analíticos e métricas de adoção.
- Criação, edição ou exclusão de processos e movimentações pela consulta; qualquer mudança nos dados fornecidos pela etapa anterior.
