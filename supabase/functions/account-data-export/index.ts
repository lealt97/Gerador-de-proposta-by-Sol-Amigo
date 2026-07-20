import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

const PRIVATE_BUCKETS = new Set(['pdf-assets', 'proposals']);
const MANAGED_BUCKETS = ['logos', 'pdf-assets', 'proposals'] as const;

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

async function readRows(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
) {
  const { data, error } = await admin.from(table).select('*').eq(column, value);
  if (error) throw new Error(`export_${table}_${error.code || 'failed'}`);
  return data || [];
}

async function readRowsIn(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  values: string[],
) {
  if (values.length === 0) return [];
  const { data, error } = await admin.from(table).select('*').in(column, values);
  if (error) throw new Error(`export_${table}_${error.code || 'failed'}`);
  return data || [];
}

async function listStorageFiles(
  admin: ReturnType<typeof createClient>,
  bucket: typeof MANAGED_BUCKETS[number],
  prefix: string,
): Promise<Array<Record<string, unknown>>> {
  const result: Array<Record<string, unknown>> = [];

  async function walk(folder: string) {
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(folder, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`export_storage_${bucket}_${error.message}`);
      if (!data?.length) break;

      for (const item of data) {
        const path = folder ? `${folder}/${item.name}` : item.name;
        if (item.id) {
          let downloadUrl: string | null = null;
          if (PRIVATE_BUCKETS.has(bucket)) {
            const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
            downloadUrl = signed?.signedUrl || null;
          } else {
            const { data: publicData } = admin.storage.from(bucket).getPublicUrl(path);
            downloadUrl = publicData.publicUrl;
          }

          result.push({
            bucket,
            path,
            size_bytes: Number(item.metadata?.size || 0),
            mime_type: item.metadata?.mimetype || null,
            created_at: item.created_at || null,
            updated_at: item.updated_at || null,
            download_url: downloadUrl,
            download_url_expires_in_seconds: PRIVATE_BUCKETS.has(bucket) ? 3600 : null,
          });
        } else {
          await walk(path);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  await walk(prefix);
  return result;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  const accessToken = readBearerToken(request);
  if (!accessToken) return jsonResponse({ error: 'Sessão inválida.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('account-data-export: missing server configuration');
    return jsonResponse({ error: 'Serviço indisponível.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return jsonResponse({ error: 'Sessão inválida.' }, 401);

  const accountId = userData.user.id;

  try {
    const [
      profiles,
      clients,
      solarKits,
      proposals,
      pdfModels,
      subscriptions,
      accountUsage,
      billingEvents,
      mfaEvents,
      legalAcceptances,
      feedback,
    ] = await Promise.all([
      readRows(admin, 'profiles', 'id', accountId),
      readRows(admin, 'clients', 'user_id', accountId),
      readRows(admin, 'solar_kits', 'user_id', accountId),
      readRows(admin, 'proposals', 'user_id', accountId),
      readRows(admin, 'pdf_user_models', 'user_id', accountId),
      readRows(admin, 'subscriptions', 'account_id', accountId),
      readRows(admin, 'account_usage', 'account_id', accountId),
      readRows(admin, 'billing_events', 'account_id', accountId),
      readRows(admin, 'mfa_security_events', 'user_id', accountId),
      readRows(admin, 'account_legal_acceptances', 'account_id', accountId),
      readRows(admin, 'beta_feedback', 'account_id', accountId),
    ]);

    const proposalIds = proposals.map((proposal) => String(proposal.id));
    const [loads, solarCalculations, proposalEvents] = await Promise.all([
      readRowsIn(admin, 'proposal_loads', 'proposal_id', proposalIds),
      readRowsIn(admin, 'solar_system_calculations', 'proposal_id', proposalIds),
      readRowsIn(admin, 'proposal_events', 'proposal_id', proposalIds),
    ]);

    const storageGroups = await Promise.all(
      MANAGED_BUCKETS.map((bucket) => listStorageFiles(admin, bucket, accountId)),
    );
    const storageFiles = storageGroups.flat();

    const generatedAt = new Date().toISOString();
    const filename = `solamigo-export-${generatedAt.slice(0, 10)}.json`;

    return jsonResponse({
      export_schema: 'solamigo-account-export-v1',
      generated_at: generatedAt,
      account: {
        id: accountId,
        email: userData.user.email || null,
        created_at: userData.user.created_at,
        last_sign_in_at: userData.user.last_sign_in_at || null,
      },
      data: {
        profiles,
        clients,
        solar_kits: solarKits,
        proposals,
        proposal_loads: loads,
        solar_system_calculations: solarCalculations,
        proposal_events: proposalEvents,
        pdf_user_models: pdfModels,
        subscriptions,
        account_usage: accountUsage,
        billing_events: billingEvents,
        mfa_security_events: mfaEvents,
        legal_acceptances: legalAcceptances,
        beta_feedback: feedback,
      },
      storage: {
        files: storageFiles,
        total_files: storageFiles.length,
        total_bytes: storageFiles.reduce((sum, file) => sum + Number(file.size_bytes || 0), 0),
        note: 'Links de arquivos privados expiram em uma hora. O JSON não contém senhas, segredos MFA, tokens, chaves de pagamento ou dados de cartão.',
      },
    }, 200, {
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'account_export_failed';
    console.error('account-data-export failed', { accountId, code });
    return jsonResponse({ error: 'Não foi possível exportar os dados da conta.', code }, 500);
  }
});
