alter table public.proposals
  add column if not exists roof_type text,
  add column if not exists roof_area_m2 numeric;

comment on column public.proposals.roof_type is 'Tipo de telhado/local de instalação informado na proposta.';
comment on column public.proposals.roof_area_m2 is 'Área útil aproximada do telhado/local de instalação em metros quadrados.';
