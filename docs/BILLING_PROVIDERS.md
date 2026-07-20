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

## Integração Cakto

A Cakto usa OAuth2. A função troca `client_id` e `client_secret` por um token temporário no endpoint oficial e mantém as credenciais exclusivamente no ambiente protegido das Edge Functions.

Variáveis obrigatórias:

- `CAKTO_CLIENT_ID`;
- `CAKTO_CLIENT_SECRET`;
- `CAKTO_PRO_MONTHLY_OFFER_ID`;
- `CAKTO_PRO_ANNUAL_OFFER_ID`.

Escopos devem seguir o menor privilégio. Checkout e webhooks serão implementados nos itens seguintes do checklist.

## Integração Stripe

A Stripe usa chave secreta exclusivamente no servidor. A sondagem consulta a API de Customers sem criar objetos e confirma que a chave possui acesso suficiente para a futura assinatura.

Variáveis obrigatórias:

- `STRIPE_SECRET_KEY`;
- `STRIPE_PRO_MONTHLY_PRICE_ID`;
- `STRIPE_PRO_ANNUAL_PRICE_ID`.

Em produção, deve-se preferir uma chave restrita às operações necessárias sempre que a configuração da conta permitir.

## Verificação de prontidão

A Edge Function autenticada `billing-provider-readiness`:

- aceita somente sessão válida;
- verifica Cakto, Stripe ou um provedor solicitado;
- confirma presença das credenciais e referências de preço/oferta;
- realiza uma chamada de autenticação somente leitura;
- nunca retorna segredos, tokens OAuth ou chaves externas;
- não cria Customer, assinatura, checkout ou cobrança.

Resposta resumida esperada:

```json
{
  "ready": true,
  "providers": [
    { "provider": "cakto", "configured": true, "reachable": true },
    { "provider": "stripe", "configured": true, "reachable": true }
  ]
}
```

## Banco de dados

As constraints garantem:

- `subscriptions.provider` aceita apenas `cakto`, `stripe` ou `null`;
- contas gratuitas não possuem provedor nem identificadores externos;
- assinaturas pagas exigem um dos dois provedores;
- `billing_events.provider` aceita somente os provedores suportados;
- os índices existentes impedem identificadores repetidos dentro do mesmo provedor.

## Limites desta etapa

Este item integra os provedores e cria o contrato seguro de configuração e conectividade. Permanecem separados no checklist:

- criação do checkout;
- recebimento e verificação de webhooks;
- ativação por pagamento aprovado;
- falha, vencimento, cancelamento e reativação;
- alteração de plano;
- portal/tela da assinatura.

Essa separação evita liberar acesso Pro apenas porque o navegador abriu um checkout. O estado interno só será alterado por operações server-side e eventos verificados.
