import type { Proposal } from '../../types/proposal';

export const PROPOSAL_FLOW_LAST_STEP = 6;

export function clampProposalFlowStep(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(PROPOSAL_FLOW_LAST_STEP, Math.max(0, parsed));
}

export function isActiveProposalFlowDraft(
  proposal: Pick<Proposal, 'status' | 'flow_state' | 'flow_completed'>,
) {
  return proposal.status === 'draft'
    && proposal.flow_state != null
    && proposal.flow_completed !== true;
}

export function getProposalContinuePath(proposalId: string) {
  return `/propostas/${proposalId}/continuar`;
}

export function getProposalEditPath(proposalId: string) {
  return `/propostas/${proposalId}/editar`;
}
