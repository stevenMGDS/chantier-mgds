-- Réglages de l'appli (Steven, 18/11/2026) : objectifs de rentabilité, règles de chiffrage, horaires de l'atelier,
-- délais d'alerte des acomptes. Lus par tous les comptes (l'appli et l'appli poseurs en ont besoin), modifiés par
-- les éditeurs seulement (Steven, Marine) depuis l'onglet « Réglages ».
-- À coller dans Supabase > SQL Editor > New query > Run.
create table if not exists public.reglages (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  maj_le timestamptz not null default now()
);
alter table public.reglages enable row level security;
drop policy if exists "réglages lus" on public.reglages;
create policy "réglages lus" on public.reglages for select to authenticated using (true);
drop policy if exists "réglages créés" on public.reglages;
create policy "réglages créés" on public.reglages for insert to authenticated with check (public.est_editeur());
drop policy if exists "réglages modifiés" on public.reglages;
create policy "réglages modifiés" on public.reglages for update to authenticated using (public.est_editeur()) with check (public.est_editeur());
