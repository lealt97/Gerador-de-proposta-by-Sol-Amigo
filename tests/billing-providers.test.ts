import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  BILLING_PROVIDERS,
  getMissingProviderConfiguration,
  getProviderPriceReference,
  selectBillingProvider,
} from '../supabase/functions/_shared/billingProviderContract.ts';
import { probeBillingProvider } from '../supabase/functions/_shared/billingProviderClients.ts';

function createEnvironment(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name];
    },
  };
}

const completeEnvironment = createEnvironment({
  CAKTO_CLIENT_ID: 'cakto-client-test',
  CAKTO_CLIENT_SECRET: 'cakto-secret-test',
  CAKTO_PRO_MONTHLY_OFFER_ID: 'cakto-monthly-offer',
  CAKTO_PRO_ANNUAL_OFFER_ID: 'cakto-annual-offer',
  STRIPE_SECRET_KEY: 'sk_test_solamigo',
  STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly_test',
  STRIPE_PRO_ANNUAL_PRICE_ID: 'price_annual_test',
});

test('catálogo permite somente Cakto e Stripe', () => {
  assert.deepEqual(BILLING_PROVIDERS, ['cakto', 'stripe']);
  assert.throws(
    () => selectBillingProvider({ requestedProvider: 'asaas' }),
    /billing_provider_invalid/,
  );
});

test('roteamento padrão usa Cakto no Brasil e Stripe no exterior', () => {
  assert.equal(selectBillingProvider({ countryCode: 'BR' }), 'cakto');
  assert.equal(selectBillingProvider({ currency: 'brl' }), 'cakto');
  assert.equal(selectBillingProvider({ countryCode: 'US', currency: 'USD' }), 'stripe');
  assert.equal(selectBillingProvider({ requestedProvider: 'stripe', currency: 'BRL' }), 'stripe');
});

test('referências mensal e anual são lidas somente do ambiente do servidor', () => {
  assert.equal(
    getProviderPriceReference('cakto', 'month', completeEnvironment),
    'cakto-monthly-offer',
  );
  assert.equal(
    getProviderPriceReference('stripe', 'year', completeEnvironment),
    'price_annual_test',
  );
  assert.deepEqual(getMissingProviderConfiguration('cakto', completeEnvironment), []);
  assert.deepEqual(
    getMissingProviderConfiguration('stripe', createEnvironment({ STRIPE_SECRET_KEY: 'key' })),
    ['STRIPE_PRO_MONTHLY_PRICE_ID', 'STRIPE_PRO_ANNUAL_PRICE_ID'],
  );
});

test('sondagem Cakto usa OAuth2 form-encoded e não retorna o token', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({
      access_token: 'oauth-token-that-must-not-leak',
      expires_in: 36_000,
      token_type: 'Bearer',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  const result = await probeBillingProvider('cakto', completeEnvironment, fetcher);

  assert.equal(capturedUrl, 'https://api.cakto.com.br/public_api/token/');
  assert.equal(capturedInit?.method, 'POST');
  assert.equal(
    (capturedInit?.headers as Record<string, string>)['Content-Type'],
    'application/x-www-form-urlencoded',
  );
  assert.match(String(capturedInit?.body), /client_id=cakto-client-test/);
  assert.match(String(capturedInit?.body), /client_secret=cakto-secret-test/);
  assert.deepEqual(result, { provider: 'cakto', configured: true, reachable: true });
  assert.doesNotMatch(JSON.stringify(result), /oauth-token|cakto-secret/);
});

test('sondagem Stripe usa autenticação Basic no servidor e operação somente leitura', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ object: 'list', data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await probeBillingProvider('stripe', completeEnvironment, fetcher);

  assert.equal(capturedUrl, 'https://api.stripe.com/v1/customers?limit=1');
  assert.equal(capturedInit?.method, 'GET');
  assert.match(
    (capturedInit?.headers as Record<string, string>).Authorization,
    /^Basic\s+/,
  );
  assert.deepEqual(result, { provider: 'stripe', configured: true, reachable: true });
  assert.doesNotMatch(JSON.stringify(result), /sk_test_solamigo/);
});

test('falhas de configuração e autenticação retornam somente códigos sanitizados', async () => {
  const missing = await probeBillingProvider('cakto', createEnvironment({}));
  assert.deepEqual(missing, {
    provider: 'cakto',
    configured: false,
    reachable: false,
    errorCode: 'not_configured',
  });

  const unauthorizedFetcher = (async () => new Response(
    JSON.stringify({ error: { message: 'secret provider detail' } }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )) as typeof fetch;

  const unauthorized = await probeBillingProvider(
    'stripe',
    completeEnvironment,
    unauthorizedFetcher,
  );

  assert.deepEqual(unauthorized, {
    provider: 'stripe',
    configured: true,
    reachable: true,
    errorCode: 'authentication_failed',
  });
  assert.doesNotMatch(JSON.stringify(unauthorized), /secret provider detail/);
});

test('função, banco e documentação preservam os limites da etapa', async () => {
  const [edgeFunction, config, migration, environmentDoc, providerDoc, checklist] = await Promise.all([
    readFile('supabase/functions/billing-provider-readiness/index.ts', 'utf8'),
    readFile('supabase/config.toml', 'utf8'),
    readFile('supabase/migrations/20260720053000_billing_providers.sql', 'utf8'),
    readFile('docs/ENVIRONMENT_VARIABLES.md', 'utf8'),
    readFile('docs/BILLING_PROVIDERS.md', 'utf8'),
    readFile('docs/PROJECT_COMPLETION_CHECKLIST.md', 'utf8'),
  ]);

  assert.match(edgeFunction, /admin\.auth\.getUser\(accessToken\)/);
  assert.match(edgeFunction, /probeBillingProvider/);
  assert.match(config, /\[functions\.billing-provider-readiness\][\s\S]*verify_jwt = true/);
  assert.match(migration, /provider in \('cakto', 'stripe'\)/);
  assert.match(migration, /plan_code = 'free'[\s\S]*provider is null/);
  assert.match(environmentDoc, /CAKTO_CLIENT_SECRET/);
  assert.match(environmentDoc, /STRIPE_SECRET_KEY/);
  assert.doesNotMatch(environmentDoc, /VITE_(CAKTO|STRIPE)/);
  assert.match(providerDoc, /Uma assinatura paga é controlada por apenas um provedor por vez/);
  assert.match(providerDoc, /checkout;[\s\S]*webhooks/);
  assert.match(checklist, /- \[ \] Integrar provedor de pagamentos/);
});
