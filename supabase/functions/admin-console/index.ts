import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

const READ_ROLES = new Set(['support', 'operations', 'super_admin']);
const WRITE_ROLES = new Set(['operations', 'super_admin']);
const ACCOUNT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminRole = 'support' | 'operations' | 'super_admin';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function readString(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isBlocked(bannedUntil: string | null | undefined) {
  if (!bannedUntil) return false;
  const timestamp = new Date(bannedUntil).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

async function writeAudit(
  admin: ReturnType<typeof createClient>,
  input: {
    actorId: string;
    actorRole: AdminRole;
    action: string;
    targetAccountId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from('admin_audit_logs').insert({
    actor_id: input.actorId,
    actor_role: input.actorRole,
    action: input.action,
    target_account_id: input.targetAccountId || null,
    reason: input.reason || null,
    metadata: input.metadata || {},
  });
  if (error) throw new Error(`admin_audit_${error.code || 'failed'}`);
}

async function getCount(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
) {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value);
  if (error) throw new Error(`admin_count_${table}_${error.code || 'failed'}`);
  return count || 0;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  const accessToken = readBearerToken(request);
  if (!accessToken) return jsonResponse({ error: 'Sessão inválida.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('admin-console: missing server configuration');
    return jsonResponse({ error: 'Serviço indisponível.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return jsonResponse({ error: 'Sessão inválida.' }, 401);

  const actorId = userData.user.id;
  const { data: administrator, error: administratorError } = await admin
    .from('platform_admins')
    .select('role, active')
    .eq('user_id', actorId)
    .maybeSingle();

  if (administratorError || !administrator?.active || !READ_ROLES.has(administrator.role)) {
    return jsonResponse({ error: 'Acesso administrativo não autorizado.' }, 403);
  }
  const actorRole = administrator.role as AdminRole;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const action = readString(body.action, 120);

  try {
    if (action === 'me') {
      return jsonResponse({ authorized: true, role: actorRole });
    }

    if (action === 'list_accounts') {
      const page = Math.min(1000, Math.max(1, Number(body.page || 1)));
      const perPage = Math.min(100, Math.max(10, Number(body.perPage || 25)));
      const search = readString(body.search, 160).toLowerCase();
      const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({ page, perPage });
      if (listError) throw new Error(`admin_list_users_${listError.message}`);

      const users = authUsers.users || [];
      const ids = users.map((user) => user.id);
      const [profilesResponse, subscriptionsResponse, usageResponse] = ids.length
        ? await Promise.all([
          admin.from('profiles').select('id, name, company_name, phone, company_email, created_at').in('id', ids),
          admin.from('subscriptions').select('account_id, plan_code, billing_interval, status, current_period_end, grace_period_ends_at').in('account_id', ids),
          admin.from('account_usage').select('account_id, period_start, period_end, proposals_created, storage_bytes, users_count').in('account_id', ids).order('period_start', { ascending: false }),
        ])
        : [{ data: [] }, { data: [] }, { data: [] }];

      const profiles = new Map((profilesResponse.data || []).map((profile) => [profile.id, profile]));
      const subscriptions = new Map((subscriptionsResponse.data || []).map((subscription) => [subscription.account_id, subscription]));
      const latestUsage = new Map<string, Record<string, unknown>>();
      for (const usage of usageResponse.data || []) {
        if (!latestUsage.has(usage.account_id)) latestUsage.set(usage.account_id, usage);
      }

      const accounts = users
        .map((user) => {
          const profile = profiles.get(user.id) || null;
          return {
            id: user.id,
            email: user.email || null,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
            blocked: isBlocked(user.banned_until),
            banned_until: user.banned_until || null,
            profile,
            subscription: subscriptions.get(user.id) || null,
            usage: latestUsage.get(user.id) || null,
          };
        })
        .filter((account) => {
          if (!search) return true;
          return [account.email, account.profile?.name, account.profile?.company_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        });

      return jsonResponse({
        accounts,
        page,
        per_page: perPage,
        total: authUsers.total,
      });
    }

    if (action === 'account_detail') {
      const accountId = readString(body.accountId, 80);
      if (!ACCOUNT_ID_PATTERN.test(accountId)) return jsonResponse({ error: 'Conta inválida.' }, 400);

      const [
        userResponse,
        profileResponse,
        subscriptionResponse,
        usageResponse,
        applicationEventsResponse,
        billingEventsResponse,
        auditResponse,
        counts,
      ] = await Promise.all([
        admin.auth.admin.getUserById(accountId),
        admin.from('profiles').select('*').eq('id', accountId).maybeSingle(),
        admin.from('subscriptions').select('*').eq('account_id', accountId).maybeSingle(),
        admin.from('account_usage').select('*').eq('account_id', accountId).order('period_start', { ascending: false }).limit(12),
        admin.from('application_events').select('id, source, event_type, severity, request_id, fingerprint, metadata, created_at').eq('account_id', accountId).order('created_at', { ascending: false }).limit(50),
        admin.from('billing_events').select('id, event_type, source, provider, provider_event_id, metadata, created_at').eq('account_id', accountId).order('created_at', { ascending: false }).limit(50),
        admin.from('admin_audit_logs').select('id, actor_id, actor_role, action, reason, metadata, created_at').eq('target_account_id', accountId).order('created_at', { ascending: false }).limit(50),
        Promise.all([
          getCount(admin, 'clients', 'user_id', accountId),
          getCount(admin, 'proposals', 'user_id', accountId),
          getCount(admin, 'solar_kits', 'user_id', accountId),
          getCount(admin, 'pdf_user_models', 'user_id', accountId),
        ]),
      ]);

      if (userResponse.error || !userResponse.data.user) return jsonResponse({ error: 'Conta não encontrada.' }, 404);

      await writeAudit(admin, {
        actorId,
        actorRole,
        action: 'admin.account.viewed',
        targetAccountId: accountId,
        metadata: {},
      });

      return jsonResponse({
        account: {
          id: accountId,
          email: userResponse.data.user.email || null,
          created_at: userResponse.data.user.created_at,
          last_sign_in_at: userResponse.data.user.last_sign_in_at || null,
          blocked: isBlocked(userResponse.data.user.banned_until),
          banned_until: userResponse.data.user.banned_until || null,
        },
        profile: profileResponse.data || null,
        subscription: subscriptionResponse.data || null,
        usage: usageResponse.data || [],
        counts: {
          clients: counts[0],
          proposals: counts[1],
          solar_kits: counts[2],
          pdf_models: counts[3],
        },
        application_events: applicationEventsResponse.data || [],
        billing_events: billingEventsResponse.data || [],
        admin_audit_logs: auditResponse.data || [],
      });
    }

    if (action === 'block_account' || action === 'reactivate_account') {
      if (!WRITE_ROLES.has(actorRole)) return jsonResponse({ error: 'Seu papel é somente leitura.' }, 403);
      const accountId = readString(body.accountId, 80);
      const reason = readString(body.reason, 1000);
      if (!ACCOUNT_ID_PATTERN.test(accountId)) return jsonResponse({ error: 'Conta inválida.' }, 400);
      if (accountId === actorId) return jsonResponse({ error: 'Não é permitido bloquear a própria conta administrativa.' }, 400);
      if (reason.length < 10) return jsonResponse({ error: 'Informe uma justificativa com pelo menos 10 caracteres.' }, 400);

      const block = action === 'block_account';
      const { error: updateError } = await admin.auth.admin.updateUserById(accountId, {
        ban_duration: block ? '876000h' : 'none',
      });
      if (updateError) throw new Error(`admin_account_status_${updateError.message}`);

      await writeAudit(admin, {
        actorId,
        actorRole,
        action: block ? 'admin.account.blocked' : 'admin.account.reactivated',
        targetAccountId: accountId,
        reason,
        metadata: { mechanism: 'supabase_auth_ban' },
      });

      return jsonResponse({ success: true, blocked: block });
    }

    if (action === 'list_events') {
      const severity = readString(body.severity, 20);
      let query = admin
        .from('application_events')
        .select('id, account_id, source, event_type, severity, request_id, fingerprint, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (severity && ['info', 'warning', 'error', 'critical'].includes(severity)) query = query.eq('severity', severity);
      const { data, error } = await query;
      if (error) throw new Error(`admin_list_events_${error.code || 'failed'}`);
      return jsonResponse({ events: data || [] });
    }

    if (action === 'list_beta_feedback') {
      const { data, error } = await admin
        .from('beta_feedback')
        .select('id, account_id, category, score, message, context, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(`admin_list_feedback_${error.code || 'failed'}`);
      return jsonResponse({ feedback: data || [] });
    }

    return jsonResponse({ error: 'Ação administrativa inválida.' }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'admin_console_failed';
    console.error('admin-console failed', { actorId, action, code });
    return jsonResponse({ error: 'Não foi possível concluir a operação administrativa.', code }, 500);
  }
});
