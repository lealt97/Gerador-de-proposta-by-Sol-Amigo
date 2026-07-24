import { ArrowRight, Copy, Eye, FilePenLine, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProposalContinuePath, getProposalEditPath, isActiveProposalFlowDraft } from '../../lib/proposals/flow';
import type { Proposal } from '../../types/proposal';
import { Button } from '../ui/Button';

export type ProposalActionTarget = Pick<Proposal,
  | 'id'
  | 'title'
  | 'status'
  | 'flow_state'
  | 'flow_completed'
>;

type ProposalActionButtonsProps<TProposal extends ProposalActionTarget> = {
  proposal: TProposal;
  isDuplicating?: boolean;
  onDuplicate: (proposal: TProposal) => void | Promise<void>;
  onRename: (proposal: TProposal) => void;
  onDelete: (proposal: TProposal) => void;
};

export function ProposalActionButtons<TProposal extends ProposalActionTarget>({
  proposal,
  isDuplicating = false,
  onDuplicate,
  onRename,
  onDelete,
}: ProposalActionButtonsProps<TProposal>) {
  const navigate = useNavigate();
  const isFlowDraft = isActiveProposalFlowDraft(proposal);

  return (
    <div className="flex justify-end gap-1">
      {isFlowDraft ? (
        <Button className="gap-2" onClick={() => navigate(getProposalContinuePath(proposal.id))}>
          Continuar <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="icon" title="Visualizar" onClick={() => navigate(`/propostas/${proposal.id}`)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => navigate(getProposalEditPath(proposal.id))}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Duplicar"
            disabled={isDuplicating}
            onClick={() => void onDuplicate(proposal)}
          >
            <Copy className={`h-4 w-4 ${isDuplicating ? 'animate-pulse' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" title="Renomear" onClick={() => onRename(proposal)}>
            <FilePenLine className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        size="icon"
        title="Excluir"
        className="text-red-500"
        onClick={() => onDelete(proposal)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
