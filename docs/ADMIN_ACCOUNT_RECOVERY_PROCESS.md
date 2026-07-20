# Processo administrativo seguro de recuperação de conta

## Objetivo

Este documento define o processo administrativo para recuperar uma conta do SolAmigo quando o titular perdeu o segundo fator de autenticação e não possui um código de recuperação MFA utilizável.

O processo foi desenhado para reduzir fraude por engenharia social, abuso interno e remoção indevida do MFA. Ele não autoriza atalhos no Supabase e não transforma o suporte comum em administrador de autenticação.

## Estado operacional

O processo está definido e deve ser usado como requisito para a futura ferramenta administrativa. A execução de uma recuperação administrativa permanece **bloqueada** enquanto todos os pré-requisitos técnicos e organizacionais deste documento não estiverem disponíveis em produção.

Até lá, o suporte pode abrir, classificar e escalar o caso, mas não pode remover fatores, alterar o e-mail, redefinir a senha ou modificar registros de autenticação.

## Escopo

Aplica-se somente quando o usuário:

- conhece o e-mail da conta;
- perdeu o acesso ao aplicativo autenticador;
- não possui código de recuperação MFA válido;
- não consegue concluir o fluxo normal de autoatendimento;
- solicita formalmente a recuperação da própria conta ou da conta empresarial pela qual é responsável.

Este processo não substitui:

- recuperação normal de senha;
- uso de código de recuperação MFA de uso único;
- alteração voluntária de e-mail por usuário autenticado;
- investigação de fraude, disputa societária ou ordem judicial;
- recuperação de uma conta excluída.

## Modelo de ameaças

O processo considera, no mínimo:

- atacante que controla o telefone, mas não a conta;
- atacante que controla o e-mail, mas não a identidade empresarial;
- SIM swap e falsificação de identificador de chamada;
- uso de informações públicas de CNPJ, redes sociais ou propostas comerciais;
- falsificação de documentos e capturas de tela;
- atendente mal-intencionado ou credencial administrativa comprometida;
- disputa entre sócios, vendedores ou antigos colaboradores;
- tentativa de trocar o e-mail e remover o MFA na mesma solicitação;
- recuperação iniciada logo após mudanças suspeitas na conta.

## Princípios obrigatórios

1. **Autoatendimento primeiro.** O suporte deve tentar recuperação de senha e código de recuperação antes de abrir o fluxo administrativo.
2. **Privilégio mínimo.** Atendimento comum não recebe acesso ao Supabase Auth Admin API nem à `SUPABASE_SERVICE_ROLE_KEY`.
3. **Duplo controle.** A pessoa que valida a identidade não pode ser a mesma que aprova e executa a recuperação.
4. **Autenticação forte do operador.** Toda aprovação e execução exige conta administrativa individual, MFA em AAL2 e confirmação recente de senha.
5. **Canal seguro.** Evidências sensíveis nunca são recebidas por e-mail, telefone, WhatsApp, chat comum ou ticket sem proteção específica.
6. **Dados mínimos.** O caso registra apenas o necessário para provar a decisão e permitir auditoria.
7. **Sem senha temporária.** Nenhum operador cria, visualiza ou envia senha ao usuário.
8. **Sem alteração manual.** É proibido editar diretamente `auth.users`, `auth.mfa_factors`, `mfa_recovery_codes` ou qualquer tabela relacionada.
9. **Sessões sempre revogadas.** Uma recuperação aprovada encerra todas as sessões antes de devolver o acesso.
10. **MFA obrigatório novamente.** O caso só é encerrado depois de um novo fator TOTP e novos códigos de recuperação terem sido configurados.
11. **Notificação fora do fluxo.** O e-mail original e demais contatos previamente verificados recebem aviso de cada etapa crítica.
12. **Negar é seguro.** Quando a identidade não puder ser comprovada com confiança, a conta permanece protegida.

## Pré-requisitos para habilitar a execução

A recuperação administrativa só pode ser habilitada quando existirem todos os itens abaixo:

- papel administrativo validado no servidor, sem depender de campos editáveis no navegador;
- contas administrativas individuais, sem conta compartilhada;
- MFA AAL2 obrigatório para operadores;
- confirmação de senha realizada nos cinco minutos anteriores à execução;
- ferramenta interna protegida, sem `service_role` no frontend;
- ação de recuperação implementada no servidor por Admin API ou Edge Function autenticada;
- log de auditoria append-only para solicitações, aprovações, recusas e execução;
- separação entre solicitante, verificador, aprovador e executor;
- canal seguro para evidências, com controle de acesso e expiração;
- notificações automáticas para os contatos já verificados da conta;
- capacidade de revogar globalmente sessões e códigos de recuperação;
- capacidade de exigir nova configuração do MFA antes de liberar rotas protegidas;
- política de retenção e descarte de evidências aprovada para LGPD;
- procedimento de resposta a incidente e revisão periódica dos acessos administrativos.

Se um desses requisitos estiver ausente, o caso deve permanecer no estado **bloqueado — pré-requisito indisponível**.

## Papéis e segregação de funções

### Atendente de suporte

- registra a solicitação e orienta o autoatendimento;
- coleta somente os dados mínimos permitidos;
- não valida documentos sensíveis;
- não acessa dados de autenticação;
- não aprova nem executa a recuperação.

### Verificador de identidade

- analisa evidências no canal seguro;
- registra quais categorias de evidência foram confirmadas, sem copiar segredos;
- atribui o nível de risco;
- recomenda aprovação, recusa ou escalonamento;
- não executa a ação administrativa.

### Aprovador de segurança

- revisa o caso e a recomendação de forma independente;
- confirma que o período de espera foi cumprido;
- aprova ou recusa com justificativa;
- não pode ser o mesmo operador que executará a recuperação.

### Executor autorizado

- autentica-se novamente com MFA AAL2 e senha recente;
- executa somente a ação aprovada, pela ferramenta interna;
- confere o resultado técnico e registra o identificador da operação;
- não modifica o escopo aprovado.

### Auditor

- revisa amostras, exceções, recusas e recuperações concluídas;
- não participa da validação nem da execução do mesmo caso;
- comunica desvios ao responsável de segurança.

## Estados do caso

Todo caso recebe um identificador aleatório e percorre somente os estados:

1. `received` — solicitação recebida;
2. `self_service_required` — usuário ainda deve tentar autoatendimento;
3. `identity_verification` — verificação forte em andamento;
4. `cooling_off` — período de espera obrigatório;
5. `pending_second_approval` — aguardando revisão independente;
6. `approved` — autorizado para execução dentro da janela definida;
7. `denied` — evidência insuficiente ou risco incompatível;
8. `blocked` — pré-requisito técnico ou organizacional indisponível;
9. `executing` — ação administrativa em andamento;
10. `recovered_pending_mfa` — acesso devolvido, aguardando novo MFA;
11. `closed` — novo MFA e códigos confirmados;
12. `security_incident` — suspeita de fraude ou execução indevida.

Um estado anterior não pode ser apagado ou sobrescrito. As transições devem gerar eventos imutáveis de auditoria.

## Etapa 1 — abertura e triagem

O atendente deve:

1. criar um caso antes de solicitar qualquer informação adicional;
2. registrar e-mail da conta, nome informado, empresa informada, motivo e horário aproximado da perda de acesso;
3. orientar a recuperação normal de senha, sem pedir a senha;
4. orientar o uso do código de recuperação MFA, sem pedir o código;
5. confirmar apenas se o usuário ainda controla o e-mail original, sem solicitar que encaminhe mensagens privadas;
6. verificar se existe suspeita de aparelho roubado, e-mail comprometido, disputa societária ou fraude;
7. classificar o caso e encaminhá-lo ao verificador de identidade.

## Informações proibidas no atendimento comum

Nunca solicitar, receber, copiar ou armazenar:

- senha atual, antiga ou proposta;
- código TOTP;
- código de recuperação MFA;
- QR Code ou chave secreta do autenticador;
- `access_token`, `refresh_token`, cookie ou cabeçalho `Authorization`;
- chave `service_role` ou credencial do Supabase;
- foto integral de cartão bancário;
- código de segurança de cartão;
- captura de tela de gerenciador de senhas;
- documento pessoal por e-mail, WhatsApp ou chat comum;
- backup do banco ou conteúdo bruto de tabelas de autenticação.

## Etapa 2 — verificação forte de identidade

Nenhuma evidência isolada é suficiente. O verificador deve obter ao menos **dois sinais independentes**, sendo pelo menos um deles não público e previamente vinculado à conta.

### Sinais preferenciais

- resposta a desafio assinado enviado ao e-mail original já verificado;
- controle de domínio corporativo previamente registrado na conta;
- confirmação por contato empresarial secundário registrado antes do incidente;
- identificador de cobrança ou transação já existente, sem solicitar dados completos do cartão;
- dados internos de uma proposta ou configuração que não estejam disponíveis publicamente;
- confirmação por representante legal já vinculado à empresa em registros internos;
- evidência documental enviada exclusivamente por canal seguro, quando aprovada pelo responsável de privacidade.

### Sinais que nunca podem ser usados sozinhos

- número de telefone ou SMS;
- identificador de chamada;
- nome, CPF ou CNPJ disponível publicamente;
- endereço encontrado na internet;
- logotipo, site ou rede social da empresa;
- captura de tela sem origem verificável;
- conhecimento do nome de clientes ou valores públicos;
- acesso recente ao mesmo endereço IP;
- posse de um aparelho anteriormente usado.

### Conta sem acesso ao e-mail original

A perda simultânea do e-mail original aumenta o risco e exige:

- no mínimo três sinais independentes;
- confirmação por representante empresarial previamente vinculado, quando existir;
- análise de disputa societária ou mudança recente de responsável;
- período de espera mínimo de 48 horas;
- duas aprovações independentes de segurança;
- notificação ao e-mail original antes de qualquer alteração;
- processo separado para troca de e-mail, sem executar troca e remoção do MFA como uma única ação silenciosa.

## Etapa 3 — avaliação de risco

O caso deve ser recusado ou escalado como incidente quando houver:

- informações contraditórias;
- pressão para ignorar o período de espera;
- solicitação para criar senha temporária;
- pedido para não notificar o e-mail original;
- mudança recente de e-mail, senha, MFA, empresa ou responsável;
- múltiplas tentativas de recuperação falhas;
- disputa entre sócios, funcionários ou ex-colaboradores;
- indício de e-mail comprometido;
- atividade anômala ou acesso suspeito;
- documento aparentemente alterado;
- operador com conflito de interesse;
- solicitação originada por canal não verificável.

## Etapa 4 — período de espera e notificações

- Casos de risco normal com controle do e-mail original aguardam no mínimo 24 horas.
- Casos sem controle do e-mail original ou com risco elevado aguardam no mínimo 48 horas.
- O prazo começa somente após a verificação inicial estar completa.
- O e-mail original recebe aviso de solicitação, aprovação e conclusão.
- Contatos secundários previamente verificados recebem aviso quando a política de privacidade permitir.
- A mensagem inclui instruções para contestar, mas não revela evidências nem dados internos.
- Uma contestação válida interrompe imediatamente o fluxo e move o caso para `security_incident`.

O período de espera só pode ser reduzido por incidente documentado que envolva risco maior em manter o acesso atual. A exceção exige duas aprovações adicionais e auditoria posterior obrigatória.

## Etapa 5 — aprovação em duplo controle

Antes da aprovação, o aprovador deve confirmar:

- identidade verificada por sinais independentes;
- ausência de contradições relevantes;
- período de espera concluído;
- notificações enviadas aos contatos existentes;
- escopo exato da ação;
- operador executor diferente do verificador e do aprovador;
- janela de execução curta, com expiração automática;
- pré-requisitos técnicos ativos;
- registro de justificativa sem segredos.

A aprovação expira se não for executada dentro da janela definida. Um novo risco ou contestação invalida a aprovação.

## Etapa 6 — execução técnica autorizada

O executor deve:

1. entrar na ferramenta interna com conta administrativa individual;
2. confirmar MFA em AAL2 e senha nos cinco minutos anteriores;
3. abrir o caso aprovado pelo identificador, sem pesquisar usuários livremente;
4. conferir `user_id`, e-mail original e ação autorizada;
5. revogar globalmente todas as sessões pelo Supabase Auth Admin API;
6. revogar todos os códigos de recuperação MFA ativos;
7. remover os fatores MFA exclusivamente pelo Supabase Auth Admin API;
8. marcar o perfil como aguardando nova configuração de MFA pela ação do servidor;
9. nunca definir ou visualizar uma senha;
10. enviar o fluxo oficial de recuperação de senha ao e-mail verificado, quando necessário;
11. registrar o resultado, os identificadores técnicos e os operadores envolvidos;
12. encerrar a própria sessão administrativa após a atividade quando a política exigir.

É proibido executar SQL improvisado, usar o painel do Supabase para editar registros, compartilhar a `service_role` ou chamar a Admin API a partir do navegador.

## Alteração de e-mail durante a recuperação

A alteração de e-mail é uma ação separada e de risco elevado:

- não deve ser feita automaticamente junto com a remoção do MFA;
- exige comprovação adicional e duas aprovações independentes;
- deve notificar o e-mail original antes da mudança;
- deve respeitar período de espera de pelo menos 48 horas;
- deve preservar o histórico dos endereços anterior e novo no log de auditoria, com dados minimizados;
- deve ser cancelada diante de contestação ou conflito societário;
- nunca deve usar um endereço fornecido apenas por telefone ou chat como prova suficiente.

## Etapa 7 — devolução controlada do acesso

Após a execução:

1. o usuário recebe somente o fluxo oficial de recuperação de senha ou login;
2. todas as sessões anteriores permanecem revogadas;
3. o acesso a rotas protegidas exige nova configuração do TOTP;
4. o usuário deve gerar dez novos códigos de recuperação;
5. operações críticas permanecem bloqueadas até o MFA ser confirmado;
6. o usuário revisa e-mail, empresa, usuários, propostas recentes e atividade suspeita;
7. o suporte orienta troca da senha do e-mail quando houver risco de comprometimento;
8. o caso permanece aberto no estado `recovered_pending_mfa`.

## Etapa 8 — encerramento

O caso só pode chegar a `closed` quando:

- todas as sessões anteriores foram revogadas;
- fatores antigos e códigos de recuperação anteriores foram invalidados;
- o usuário entrou pelo fluxo oficial;
- um novo fator TOTP foi verificado;
- dez novos códigos foram gerados e armazenados pelo usuário;
- notificações foram enviadas;
- não existe contestação pendente;
- a auditoria contém solicitante, verificador, aprovador e executor;
- nenhuma senha, TOTP, chave secreta ou código foi armazenado.

## Registro de auditoria mínimo

O log append-only deve registrar:

- identificador do caso;
- `user_id` e e-mail mascarado;
- estado anterior e novo;
- categoria de evidências verificadas, sem conteúdo sensível;
- nível de risco e justificativa;
- identificadores dos operadores;
- aprovações e recusas;
- notificações enviadas;
- horário de cada etapa;
- ação técnica executada e resultado;
- vínculo com incidente, quando aplicável.

Não registrar senha, TOTP, QR Code, chave secreta, código de recuperação, token de sessão, documento integral ou chave administrativa.

## Retenção e LGPD

- Coletar o mínimo necessário e informar a finalidade.
- Evidência bruta só pode existir no canal seguro aprovado.
- Evidência bruta deve ser apagada após o prazo definido pela política de privacidade e, como meta inicial, em até sete dias após o encerramento.
- O log de decisão deve conservar apenas metadados mínimos pelo período aprovado para segurança e obrigação legal.
- Acesso às evidências deve ser registrado e revisado.
- Não iniciar coleta documental antes da aprovação do responsável por privacidade e da política de retenção.

## Resposta a recuperação indevida

Diante de suspeita de fraude ou erro:

1. mover o caso para `security_incident`;
2. revogar globalmente as sessões;
3. bloquear novas alterações críticas;
4. preservar logs e evidências sem ampliar a coleta;
5. avisar o contato original por canal previamente verificado;
6. revisar todas as ações administrativas relacionadas;
7. remover acessos do operador suspeito, quando aplicável;
8. acionar o processo de resposta a incidentes;
9. documentar impacto, contenção, correção e comunicação;
10. submeter o caso a auditoria independente.

## Métricas e revisão periódica

Revisar mensalmente:

- quantidade de solicitações, aprovações, recusas e bloqueios;
- tempo médio por estado;
- contestações e recuperações indevidas;
- tentativas repetidas por conta ou origem;
- exceções ao período de espera;
- acessos de operadores às evidências;
- casos sem segundo aprovador;
- usuários que não concluíram a nova configuração do MFA.

Executar exercício de mesa trimestral e teste de homologação antes de cada lançamento que altere Auth, MFA, Admin API, papéis administrativos ou notificações.

## Respostas padrão do suporte

### Processo ainda bloqueado por pré-requisito

> Sua solicitação foi registrada e escalada. Para proteger a conta, o suporte não remove MFA, troca e-mail nem define senha manualmente. A recuperação administrativa só pode ocorrer por um processo com verificação forte, duplo controle, notificações e auditoria. Não envie senha, código TOTP, QR Code, chave secreta ou código de recuperação.

### Verificação em andamento

> O caso está em verificação de identidade. Enviaremos qualquer desafio somente por canais oficiais e previamente verificados. Não solicitaremos sua senha, código TOTP, código de recuperação ou chave do autenticador.

### Solicitação recusada

> Não foi possível confirmar a titularidade com segurança. A conta continuará protegida. Por segurança, não informamos quais evidências falharam nem alteramos senha, e-mail ou MFA.

## Critério de prontidão para produção

O processo administrativo somente estará operacional quando um teste de homologação comprovar:

- papel administrativo validado no servidor;
- AAL2 e senha recente para operadores;
- duplo controle real;
- transições append-only do caso;
- notificação ao e-mail original;
- período de espera;
- revogação global de sessões;
- revogação dos códigos de recuperação;
- remoção de fatores por Admin API;
- ausência de senha temporária;
- nova configuração obrigatória do MFA;
- auditoria completa e descarte de evidências.

A definição deste processo conclui o requisito documental da Fase 2, mas não antecipa as funcionalidades administrativas previstas para a Fase 4.