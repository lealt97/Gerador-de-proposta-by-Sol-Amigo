import { FormEvent, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Image as ImageIcon,
  Loader2,
  Palette,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  User,
  UserX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase/client';
import { accountDataService } from '../services/accountDataService';

const inputClassName = 'w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue';

const settingsTabs = [
  { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
  { id: 'logo', label: 'Logo', icon: ImageIcon },
  { id: 'vendedor', label: 'Dados do Usuário', icon: User },
  { id: 'customizacao', label: 'Customização da Conta', icon: Palette },
  { id: 'preferencias', label: 'Preferências Comerciais', icon: SettingsIcon },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'encerramento', label: 'Encerramento da Conta', icon: UserX },
] as const;

export function AccountClosure() {
  const { user, signOut } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!user?.email) {
      setErrorMessage('Sua sessão não possui um e-mail autenticado. Entre novamente antes de excluir a conta.');
      return;
    }

    if (confirmation.trim().toLowerCase() !== 'excluir a conta') {
      setErrorMessage('Digite exatamente “excluir a conta” para confirmar.');
      return;
    }

    if (!password) {
      setErrorMessage('Informe sua senha atual.');
      return;
    }

    try {
      setIsDeleting(true);

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) throw new Error('A senha digitada está incorreta.');

      const accessToken = signInData.session?.access_token;
      if (!accessToken) {
        throw new Error('Não foi possível gerar uma confirmação recente da senha. Entre novamente e repita a exclusão.');
      }

      await accountDataService.deleteAccount(accessToken);
      toast.success('Conta, dados e arquivos excluídos permanentemente.');

      try {
        await signOut();
      } catch {
        // O usuário já foi removido do Auth; a sessão local será descartada pelo redirecionamento.
      }

      window.location.replace('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a conta.';
      console.error('Erro ao encerrar conta:', error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-brand-dark">Configurações da Conta</h1>
        <p className="text-sm text-slate-500">Gerencie as configurações da conta e o encerramento definitivo do acesso.</p>
      </div>

      <div className="flex flex-col items-start gap-8 md:flex-row">
        <nav className="flex w-full shrink-0 flex-col gap-1 md:w-64" aria-label="Configurações da conta">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === 'encerramento';
            return (
              <Link
                key={tab.id}
                to={`/configuracoes?tab=${tab.id}`}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-transparent text-slate-500 hover:bg-gray-100 hover:text-brand-dark'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="w-full min-w-0 flex-1">
          <Card className="overflow-hidden border-red-200">
            <CardHeader className="rounded-t-xl border-b border-red-100 bg-red-50/70">
              <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Encerramento da Conta
              </CardTitle>
              <CardDescription className="text-red-700/80">
                Esta ação é permanente e não pode ser desfeita.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleDelete} className="space-y-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    O que será excluído
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-amber-700">
                    A exclusão remove os arquivos gerenciados da conta, o usuário de autenticação e os registros relacionados. Antes de continuar, gere sua exportação em Configurações da Conta → Segurança.
                  </p>
                </div>

                {errorMessage && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="account-delete-confirmation" className="text-sm font-medium text-brand-dark">
                    Confirme digitando <strong className="text-red-600">excluir a conta</strong>
                  </label>
                  <input
                    id="account-delete-confirmation"
                    type="text"
                    autoComplete="off"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className={inputClassName}
                    disabled={isDeleting}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="account-delete-password" className="text-sm font-medium text-brand-dark">Senha atual</label>
                  <input
                    id="account-delete-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClassName}
                    disabled={isDeleting}
                  />
                </div>

                <div className="flex justify-end border-t border-brand-border pt-5">
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={isDeleting}
                    className="gap-2 border-none bg-red-600 text-white hover:bg-red-700"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {isDeleting ? 'Excluindo conta...' : 'Excluir minha conta permanentemente'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
