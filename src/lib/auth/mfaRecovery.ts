import { supabase } from '../supabase/client';
import {
  formatMfaRecoveryCode,
  isValidMfaRecoveryCode,
} from './mfaRecoveryCode';

export {
  MFA_RECOVERY_CODE_GROUP_SIZE,
  MFA_RECOVERY_CODE_RAW_LENGTH,
  formatMfaRecoveryCode,
  isValidMfaRecoveryCode,
  normalizeMfaRecoveryCode,
} from './mfaRecoveryCode';

export type MfaRecoveryCodeStatus = {
  factorId: string | null;
  unusedCount: number;
  generatedAt: string | null;
  lastUsedAt: string | null;
};

export async function getMfaRecoveryCodeStatus(): Promise<MfaRecoveryCodeStatus> {
  const { data, error } = await supabase.rpc('get_mfa_recovery_code_status');
  if (error) throw error;

  const status = (data || {}) as Partial<MfaRecoveryCodeStatus>;
  return {
    factorId: typeof status.factorId === 'string' ? status.factorId : null,
    unusedCount: Number.isFinite(Number(status.unusedCount)) ? Number(status.unusedCount) : 0,
    generatedAt: typeof status.generatedAt === 'string' ? status.generatedAt : null,
    lastUsedAt: typeof status.lastUsedAt === 'string' ? status.lastUsedAt : null,
  };
}

export async function generateMfaRecoveryCodes(): Promise<string[]> {
  const { data, error } = await supabase.rpc('generate_mfa_recovery_codes');
  if (error) throw error;

  if (!Array.isArray(data) || data.length !== 10 || data.some((code) => typeof code !== 'string')) {
    throw new Error('O servidor não retornou o conjunto completo de códigos de recuperação.');
  }

  return data.map((code) => formatMfaRecoveryCode(code));
}

export async function recoverMfaWithCode(rawCode: string) {
  const code = formatMfaRecoveryCode(rawCode);
  if (!isValidMfaRecoveryCode(code)) {
    throw new Error('Digite um código de recuperação válido.');
  }

  const { data, error } = await supabase.functions.invoke('mfa-recovery', {
    body: { code },
  });

  if (error) {
    throw new Error('Código inválido, já utilizado ou não foi possível concluir a recuperação.');
  }

  if (data?.recovered !== true || data?.signedOut !== true) {
    throw new Error('A recuperação não foi confirmada pelo servidor.');
  }

  return data as {
    recovered: true;
    signedOut: true;
    message?: string;
  };
}
