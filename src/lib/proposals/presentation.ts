import type { Proposal } from '../../types/proposal';

const PROPOSAL_STATUS_LABELS: Record<Proposal['status'], string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  sent: 'Enviada',
  viewed: 'Visualizada',
  accepted: 'Aprovada',
  approved: 'Aprovada',
  rejected: 'Recusada',
  expired: 'Expirada',
};

export function getProposalStatusLabel(status: Proposal['status'] | string) {
  return PROPOSAL_STATUS_LABELS[status as Proposal['status']] || status;
}
