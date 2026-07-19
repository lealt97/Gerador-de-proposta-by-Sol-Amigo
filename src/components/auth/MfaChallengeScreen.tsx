import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, LifeBuoy, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import {
  challengeAndVerifyTotp,
  loadVerifiedTotpFactors,
  normalizeTotpCode,
  readableMfaError,
} from '../../lib/auth/authFlows';
import {
  formatMfaRecoveryCode,
  isValidMfaRecoveryCode,
  recoverMfaWithCode,
} from '../../lib/auth/mfaRecovery';
import { supabase } from '../../lib/supabase/client';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';

type MfaChallengeScreenProps = {
  onSuccess: () => void | Promise<void>;
  onSignOut: () => Promise<void>;
};

type VerificationMode = 'totp' | 'recovery';

export function MfaChallengeScreen({ onSuccess, onSignOut }: MfaChallengeScreenProps) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mode, setMode] = useState<VerificationMode>('totp');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const verifiedFactors = await loadVerifiedTotpFactors(supabase.auth.mfa);
        const verifiedFactor = verifiedFactors[0];

        if (!verifiedFactor) {
          const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (assurance.error) throw assurance.error;

          if (assurance.data?.nextLevel !== 'aal2') {
            await onSuccess();
            return;
          }

          throw new Error('Nenhum aplicativo autenticador verificado foi encontrado para esta conta.');
        }

        if (mounted) setFactorId(verifiedFactor.id);
      } catch (error) {
        if (mounted) setErrorMessage(readableMfaError(error));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [onSuccess]);

  const switchMode = (nextMode: VerificationMode) => {
    setMode(nextMode);
    setCode('');
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!factorId) return;

    if (mode === 'totp') {
      const normalizedCode = normalizeTotpCode(code);
      if (normalizedCode.length !== 6) {
        setErrorMessage('Digite o código de seis números do aplicativo autenticador.');
        return;
      }
    } else if (!isValidMfaRecoveryCode(code)) {
      setErrorMessage('Digite um código de recuperação completo.');
      return;
    }

    setErrorMessage(null);
    setIsVerifying(true);

    try {
      if (mode === 'totp') {
        await challengeAndVerifyTotp(supabase.auth.mfa, factorId, normalizeTotpCode(code));
        await onSuccess();
        return;
      }

      await recoverMfaWithCode(code);
      await supabase.auth.signOut({ scope: 'local' });
      window.location.assign('/login?mfa-recovery=success');
    } catch (error) {
      setErrorMessage(
        mode === 'totp'
          ? readableMfaError(error)
          : error instanceof Error
            ? error.message
            : 'Não foi possível utilizar o código de recuperação.',
      );
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const isCodeComplete = mode === 'totp'
    ? normalizeTotpCode(code).length === 6
    : isValidMfaRecoveryCode(code);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-brand-gray p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
            {mode === 'totp' ? <ShieldCheck className="h-7 w-7" /> : <LifeBuoy className="h-7 w-7" />}
          </div>
          <CardTitle className="text-2xl">
            {mode === 'totp' ? 'Verificação em duas etapas' : 'Recuperar acesso à conta'}
          </CardTitle>
          <CardDescription>
            {mode === 'totp'
              ? 'Abra o aplicativo autenticador vinculado à sua conta e digite o código atual para continuar.'
              : 'Use um dos códigos salvos quando o MFA foi ativado. O código será consumido, o MFA será removido e todas as sessões serão encerradas.'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="login-mfa-code" className="flex items-center gap-2 text-sm font-medium text-brand-dark">
                <KeyRound className="h-4 w-4 text-brand-blue" />
                {mode === 'totp' ? 'Código de segurança' : 'Código de recuperação'}
              </label>
              <input
                id="login-mfa-code"
                type="text"
                inputMode={mode === 'totp' ? 'numeric' : 'text'}
                autoComplete="one-time-code"
                maxLength={mode === 'totp' ? 6 : 29}
                autoFocus
                disabled={isLoading || isVerifying || !factorId}
                value={code}
                onChange={(event) => setCode(
                  mode === 'totp'
                    ? normalizeTotpCode(event.target.value)
                    : formatMfaRecoveryCode(event.target.value),
                )}
                placeholder={mode === 'totp' ? '000000' : 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF'}
                className={`w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-3 text-center font-semibold text-brand-dark outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue disabled:opacity-60 ${
                  mode === 'totp' ? 'text-xl tracking-[0.4em]' : 'text-sm tracking-wide'
                }`}
              />
              <p className="text-xs text-slate-500">
                {mode === 'totp'
                  ? 'O código muda aproximadamente a cada 30 segundos.'
                  : 'Cada código de recuperação funciona uma única vez.'}
              </p>
            </div>

            <button
              type="button"
              disabled={isVerifying}
              onClick={() => switchMode(mode === 'totp' ? 'recovery' : 'totp')}
              className="w-full text-center text-sm font-medium text-brand-blue hover:underline disabled:opacity-60"
            >
              {mode === 'totp' ? 'Perdi acesso ao aplicativo autenticador' : 'Voltar para o código do aplicativo'}
            </button>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full gap-2" disabled={isLoading || isVerifying || !factorId || !isCodeComplete}>
              {isLoading || isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'totp' ? <ShieldCheck className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
              {isLoading
                ? 'Carregando proteção...'
                : isVerifying
                  ? 'Verificando...'
                  : mode === 'totp'
                    ? 'Confirmar e entrar'
                    : 'Usar código e remover MFA'}
            </Button>
            <Button type="button" variant="outline" className="w-full gap-2" disabled={isVerifying} onClick={() => void onSignOut()}>
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
