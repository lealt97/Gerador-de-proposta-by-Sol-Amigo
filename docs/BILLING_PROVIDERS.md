# Provedores de pagamento — Cakto e Stripe

## Decisão

O SolAmigo utiliza dois provedores com responsabilidades complementares:

- **Cakto:** provedor principal para clientes do Brasil, cobranças em BRL e funis comerciais;
- **Stripe:** provedor para expansão internacional, outras moedas e recursos globais de assinatura.

Uma assinatura paga é controlada por apenas um provedor por vez. Cakto e Stripe nunca devem cobrar simultaneamente a mesma conta.

## Seleção do provedor

A decisão acontece somente no servidor:

1. uma escolha explícita válida pode ser aceita quando o fluxo comercial exigir;
2. país `BR` ou moeda `BRL` seleciona Cakto por padrão;
3. demais países e moedas selecionam Stripe por padrão.

O navegador não pode enviar preço, ID de oferta, ID de Price ou estado de assinatura como fonte de verdade.

## Contrato comum

O contrato compartilhado está em:

- `supabase/functions/_shared/billingProviderContract.ts`;
- `supabase/functions/_shared/billingProviderClients.ts`.

Ele define:

- provedores permitidos: `cakto` e `stripe`;
- intervalos pagos: `month` e `year`;
- roteamento por país e moeda;
- referências server-side para o Pro mensal e anual;
- validação de configuração;
- sondagem segura de autenticação sem criar cobrança ou cliente.

## Checkout protegido

A Edge Function autenticada `billing-checkout`:

- identifica a conta pelo JWT, nunca por `account_id` recebido no corpo;
- recebe somente o intervalo mensal ou anual e, opcionalmente, um provedor permitido;
- resolve Price, oferta ou URL de checkout exclusivamente pelo ambiente do servidor;
- gera uma chave de idempotência por conta, provedor, intervalo e janela de tempo;
- reutiliza uma sessão de checkout ainda válida para impedir duplicações durante cliques ou reenvios;
- registra a tentativa em `billing_checkout_sessions`;
- não ativa o plano Pro quando a sessão é criada.

A página pública de planos leva usuários autenticados à rota protegida `/checkout`. A mudança de plano ocorre somente depois de um evento verificado do provedor.

## Integração Cakto

A Cakto usa OAuth2 para a verificação de prontidão. As credenciais ficam exclusivamente no ambiente protegido das Edge Functions.

Variáveis de prontidão:

- `CAKTO_CLIENT_ID`;
- `CAKTO_CLIENT_SECRET`;
- `CAKTO_PRO_MONTHLY_OFFER_ID`;
- `CAKTO_PRO_ANNUAL_OFFER_ID`.

Variáveis de checkout e webhook:

- `CAKTO_PRO_MONTHLY_CHECKOUT_URL`;
- `CAKTO_PRO_ANNUAL_CHECKOUT_URL`;
- `CAKTO_WEBHOOK_SECRET`.

O endpoint publicado é a Edge Function `billing-webhook-cakto`.

O checkout adiciona um rastreamento `sck` no formato `solamigo.<account_id>.<interval>`. O webhook usa esse valor para vincular a confirmação à conta correta, exige segredo e deduplica cada evento por identificador externo ou SHA-256 do corpo recebido.

Eventos tratados:

- compra aprovada ou recusada;
- assinatura criada, renovada, recusada ou cancelada;
- reembolso e chargeback.

O formato final do segredo e dos campos entregues pelo painel Cakto deve ser confirmado em homologação antes da ativação comercial.

## Integração Stripe

A Stripe usa chave secreta exclusivamente no servidor.

Variáveis obrigatórias:

- `STRIPE_SECRET_KEY`;
- `STRIPE_PRO_MONTHLY_PRICE_ID`;
- `STRIPE_PRO_ANNUAL_PRICE_ID`;
- `STRIPE_WEBHOOK_SECRET`.

O checkout cria uma Checkout Session de assinatura com:

- `client_reference_id` da conta;
- metadados de conta e intervalo;
- Price escolhido no servidor;
- chave `Idempotency-Key`;
- URLs de retorno derivadas de `APP_BASE_URL`.

O webhook `billing-webhook-stripe` valida a assinatura HMAC-SHA256 sobre o corpo bruto, aplica tolerância temporal de cinco minutos e trata conclusão de checkout, criação/alteração/cancelamento de assinatura, pagamento aprovado e falha de pagamento.

## Processamento idempotente

A função SQL `apply_billing_provider_event` é executável somente pela `service_role` e centraliza as mudanças de estado:

- registra cada evento em `billing_events` com chave única por provedor;
- ignora reenvios do mesmo evento;
- sincroniza `subscriptions` e `account_usage` na mesma transação;
- mantém tolerância configurável para `past_due`;
- remove a cota Pro quando a assinatura deixa de conceder acesso;
- marca sessões de checkout concluídas apenas após confirmação externa.

Nenhum webhook armazena o payload bruto. Somente metadados mínimos e sanitizados entram na trilha de auditoria.

## Verificação de prontidão

A Edge Function autenticada `billing-provider-readiness`:

- aceita somente sessão válida;
- verifica Cakto, Stripe ou um provedor solicitado;
- confirma presença das credenciais e referências de preço/oferta;
- realiza uma chamada de autenticação somente leitura;
- nunca retorna segredos, tokens OAuth ou chaves externas;
- não cria Customer, assinatura, checkout ou cobrança.

A prontidão de credenciais não substitui o teste de checkout e webhook em sandbox.

## Banco de dados

As constraints e políticas garantem:

- `subscriptions.provider` aceita apenas `cakto`, `stripe` ou `null`;
- contas gratuitas não possuem provedor nem identificadores externos;
- assinaturas pagas exigem um dos dois provedores;
- `billing_events.provider` aceita somente os provedores suportados;
- índices impedem identificadores repetidos dentro do mesmo provedor;
- `billing_checkout_sessions` é somente leitura para a própria conta e escrita apenas pelo servidor;
- eventos do provedor são aplicados exatamente uma vez;
- criação de propostas reserva cota mensal atomicamente antes do `INSERT`.

## Critérios para liberar pagamentos em produção

A integração de código está preparada, mas a cobrança só pode ser considerada ativa após:

1. publicar as migrations e Edge Functions no Supabase correto;
2. configurar credenciais, URLs, Prices, ofertas e segredos separados por ambiente;
3. validar checkout mensal e anual em sandbox;
4. reenviar eventos iguais e confirmar idempotência;
5. testar aprovação, falha, tolerância, cancelamento e reativação;
6. confirmar que a cota efetiva acompanha o estado da assinatura;
7. revisar logs sanitizados sem segredos ou dados de cartão.

A abertura de um checkout nunca é evidência de pagamento. O acesso Pro depende exclusivamente de evento autenticado e processado no servidor.
