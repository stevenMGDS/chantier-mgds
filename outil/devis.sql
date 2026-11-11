-- Devis en attente (v22, 11/11/2026) : une ligne par devis chiffré susceptible d'être signé (onglet Planning > Charge).
-- data = {client, montant, chance (forte / moyenne / faible), jp (jours de pose), ha (heures d'atelier), periode (AAAA-MM), etat (attente / signe / perdu)}
-- Lecture et écriture : éditeurs (Steven, Marine) et profil terrain (Stéphanie, Yannick). Les poseurs et l'atelier n'y ont pas accès.
-- À coller dans Supabase > SQL Editor > New query > Run.
create table if not exists public.devis (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  maj_le timestamptz not null default now()
);
alter table public.devis enable row level security;
drop policy if exists "devis lus" on public.devis;
create policy "devis lus" on public.devis for select to authenticated using (public.est_editeur() or public.est_terrain());
drop policy if exists "devis créés" on public.devis;
create policy "devis créés" on public.devis for insert to authenticated with check (public.est_editeur() or public.est_terrain());
drop policy if exists "devis modifiés" on public.devis;
create policy "devis modifiés" on public.devis for update to authenticated using (public.est_editeur() or public.est_terrain()) with check (public.est_editeur() or public.est_terrain());
drop policy if exists "devis supprimés" on public.devis;
create policy "devis supprimés" on public.devis for delete to authenticated using (public.est_editeur());
