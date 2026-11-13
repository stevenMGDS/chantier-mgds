-- Échange serveur ↔ appli (Steven, 13/11/2026) — à lancer une fois dans Supabase : SQL Editor > New query > Run.
-- Peut être relancé sans risque.
--
-- Le compte de l'iMac (claude@mgds.fr) peut déjà déposer des fichiers dans le stockage « documents ».
-- Il lui faut aussi remplacer, déplacer et supprimer, mais seulement dans les dossiers d'échange :
--   serveur/ (fiches de fabrication, _liens.json), vers-serveur/, vers-serveur-remplacer/, vers-serveur-fait/.
-- Aucun autre compte et aucun autre dossier ne sont concernés.

create or replace function public.est_compte_echange() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profils where id = auth.uid() and lower(email) = 'claude@mgds.fr') $$;

create or replace function public.chemin_echange(nom text) returns boolean
language sql immutable as
$$ select nom like 'serveur/%' or nom like 'vers-serveur/%' or nom like 'vers-serveur-remplacer/%' or nom like 'vers-serveur-fait/%' $$;

-- déposer (aussi dans vers-serveur-remplacer/ et vers-serveur-fait/, au cas où le dépôt général ne les couvre pas)
drop policy if exists "échange : dépôt par l'iMac" on storage.objects;
create policy "échange : dépôt par l'iMac" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.est_compte_echange() and public.chemin_echange(name));

-- remplacer un fichier (dépôt avec écrasement) et déplacer (vers-serveur/ -> vers-serveur-fait/)
drop policy if exists "échange : remplacement par l'iMac" on storage.objects;
create policy "échange : remplacement par l'iMac" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.est_compte_echange() and public.chemin_echange(name))
  with check (bucket_id = 'documents' and public.est_compte_echange() and public.chemin_echange(name));

-- supprimer
drop policy if exists "échange : suppression par l'iMac" on storage.objects;
create policy "échange : suppression par l'iMac" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.est_compte_echange() and public.chemin_echange(name));
