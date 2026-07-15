-- =========================================================
-- Normalizacao de status das propostas de teste
-- =========================================================
-- Mantem o fluxo comercial mais claro para o usuario:
-- pending  = Pendente
-- sent     = Enviada
-- viewed   = Visualizada
-- approved = Aprovada
-- rejected = Recusada
-- expired  = Expirada

-- Dados antigos de teste: elimina o uso pratico de draft/accepted.
update public.proposals
set status = 'pending'
where status = 'draft';

update public.proposals
set status = 'approved'
where status = 'accepted';

-- Ajusta textos antigos do historico que foram gravados com status em ingles.
update public.proposal_events
set description = 'Status alterado manualmente para Aprovada'
where description = 'Status alterado manualmente para approved';

update public.proposal_events
set description = 'Status alterado manualmente para Recusada'
where description = 'Status alterado manualmente para rejected';

update public.proposal_events
set description = 'Status alterado manualmente para Pendente'
where description in (
  'Status alterado manualmente para draft',
  'Status alterado manualmente para pending'
);

update public.proposal_events
set description = 'Status alterado manualmente para Enviada'
where description = 'Status alterado manualmente para sent';

update public.proposal_events
set description = 'Status alterado manualmente para Visualizada'
where description = 'Status alterado manualmente para viewed';

update public.proposal_events
set description = 'Status alterado manualmente para Expirada'
where description = 'Status alterado manualmente para expired';

-- Reclassifica eventos antigos aceitos, caso existam.
update public.proposal_events
set event_type = 'accepted',
    description = coalesce(description, 'Cliente aprovou a proposta')
where event_type = 'approved';
