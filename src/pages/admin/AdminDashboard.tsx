import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { adminService, AdminAccountSummary, PlatformAdminRole } from '../../services/adminService';

export function AdminDashboard() {
  const [role, setRole] = useState<PlatformAdminRole>('support');
  const [accounts, setAccounts] = useState<AdminAccountSummary[]>([]);
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [feedback, setFeedback] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccountSummary | null>(null);
  const [reason, setReason] = useState('');
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  const canManageAccounts = role === 'operations' || role === 'super_admin';

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [me, accountResult, eventResult, feedbackResult] = await Promise.all([
        adminService.getMe(),
        adminService.listAccounts({ search }),
        adminService.listEvents(),
        adminService.listBetaFeedback(),
      ]);
      setRole(me.role);
      setAccounts(accountResult.accounts);
      setEvents(eventResult.events);
      setFeedback(feedbackResult.feedback);
    } catch (error) {
      console.error('Erro ao carregar painel administrativo:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o painel administrativo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const criticalEvents = useMemo(
    () => events.filter((event) => event.severity === 'critical' || event.severity === 'error'),
    [events],
  );

  const handleAccountStatus = async () => {
    if (!selectedAccount) return;
    if (reason.trim().length < 10) {
      toast.error('Informe uma justificativa com pelo menos 10 caracteres.');
      return;
    }

    try {
      setIsUpdatingAccount(true);
      if (selectedAccount.blocked) {
        await adminService.reactivateAccount(selectedAccount.id, reason);
        toast.success('Conta reativada e ação registrada na auditoria.');
      } else {
        await adminService.blockAccount(selectedAccount.id, reason);
        toast.success('Conta bloqueada e ação registrada na auditoria.');
      }
      setSelectedAccount(null);
      setReason('');
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a conta.');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-blue">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Administração do SaaS</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-brand-dark">Contas, falhas e feedback do beta</h1>
          <p className="mt-1 text-sm text-slate-500">Papel atual: <strong>{role}</strong>. Todas as alterações de conta exigem justificativa e geram log append-only.</p>
        </div>
        <Button variant="outline" onClick={() => void loadData()} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Users className="h-4 w-4" /> Contas carregadas</p>
          <p className="mt-3 text-3xl font-black text-brand-dark">{accounts.length}</p>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><AlertTriangle className="h-4 w-4" /> Falhas recentes</p>
          <p className="mt-3 text-3xl font-black text-red-600">{criticalEvents.length}</p>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><CheckCircle2 className="h-4 w-4" /> Feedbacks beta</p>
          <p className="mt-3 text-3xl font-black text-brand-blue">{feedback.length}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-brand-border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-brand-dark">Usuários e empresas</h2>
              <p className="mt-1 text-xs text-slate-500">A listagem é obtida pela Admin API e enriquecida com perfil, assinatura e uso.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void loadData(); }} className="flex min-w-0 gap-2 sm:w-96">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar e-mail, nome ou empresa" className="w-full rounded-lg border border-brand-border bg-brand-surface py-2 pl-9 pr-3 text-sm" />
              </div>
              <Button type="submit" size="sm">Buscar</Button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-gray text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Conta</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Plano</th>
                <th className="px-5 py-3">Uso</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-brand-border">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-brand-dark">{account.profile?.name || 'Sem nome'}</p>
                    <p className="text-xs text-slate-500">{account.email || 'Sem e-mail'}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{account.profile?.company_name || 'Não configurada'}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-brand-blue/10 px-2 py-1 text-xs font-bold text-brand-blue">
                      {String(account.subscription?.plan_code || 'free')} / {String(account.subscription?.billing_interval || 'free')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{Number(account.usage?.proposals_created || 0)} propostas</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${account.blocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {account.blocked ? 'Bloqueada' : 'Ativa'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button type="button" size="sm" variant="outline" disabled={!canManageAccounts} onClick={() => { setSelectedAccount(account); setReason(''); }}>
                      {account.blocked ? 'Reativar' : 'Bloquear'}
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && accounts.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Nenhuma conta encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold text-brand-dark">Falhas operacionais recentes</h2>
          <div className="mt-4 max-h-96 space-y-3 overflow-auto">
            {events.slice(0, 30).map((event) => (
              <div key={String(event.id)} className="rounded-xl border border-brand-border bg-brand-gray/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-brand-dark">{String(event.event_type)}</p>
                  <span className="text-xs font-bold uppercase text-slate-500">{String(event.severity)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{String(event.created_at)}</p>
              </div>
            ))}
            {events.length === 0 && <p className="text-sm text-slate-500">Nenhum evento registrado.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold text-brand-dark">Feedback do beta</h2>
          <div className="mt-4 max-h-96 space-y-3 overflow-auto">
            {feedback.slice(0, 30).map((item) => (
              <div key={String(item.id)} className="rounded-xl border border-brand-border bg-brand-gray/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase text-brand-blue">{String(item.category)}</p>
                  <span className="text-xs text-slate-500">Nota {item.score === null ? '—' : String(item.score)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-brand-dark">{String(item.message)}</p>
                <p className="mt-1 text-xs text-slate-500">{String(item.created_at)}</p>
              </div>
            ))}
            {feedback.length === 0 && <p className="text-sm text-slate-500">Nenhum feedback registrado.</p>}
          </div>
        </Card>
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              {selectedAccount.blocked ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Ban className="h-6 w-6 text-red-600" />}
              <div>
                <h2 className="font-bold text-brand-dark">{selectedAccount.blocked ? 'Reativar conta' : 'Bloquear conta'}</h2>
                <p className="text-xs text-slate-500">{selectedAccount.email}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">A alteração usa o bloqueio da Supabase Auth e será registrada com seu usuário, papel, data e justificativa.</p>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1000} className="mt-4 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm" placeholder="Justificativa obrigatória..." />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedAccount(null)} disabled={isUpdatingAccount}>Cancelar</Button>
              <Button onClick={() => void handleAccountStatus()} disabled={isUpdatingAccount} className={selectedAccount.blocked ? '' : 'bg-red-600 hover:bg-red-700'}>
                {isUpdatingAccount ? 'Salvando...' : selectedAccount.blocked ? 'Confirmar reativação' : 'Confirmar bloqueio'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
