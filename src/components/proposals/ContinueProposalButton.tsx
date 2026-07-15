import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ContinueProposalButtonProps {
  to: string;
  className?: string;
}

export function ContinueProposalButton({ to, className }: ContinueProposalButtonProps) {
  return (
    <Link
      to={to}
      title="Continuar proposta"
      aria-label="Continuar proposta"
      className={cn(
        'inline-flex h-10 min-w-[180px] items-center justify-center gap-2 rounded-md bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-brand-gray',
        className
      )}
    >
      <ArrowRight className="h-4 w-4" />
      Continuar Proposta
    </Link>
  );
}
