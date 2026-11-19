-- Déplacements faits dans l'appli (Steven, 19/11/2026) : un chantier déplacé (autre jour, autre équipe) depuis l'onglet
-- Planning > Jour par jour garde son jour et son équipe d'origine, pour que la recopie de l'Excel du vendredi
-- (outil/sync_planning.py) ne le remette pas à son ancienne place tant que Marine ne l'a pas reporté dans l'Excel.
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque.
alter table public.planning add column if not exists deplace_de text;   -- « AAAA-MM-JJ|équipe » d'origine
