-- Suppression des chantiers terminés par la synchronisation de l'iMac (Steven, 19/11/2026) : un dossier rangé dans
-- Z.TERMINÉS fait retirer le chantier de l'appli (le serveur garde tout). Seul le compte de l'iMac (claude@mgds.fr,
-- fonction est_compte_echange de outil/echange-serveur.sql) peut supprimer ; personne d'autre.
-- Attention : la suppression d'un chantier retire aussi ses lignes de planning (lien « on delete cascade »).
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque.
drop policy if exists "chantiers supprimés par la synchronisation" on public.chantiers;
create policy "chantiers supprimés par la synchronisation" on public.chantiers for delete to authenticated
  using (public.est_compte_echange());
