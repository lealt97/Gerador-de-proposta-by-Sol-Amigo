import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PATH = 'supabase/migrations/20260720224500_p1_proposal_quota_enforcement.sql';
const PROPOSAL_SERVICE_PATH = 'src/services/proposalService.ts';

const read = (path: string) => readFile(path, 'utf8');

test('toda criação de proposta reserva cota em trigger do servidor', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /create or replace function public\.reserve_proposal_quota\(\)/);
  assert.match(migration, /before insert on public\.proposals/);
  assert.match(migration, /for each row execute function public\.reserve_proposal_quota\(\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /proposals_created = usage\.proposals_created \+ 1/);
});

test('limite efetivo usa plano, intervalo e tolerância de pagamento no servidor', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /resolve_plan_proposal_limit\(v_plan_code, v_billing_interval\)/);
  assert.match(migration, /status in \('active', 'trialing'\)/);
  assert.match(migration, /status = 'past_due'[\s\S]*grace_period_ends_at > now\(\)/);
  assert.match(migration, /v_plan_code := 'free'/);
  assert.match(migration, /v_used >= v_limit/);
  assert.match(migration, /Limite mensal de propostas atingido/);
});

test('edição não consome nova cota e exclusão não devolve uso', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /before insert on public\.proposals/);
  assert.doesNotMatch(migration, /before update on public\.proposals/);
  assert.doesNotMatch(migration, /before delete on public\.proposals/);
  assert.doesNotMatch(migration, /proposals_created\s*=\s*usage\.proposals_created\s*-\s*1/);
});

test('frontend cria e duplica pelo RPC transacional existente', async () => {
  const service = await read(PROPOSAL_SERVICE_PATH);

  assert.match(service, /supabase\.rpc\('save_proposal_bundle'/);
  assert.match(service, /createProposal: proposalOperations\.createProposal/);
  assert.match(service, /duplicateProposal: proposalOperations\.duplicateProposal/);
  assert.doesNotMatch(service, /from\('proposals'\)[\s\S]{0,120}\.insert\(/);
});

test('usuário autenticado pode consultar somente a própria cota', async () => {
  const migration = await read(MIGRATION_PATH);

  assert.match(migration, /create or replace function public\.get_my_proposal_quota\(\)/);
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(migration, /grant execute on function public\.get_my_proposal_quota\(\)[\s\S]*to authenticated/);
  assert.match(migration, /'remaining'/);
  assert.match(migration, /'warning'/);
});
