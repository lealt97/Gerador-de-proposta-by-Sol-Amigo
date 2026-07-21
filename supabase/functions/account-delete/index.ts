import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

const MANAGED_BUCKETS = ['logos', 'pdf-assets', 'proposals'] as const;
const PASSWORD_CONFIRMATION_MAX_AGE_SECONDS = 300;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

function hasRecentPasswordConfirmation(token: string) {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1] || '')) as Record<string, unknown>;
    const amr = Array.isArray(payload.amr) ? payload.amr : [];
    const minimumTimestamp = Math.floor(Date.now() / 1000) - PASSWORD_CONFIRMATION_MAX_AGE_SECONDS;

    return amr.some((item) => {
      if (!item || typeof item !== 'object') return false;
      const method = String((item as Record<string, unknown>).method || '');
      const timestamp = Number((item as Record<string, unknown>).timestamp || 0);
      return method === 'password' && Number.isFinite(timestamp) && timestamp >= minimumTimestamp;
    });
  } catch {
    return false;
  }
}

async function collectStoragePaths(
  admin: ReturnType<typeof createClient>,
  bucket: typeof MANAGED_BUCKETS[number],
  prefix: string,
) {
  const paths: string[] = [];

  async function walk(folder: string) {
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(folder, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`storage_list_${bucket}_${error.message}`);
      if (!data?.length) break;

      for (const item of data) {
        const path = folder ? `${folder}/${item.name}` : item.name;
        if (item.id) paths.push(path);
        else await walk(path);
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  await walk(prefix);
  return paths;
}

async function removeStoragePaths(
  admin: ReturnType<typeof createClient>,
  bucket: typeof MANAGED_BUCKETS[number],
  paths: string[],
) {
  const chunkSize = 100;
  for (let index = 0; index < paths.length; index += chunkSize) {
    const chunk = paths.slice(index, index + chunkSize);
    const { error } = await admin.storage.from(bucket).remove(chunk);
    if (error) throw new Error(`storage_remove_${bucket}_${error.message}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  const accessToken = readBearerToken(request);
  if (!accessToken) return jsonResponse({ error: 'Sessão inválida.' }, 401);
  if (!hasRecentPasswordConfirmation(accessToken)) {
    return jsonResponse({
      error: 'Confirme sua senha novamente antes de excluir a conta.',
      code: 'password_confirmation_required',
    }, 403);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('account-delete: missing server configuration');
    return jsonResponse({ error: 'Serviço indisponível.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return jsonResponse({ error: 'Sessão inválida.' }, 401);

  const accountId = userData.user.id;

  try {
    const bucketPaths = await Promise.all(
      MANAGED_BUCKETS.map(async (bucket) => ({
        bucket,
        paths: await collectStoragePaths(admin, bucket, accountId),
      })),
    );

    for (const group of bucketPaths) {
      await removeStoragePaths(admin, group.bucket, group.paths);
    }

    await admin.from('application_events').insert({
      account_id: accountId,
      source: 'edge_function',
      event_type: 'account.deletion_requested',
      severity: 'info',
      fingerprint: 'account.deletion_requested',
      metadata: {
        storage_files_removed: bucketPaths.reduce((sum, group) => sum + group.paths.length, 0),
      },
    });

    const { error: deleteError } = await admin.auth.admin.deleteUser(accountId, false);
    if (deleteError) throw new Error(`auth_delete_${deleteError.message}`);

    return jsonResponse({ deleted: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'account_delete_failed';
    console.error('account-delete failed', { accountId, code });
    return jsonResponse({
      error: 'A exclusão não foi concluída. Nenhuma exclusão parcial de conta foi confirmada; tente novamente ou contate o suporte.',
      code,
    }, 500);
  }
});
