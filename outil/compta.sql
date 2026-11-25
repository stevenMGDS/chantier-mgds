-- Dépôt comptable (Steven, 25/11/2026) : Marine dépose grand livre, export des factures fournisseurs… dans le dossier
-- serveur Public/MGDS/COMPTABILITE ; l'iMac (compte « Claude » de la synchronisation) les recopie dans le stockage privé
-- « compta ». Personne d'autre ne peut les lire ni les déposer : ni l'appli, ni les poseurs, ni le bureau. Claude les lit
-- depuis sa session cloud et ne range que des résultats dans la page Direction (Steven seul).
-- Le stockage « compta » est déjà créé (privé). À lancer une fois : Supabase > SQL Editor > New query > Run.
drop policy if exists "compta déposée par la synchro" on storage.objects;
create policy "compta déposée par la synchro" on storage.objects for insert to authenticated
  with check (bucket_id = 'compta' and auth.uid() = '9f1ead30-a50b-4e39-beaf-390e76ecc2ca'::uuid);
drop policy if exists "compta lue par la synchro" on storage.objects;
create policy "compta lue par la synchro" on storage.objects for select to authenticated
  using (bucket_id = 'compta' and auth.uid() = '9f1ead30-a50b-4e39-beaf-390e76ecc2ca'::uuid);
