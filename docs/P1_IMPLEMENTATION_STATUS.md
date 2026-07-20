# P1 — Estado de implementação

## Objetivo

Este documento registra o pacote P1 integrado diretamente à branch `main`. O foco é remover exposições residuais de arquivos, aplicar limites comerciais no servidor, preparar cobrança idempotente e criar monitoramento operacional mínimo.

## Implementado no código

### 1. Arquivos privados e uploads

- imagens de capa em `pdf-assets` são privadas;
- fotos de telhado em `proposals` são privadas;
- referências persistentes usam `storage://bucket/path`, sem salvar URL assinada temporária;
- previews e geração de PDF criam URLs assinadas de curta duração;
- o fallback de PDF para URL pública foi removido;
- uploads aceitam somente os MIME types permitidos e respeitam limites definidos também no bucket;
- URLs internas legadas são convertidas por migration quando pertencem à pasta da própria conta.

### 2. Limite mensal de propostas

- toda inserção em `public.proposals` passa por trigger transacional;
- plano, intervalo, status, tolerância e período de uso são resolvidos no banco;
- criação e duplicação consomem uma unidade;
- edição não consome outra unidade;
- exclusão não devolve unidade;
- falha de criação desfaz a reserva na mesma transação;
- `get_my_proposal_quota()` informa uso e saldo somente à conta autenticada.

Cotas atuais:

- Gratuito: 5 propostas/mês;
- Pro mensal: 30 propostas/mês;
- Pro anual: 40 propostas/mês.

### 3. Checkout e eventos de pagamento

- rota protegida `/checkout` conectada aos CTAs dos planos pagos;
- Edge Function `billing-checkout` autenticada;
- preços, Prices, ofertas e URLs comerciais são resolvidos no servidor;
- sessões de checkout são reutilizadas por idempotência;
- Stripe usa Checkout Session com metadados e `Idempotency-Key`;
- Cakto recebe rastreamento `sck` vinculado à conta e ao intervalo;
- webhooks Stripe e Cakto são públicos somente no transporte, mas exigem assinatura ou segredo do provedor;
- eventos são deduplicados no banco;
- assinatura, tolerância e cota efetiva são atualizadas na mesma transação;
- nenhum webhook armazena payload bruto ou dados de cartão.

### 4. Monitoramento operacional

- tabela privada e append-only `application_events`;
- Edge Function autenticada `application-monitor`;
- chaves sensíveis são removidas ou marcadas como redigidas;
- falhas de geração de PDF e checkout são registradas com metadados mínimos;
- nenhum nome, documento, telefone, e-mail, senha, token ou segredo do cliente é enviado pelo frontend ao monitor.

### 5. Validação automatizada

- regressões TypeScript para Storage privado, cota, checkout, webhooks e monitoramento;
- testes SQL para cota transacional, eventos idempotentes e trilha append-only;
- auditoria RLS ampliada para as tabelas e funções P1;
- workflow de migrations executado também em pushes para `main`;
- diagnóstico explícito de instalação, TypeScript, testes e build publicado como status do commit.

## Ativação externa obrigatória

O código integrado não torna a cobrança comercial ativa sozinho. Antes de liberar o P1 em produção é obrigatório:

1. aplicar todas as migrations no projeto Supabase correto;
2. publicar `billing-checkout`, `billing-webhook-stripe`, `billing-webhook-cakto` e `application-monitor`;
3. configurar `APP_BASE_URL`, credenciais, Prices, ofertas, URLs de checkout e segredos de webhook por ambiente;
4. cadastrar os endpoints de webhook nos painéis dos provedores;
5. executar checkout mensal e anual em sandbox;
6. reenviar eventos idênticos e confirmar idempotência;
7. testar aprovação, falha de pagamento, tolerância, cancelamento e reativação;
8. confirmar que a cota efetiva muda somente depois do evento autenticado;
9. revisar logs e confirmar ausência de segredos e dados de cartão;
10. validar o formato real do segredo e dos campos enviados pela Cakto no ambiente de homologação.

## Itens ainda fora deste P1

- contabilização consolidada de armazenamento por conta;
- convites, assentos e permissões de equipe;
- portal de autoatendimento para troca e cancelamento de assinatura;
- emissão fiscal e políticas jurídicas/comerciais finais;
- painéis externos e alertas automáticos de disponibilidade.

Esses itens permanecem separados para não declarar funcionalidades comerciais ativas antes da validação real dos provedores e da infraestrutura publicada.
