-- Onglet Direction : factures fournisseurs affectées, déboursés prévus, tarifs (à coller dans SQL Editor > New query > Run)
-- Mêmes documents que l'appli claude.ai : direction/fac_*, direction/prev_<chantier>, direction/tarifs.
-- Réservé à Steven : la base refuse tout autre compte, même éditeur.
create table if not exists public.direction (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  maj_le timestamptz not null default now()
);
alter table public.direction enable row level security;
drop policy if exists "direction reservee a Steven" on public.direction;
create policy "direction reservee a Steven" on public.direction for all to authenticated
  using (lower(auth.jwt()->>'email') = 's.gallais@mgds.fr')
  with check (lower(auth.jwt()->>'email') = 's.gallais@mgds.fr');
