-- Captures du chiffrage (Steven, 18/11/2026) : sur chaque devis en attente (Planning > Charge), la personne qui chiffre
-- dépose la capture du tableau de marge du logiciel de devis. Dossier documents/chiffrage/<devis>/.
-- Dépôt : éditeurs (Steven, Marine), profil terrain (Stéphanie, Yannick) et Christophe (est_reservant), comme la table devis.
-- À coller dans Supabase > SQL Editor > New query > Run.
drop policy if exists "captures de chiffrage déposées" on storage.objects;
create policy "captures de chiffrage déposées" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'chiffrage'
              and (public.est_editeur() or public.est_terrain() or public.est_reservant()));
