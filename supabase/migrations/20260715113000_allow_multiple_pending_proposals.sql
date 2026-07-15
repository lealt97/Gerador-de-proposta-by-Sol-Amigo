-- =========================================================
-- Permitir multiplas propostas pendentes intencionais
-- =========================================================
-- A regra final do produto e:
-- cada clique em Nova/Gerar Proposta deve criar exatamente uma proposta pendente.
-- Portanto, nao deve existir trava unica impedindo mais de uma proposta pendente
-- para o mesmo cliente/usuario. A prevencao de duplicidade acidental fica no frontend,
-- evitando duas criacoes no mesmo clique.

drop index if exists public.proposals_single_open_per_client_idx;
