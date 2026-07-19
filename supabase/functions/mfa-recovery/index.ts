import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function extractFactors(data: unknown): Array<{ id: string; status?: string }> {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const record = data as Record<string, unknown>;
  if (Array.isArray(record.factors)) {
    return record.factors as Array<{ id: string; status?: string }>;
  }

  const totp = Array.isArray(record.totp) ? record.totp : [];
  const phone = Array.isArray(record.phone) ? record.phone : [];
  const webauthn = Array.isArray(record.webauthn) ? record.webauthn : [];
  return [...totp, ...phone, ...webauthn] as Array<{ id: string; status?: string }>;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return jsonResponse({ error: 'Sessão inválida.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('mfa-recovery: missing Supabase server credentials');
    return jsonResponse({ error: 'Serviço indisponível.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  let codeId: string | null = null;
  let userId: string | null = null;

  try {
    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code : '';

    if (code.length < 24 || code.length > 40) {
      return jsonResponse({ error: 'Código de recuperação inválido.' }, 400);
    }

    const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }

    userId = userData.user.id;

    const { data: consumedCodeId, error: consumeError } = await admin.rpc(
      'consume_mfa_recovery_code',
      {
        p_user_id: userId,
        p_code: code,
      },
    );

    if (consumeError) {
      console.error('mfa-recovery: validation operation failed', consumeError);
      return jsonResponse({ error: 'Não foi possível validar o código.' }, 500);
    }

    codeId = typeof consumedCodeId === 'string' ? consumedCodeId : null;
    if (!codeId) {
      return jsonResponse({ error: 'Código de recuperação inválido ou já utilizado.' }, 400);
    }

    const { error: signOutError } = await admin.auth.admin.signOut(accessToken, 'global');
    if (signOutError) throw signOutError;

    const { data: factorData, error: factorError } = await admin.auth.admin.mfa.listFactors({
      userId,
    });

    if (factorError) throw factorError;

    const factors = extractFactors(factorData);
    for (const factor of factors) {
      if (!factor?.id) continue;

      const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
        userId,
        id: factor.id,
      });
      if (deleteError) throw deleteError;
    }

    const { data: finalized, error: finalizeError } = await admin.rpc(
      'finalize_mfa_recovery',
      {
        p_user_id: userId,
        p_code_id: codeId,
      },
    );

    if (finalizeError || finalized !== true) {
      console.error('mfa-recovery: finalization failed', finalizeError);
      return jsonResponse({ error: 'O fator foi removido, mas a finalização precisa de suporte.' }, 500);
    }

    return jsonResponse({
      recovered: true,
      signedOut: true,
      message: 'MFA removido. Entre novamente e configure um novo autenticador.',
    });
  } catch (error) {
    console.error('mfa-recovery: unexpected failure', error);

    if (userId && codeId) {
      const { error: restoreError } = await admin.rpc('restore_mfa_recovery_code', {
        p_user_id: userId,
        p_code_id: codeId,
      });
      if (restoreError) {
        console.error('mfa-recovery: compensation failed', restoreError);
      }
    }

    return jsonResponse({ error: 'Não foi possível concluir a recuperação da conta.' }, 500);
  }
});
