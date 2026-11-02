-- Chantiers MGDS : base Supabase (à coller dans SQL Editor > New query > Run)
-- Rôles : "editeur" (Steven, Marine) modifie ; "lecteur" (Yannick, Stéphanie…) consulte seulement.

create table if not exists public.profils (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  nom text,
  role text not null default 'lecteur' check (role in ('editeur','lecteur'))
);

-- un document JSON par chantier, même structure que l'appli actuelle (steps, arcs, phases, factures, docs…)
create table if not exists public.chantiers (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  maj_le timestamptz not null default now(),
  maj_par uuid references auth.users
);

create or replace function public.est_editeur() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profils where id = auth.uid() and role = 'editeur') $$;

-- version incrémentée à chaque écriture : deux personnes ne s'écrasent pas
create or replace function public.chantier_maj() returns trigger language plpgsql as
$$ begin new.version := coalesce(old.version, 0) + 1; new.maj_le := now(); new.maj_par := auth.uid(); return new; end $$;
drop trigger if exists chantier_maj on public.chantiers;
create trigger chantier_maj before update on public.chantiers for each row execute function public.chantier_maj();

-- profil créé à la première connexion (lecteur par défaut)
create or replace function public.nouveau_profil() returns trigger
language plpgsql security definer set search_path = public as
$$ begin insert into profils (id, email) values (new.id, new.email) on conflict do nothing; return new; end $$;
drop trigger if exists nouveau_profil on auth.users;
create trigger nouveau_profil after insert on auth.users for each row execute function public.nouveau_profil();

alter table public.profils enable row level security;
alter table public.chantiers enable row level security;

drop policy if exists "profils lus par les connectés" on public.profils;
create policy "profils lus par les connectés" on public.profils for select to authenticated using (true);

drop policy if exists "chantiers lus par les connectés" on public.chantiers;
create policy "chantiers lus par les connectés" on public.chantiers for select to authenticated using (true);
drop policy if exists "chantiers créés par les éditeurs" on public.chantiers;
create policy "chantiers créés par les éditeurs" on public.chantiers for insert to authenticated with check (public.est_editeur());
drop policy if exists "chantiers modifiés par les éditeurs" on public.chantiers;
create policy "chantiers modifiés par les éditeurs" on public.chantiers for update to authenticated using (public.est_editeur()) with check (public.est_editeur());
-- pas de suppression depuis l'appli : seul Claude (clé service) peut supprimer

-- documents (PDF devis, fiches, ARC) : stockage privé, lu par les connectés, écrit par les éditeurs
insert into storage.buckets (id, name, public) values ('documents','documents', false) on conflict do nothing;
drop policy if exists "docs lus" on storage.objects;
create policy "docs lus" on storage.objects for select to authenticated using (bucket_id = 'documents');
drop policy if exists "docs écrits par éditeurs" on storage.objects;
create policy "docs écrits par éditeurs" on storage.objects for insert to authenticated with check (bucket_id = 'documents' and public.est_editeur());

-- temps réel : l'appli se met à jour seule quand quelqu'un modifie
alter publication supabase_realtime add table public.chantiers;

-- ===== 02/11/2026 : profil « terrain » (Yannick, Stéphanie) =====
-- Ils consultent tout, remplissent les fiches (métré, préparation, réception) et cochent les tâches avant / après chantier. Rien d'autre.
alter table public.profils drop constraint if exists profils_role_check;
alter table public.profils add constraint profils_role_check check (role in ('editeur','terrain','lecteur'));

create or replace function public.est_terrain() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profils where id = auth.uid() and role = 'terrain') $$;

create or replace function public.garde_terrain() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if auth.uid() is null or public.est_editeur() then return new; end if;
  if (new.data - array['docs','av','ap','steps']) is distinct from (old.data - array['docs','av','ap','steps'])
    then raise exception 'modification non autorisée'; end if;
  if (coalesce(new.data->'steps','{}'::jsonb) - array['metre','prepa','recep']) is distinct from (coalesce(old.data->'steps','{}'::jsonb) - array['metre','prepa','recep'])
    then raise exception 'étape non autorisée'; end if;
  if jsonb_array_length(coalesce(new.data->'docs','[]'::jsonb)) < jsonb_array_length(coalesce(old.data->'docs','[]'::jsonb))
    then raise exception 'suppression de document non autorisée'; end if;
  return new;
end $$;
drop trigger if exists garde_terrain on public.chantiers;
create trigger garde_terrain before update on public.chantiers for each row execute function public.garde_terrain();

drop policy if exists "chantiers complétés par le terrain" on public.chantiers;
create policy "chantiers complétés par le terrain" on public.chantiers for update to authenticated using (public.est_terrain()) with check (public.est_terrain());
drop policy if exists "fiches déposées par le terrain" on storage.objects;
create policy "fiches déposées par le terrain" on storage.objects for insert to authenticated with check (bucket_id = 'documents' and public.est_terrain());
