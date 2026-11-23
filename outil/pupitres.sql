-- ===== Pupitres et conditionnement atelier (Steven, 23/11/2026) =====
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque.
--
-- pupitres : un numéro = une taille de pupitre (plusieurs pupitres peuvent porter le même numéro).
--   Chaque nouvelle taille prend le numéro suivant (7, 8…). Cotes en mm (relevé en dm : 11 = 1 100 mm).
-- conditionnements : créé seulement quand Christophe, Manu ou Steven le demandent, pour une commande atelier
--   (menuiseries Technal fabriquées à l'atelier). Un conditionnement par commande atelier, modifiable.
-- Lecture : tout le monde sauf les poseurs. Écriture : éditeurs et atelier.

create table if not exists public.pupitres (
  numero integer primary key,
  longueur_mm integer not null check (longueur_mm > 0),   -- socle L
  profondeur_mm integer not null check (profondeur_mm > 0), -- socle P
  hauteur_mm integer not null check (hauteur_mm > 0),     -- dossier H
  quantite integer not null default 1 check (quantite >= 0),
  note text,
  ajoute_le timestamptz not null default now(),
  ajoute_par uuid default auth.uid() references auth.users
);
alter table public.pupitres enable row level security;
drop policy if exists "pupitres lus" on public.pupitres;
create policy "pupitres lus" on public.pupitres for select to authenticated using (not public.est_poseur());
drop policy if exists "pupitres gérés" on public.pupitres;
create policy "pupitres gérés" on public.pupitres for all to authenticated
  using (public.est_editeur() or public.est_atelier()) with check (public.est_editeur() or public.est_atelier());

-- inventaire du 23/11/2026 (photo de Steven)
insert into public.pupitres (numero, longueur_mm, profondeur_mm, hauteur_mm, quantite) values
  (1, 1100, 700, 1500, 5),
  (2, 1400, 1000, 1500, 4),
  (3, 1400, 700, 1500, 4),
  (4, 2700, 700, 1500, 2),
  (5, 800, 500, 1500, 1),
  (6, 1300, 700, 1500, 1)
on conflict (numero) do nothing;

create table if not exists public.conditionnements (
  id bigint generated always as identity primary key,
  atelier_id text not null unique references public.atelier(id) on delete cascade, -- ex. AT26-012
  chantier text,                                            -- ex. D251101601
  demande_par uuid not null default auth.uid() references auth.users,
  demande_le timestamptz not null default now(),
  lignes jsonb not null default '[]'::jsonb,                -- menuiseries saisies (repère, type, cotes, qté, vantaux, vitrage, volet, niveau)
  resultat jsonb,                                           -- pupitres attribués à chaque pièce (rangs, sens, poids)
  statut text not null default 'brouillon' check (statut in ('brouillon','valide')),
  maj_le timestamptz not null default now(),
  maj_par uuid default auth.uid() references auth.users
);
alter table public.conditionnements enable row level security;
drop policy if exists "conditionnements lus" on public.conditionnements;
create policy "conditionnements lus" on public.conditionnements for select to authenticated using (not public.est_poseur());
drop policy if exists "conditionnements gérés" on public.conditionnements;
create policy "conditionnements gérés" on public.conditionnements for all to authenticated
  using (public.est_editeur() or public.est_atelier()) with check (public.est_editeur() or public.est_atelier());
