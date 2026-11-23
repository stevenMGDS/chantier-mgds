-- ===== Validation du planning par Marine (Steven, 23/11/2026) =====
-- Marine (ou Steven) dépose l'Excel PLANNING dans l'onglet Planning : le fichier va dans le stockage « outil »
-- sous planning/PLANNING_<AAAA-MM-JJ>.xlsx et une ligne est ajoutée ici. La validation faite du lundi au vendredi matin
-- vaut pour le planning envoyé dans l'appli le vendredi matin suivant ; « semaine » = le lundi de la semaine planifiée.
-- La tâche du vendredi passe la ligne en « envoye » (ou « erreur ») avec un résumé.
create table if not exists public.planning_validation (
  id bigint generated always as identity primary key,
  semaine date not null,                                   -- le lundi concerné
  fichier text not null,                                   -- chemin dans le stockage « outil » (planning/PLANNING_….xlsx)
  valide_par uuid not null default auth.uid() references public.profils(id),
  valide_le timestamptz not null default now(),
  statut text not null default 'valide' check (statut in ('valide','envoye','erreur')),
  resume text,                                             -- résumé de l'envoi (lignes recopiées, textes sans chantier…)
  envoye_le timestamptz                                    -- quand le planning est arrivé dans l'appli
);
create index if not exists planning_validation_semaine on public.planning_validation (semaine desc, valide_le desc);
alter table public.planning_validation enable row level security;
drop policy if exists "validations lues par le bureau" on public.planning_validation;
create policy "validations lues par le bureau" on public.planning_validation for select to authenticated using (public.est_editeur());
drop policy if exists "validation par le bureau" on public.planning_validation;
create policy "validation par le bureau" on public.planning_validation for insert to authenticated
  with check (public.est_editeur() and valide_par = auth.uid() and statut = 'valide');

-- fichier déposé : stockage « outil », dossier planning/ seulement (remplacé s'il est redéposé le même jour)
drop policy if exists "planning déposé par le bureau" on storage.objects;
create policy "planning déposé par le bureau" on storage.objects for insert to authenticated
  with check (bucket_id = 'outil' and public.est_editeur() and (storage.foldername(name))[1] = 'planning');
drop policy if exists "planning remplacé par le bureau" on storage.objects;
create policy "planning remplacé par le bureau" on storage.objects for update to authenticated
  using (bucket_id = 'outil' and public.est_editeur() and (storage.foldername(name))[1] = 'planning');
drop policy if exists "planning lu par le bureau" on storage.objects;
create policy "planning lu par le bureau" on storage.objects for select to authenticated
  using (bucket_id = 'outil' and public.est_editeur() and (storage.foldername(name))[1] = 'planning');
