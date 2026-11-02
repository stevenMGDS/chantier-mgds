-- Chantiers MGDS : espace poseurs (planning, heures, photos chantier et consommables)
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque.
-- Rôle « poseur » : voit seulement les chantiers où Marine l'a planifié, leurs fiches (préparation, métré, réception, plans d'exé),
-- note ses heures et dépose des photos. Les autres rôles ne changent pas.

-- ===== rôle =====
alter table public.profils drop constraint if exists profils_role_check;
alter table public.profils add constraint profils_role_check check (role in ('editeur','terrain','lecteur','poseur'));

create or replace function public.est_poseur() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profils where id = auth.uid() and role = 'poseur') $$;

-- ===== planning : un poseur, un chantier, un jour (rempli par Marine) =====
create table if not exists public.planning (
  id bigint generated always as identity primary key,
  jour date not null,
  chantier text not null references public.chantiers(id) on delete cascade,
  poseur uuid not null references public.profils(id) on delete cascade,
  note text,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid(),
  unique (jour, chantier, poseur)
);
create index if not exists planning_poseur_jour on public.planning (poseur, jour);

create or replace function public.poseur_sur(c text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from planning where chantier = c and poseur = auth.uid()) $$;

alter table public.planning enable row level security;
drop policy if exists "planning lu" on public.planning;
create policy "planning lu" on public.planning for select to authenticated using (not public.est_poseur() or poseur = auth.uid());
drop policy if exists "planning géré par les éditeurs" on public.planning;
create policy "planning géré par les éditeurs" on public.planning for all to authenticated using (public.est_editeur()) with check (public.est_editeur());

-- ===== heures : saisies par chaque poseur, validées par Marine =====
create table if not exists public.heures (
  id bigint generated always as identity primary key,
  poseur uuid not null default auth.uid() references public.profils(id) on delete cascade,
  jour date not null,
  chantier text references public.chantiers(id) on delete set null,   -- vide = dépôt / autre (voir note)
  debut time,
  fin time,
  pause_min integer not null default 0 check (pause_min between 0 and 600),
  heures numeric(4,2) not null check (heures >= 0 and heures <= 24),
  note text,
  valide_le timestamptz,
  valide_par uuid,
  maj_le timestamptz not null default now()
);
create index if not exists heures_poseur_jour on public.heures (poseur, jour);

-- une ligne validée par Marine ne bouge plus ; seuls les éditeurs valident
create or replace function public.garde_heures() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if public.est_editeur() or auth.uid() is null then new.maj_le := now(); return new; end if;
  if tg_op = 'UPDATE' then
    if old.valide_le is not null then raise exception 'heures déjà validées'; end if;
    new.poseur := old.poseur;
  else
    new.poseur := auth.uid();
  end if;
  new.valide_le := null; new.valide_par := null; new.maj_le := now();
  return new;
end $$;
drop trigger if exists garde_heures on public.heures;
create trigger garde_heures before insert or update on public.heures for each row execute function public.garde_heures();

alter table public.heures enable row level security;
drop policy if exists "heures lues" on public.heures;
create policy "heures lues" on public.heures for select to authenticated using (poseur = auth.uid() or public.est_editeur());
drop policy if exists "heures saisies" on public.heures;
create policy "heures saisies" on public.heures for insert to authenticated with check (poseur = auth.uid() or public.est_editeur());
drop policy if exists "heures corrigées" on public.heures;
create policy "heures corrigées" on public.heures for update to authenticated
  using ((poseur = auth.uid() and valide_le is null) or public.est_editeur()) with check (poseur = auth.uid() or public.est_editeur());
drop policy if exists "heures supprimées" on public.heures;
create policy "heures supprimées" on public.heures for delete to authenticated
  using ((poseur = auth.uid() and valide_le is null) or public.est_editeur());

-- ===== photos : avant chantier, fin de chantier, consommables sortis / remis au stock =====
create table if not exists public.photos (
  id bigint generated always as identity primary key,
  chantier text not null references public.chantiers(id) on delete cascade,
  poseur uuid not null default auth.uid() references public.profils(id) on delete cascade,
  categorie text not null check (categorie in ('avant','fin','conso_sortie','conso_retour','autre')),
  chemin text not null unique,
  note text,
  pris_le timestamptz not null default now(),
  traite boolean not null default false,   -- relu par Claude (suivi du stock)
  releve text                              -- ce que Claude a relevé sur la photo
);
create index if not exists photos_chantier on public.photos (chantier, categorie);

alter table public.photos enable row level security;
drop policy if exists "photos lues" on public.photos;
create policy "photos lues" on public.photos for select to authenticated using (not public.est_poseur() or public.poseur_sur(chantier));
drop policy if exists "photos déposées" on public.photos;
create policy "photos déposées" on public.photos for insert to authenticated
  with check (poseur = auth.uid() and (not public.est_poseur() or public.poseur_sur(chantier)));
drop policy if exists "photos retirées" on public.photos;
create policy "photos retirées" on public.photos for delete to authenticated
  using ((poseur = auth.uid() and pris_le > now() - interval '1 day') or public.est_editeur());
drop policy if exists "photos annotées par les éditeurs" on public.photos;
create policy "photos annotées par les éditeurs" on public.photos for update to authenticated using (public.est_editeur()) with check (public.est_editeur());

-- fichiers photo : stockage privé, rangés par poseur (<id poseur>/<chantier>/<catégorie>/<horodatage>.jpg)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos','photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "photos fichiers lus" on storage.objects;
create policy "photos fichiers lus" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (not public.est_poseur() or public.poseur_sur((storage.foldername(name))[2])));
drop policy if exists "photos fichiers déposés" on storage.objects;
create policy "photos fichiers déposés" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos fichiers retirés" on storage.objects;
create policy "photos fichiers retirés" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.est_editeur()));

-- ===== ce que voit un poseur dans l'existant =====
-- chantiers : seulement ceux où il est planifié
drop policy if exists "chantiers lus par les connectés" on public.chantiers;
create policy "chantiers lus par les connectés" on public.chantiers for select to authenticated
  using (not public.est_poseur() or public.poseur_sur(id));

-- documents : seulement les fiches et plans de ses chantiers (pas les devis, commandes, factures)
create or replace function public.poseur_doc_ok(p text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
  select 1 from planning pl join chantiers c on c.id = pl.chantier,
       jsonb_array_elements(coalesce(c.data->'docs','[]'::jsonb)) d
  where pl.poseur = auth.uid() and d->>'id' = p
    and d->>'type' in ('Préparation','Métré','Réception','Plans d''exé','Photo')) $$;
drop policy if exists "docs lus" on storage.objects;
create policy "docs lus" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (not public.est_poseur() or public.poseur_doc_ok(name)));
