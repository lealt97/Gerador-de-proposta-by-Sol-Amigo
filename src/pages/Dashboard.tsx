import { Card } from '../components/ui/Card';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { ContinueProposalButton } from '../components/proposals/ContinueProposalButton';
import { isProposalPending } from '../lib/proposals/status';
import { proposalService } from '../services/proposalService';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
    pending: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
    sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    viewed: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    approved: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
    accepted: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
    rejected: 'bg-red-50 text-red-600 border-red-100',
    expired: 'bg-slate-700/10 text-slate-700 border-slate-700/20',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] border rounded-full ${styles[status] || styles.pending}`}>
      {
      status === 'draft' || status === 'pending' ? 'Pendente' :
      status === 'sent' ? 'Enviada' :
      status === 'viewed' ? 'Visualizada' :
      status === 'approved' || status === 'accepted' ? 'Aprovada' :
      status === 'rejected' ? 'Recusada' :
      status === 'expired' ? 'Expirada' : status
    }
    </span>
  );
}

export function Dashboard() {
  const [kpiData, setKpiData] = useState({
    clientesAtivos: 0,
    propostasMes: 0,
    propostasTotal: 0,
    valorVendidoAno: 0,
    lucroAcumulado: 0
  });
  const [propostasRecentes, setPropostasRecentes] = useState<any[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{
    id: string;
    title: string | null;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      const { data: proposals } = await supabase
        .from('proposals')
        .select('*, client:clients(name), solar:solar_system_calculations(installed_power_kwp)')
        .order('created_at', { ascending: false });

      if (proposals) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let propMes = 0;
        let valorVendido = 0;
        let lucroTotal = 0;

        proposals.forEach((proposal) => {
          const createdAt = new Date(proposal.created_at);
          if (
            createdAt.getMonth() === currentMonth
            && createdAt.getFullYear() === currentYear
          ) {
            propMes++;
          }

          if (proposal.status === 'approved' || proposal.status === 'accepted') {
            if (createdAt.getFullYear() === currentYear) {
              valorVendido += proposal.final_price || 0;
            }
            lucroTotal += proposal.estimated_profit || 0;
          }
        });

        setKpiData({
          clientesAtivos: clientsCount || 0,
          propostasMes: propMes,
          propostasTotal: proposals.length,
          valorVendidoAno: valorVendido,
          lucroAcumulado: lucroTotal
        });

        setPropostasRecentes(proposals.slice(0, 10));
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const triggerDelete = (proposal: any) => {
    setProposalToDelete({
      id: proposal.id,
      title: proposal.title || proposal.client?.name || null,
    });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!proposalToDelete) return;

    try {
      setIsDeleting(true);
      await proposalService.deleteProposal(proposalToDelete.id);
      toast.success('Proposta excluída com sucesso!');
      setDeleteModalOpen(false);
      setProposalToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir proposta');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Clientes Ativos</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold">{kpiData.clientesAtivos}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Propostas (Mês)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold">{kpiData.propostasMes}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Propostas (Total)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold">{kpiData.propostasTotal}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Vendido (Ano)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold text-emerald-700">{formatCurrency(kpiData.valorVendidoAno)}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Lucro Acumulado</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold text-brand-blue">{formatCurrency(kpiData.lucroAcumulado)}</h3>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-surface">
          <h3 className="text-sm font-medium">Propostas Recentes</h3>
          <Link to="/propostas" className="text-xs text-brand-blue hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto scroll-after-3-table">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-gray text-slate-500 text-[10px] uppercase tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Potência</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm bg-brand-surface">
              {propostasRecentes.map((proposal) => {
                const pending = isProposalPending(proposal);

                return (
                  <tr key={proposal.id} className="border-b border-brand-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-brand-dark">{proposal.client?.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(proposal.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-brand-dark">
                      {(() => {
                        const solarObj = Array.isArray(proposal.solar) ? proposal.solar[0] : proposal.solar;
                        return solarObj?.installed_power_kwp
                          ? `${solarObj.installed_power_kwp.toFixed(1)} kWp`
                          : '-';
                      })()}
                    </td>
                    <td className="px-4 py-3 font-mono text-brand-dark">{formatCurrency(proposal.final_price || 0)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pending ? (
                          <>
                            <ContinueProposalButton
                              to={`/propostas/${proposal.id}/editar`}
                              className="h-9 min-w-[170px]"
                            />
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                              title="Excluir"
                              aria-label="Excluir proposta pendente"
                              onClick={() => triggerDelete(proposal)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              to={`/propostas/${proposal.id}`}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-white hover:bg-gray-100 transition-colors"
                              title="Visualizar Proposta"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/propostas/${proposal.id}/editar`}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-brand-light hover:bg-brand-blue/10 transition-colors"
                              title="Editar Proposta"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {propostasRecentes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (isDeleting) return;
          setDeleteModalOpen(false);
          setProposalToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Excluir Proposta"
        description={`Tem certeza que deseja excluir a proposta "${proposalToDelete?.title || 'Sem título'}"? Esta ação é permanente e não poderá ser desfeita.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
