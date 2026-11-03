-- Chantiers MGDS : le planning suit l'Excel de Marine, y compris les chantiers absents de l'appli, congés, repos, fériés
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque.
alter table public.planning alter column chantier drop not null;
alter table public.planning add column if not exists libelle text;   -- texte de la case Excel quand il n'y a pas de chantier dans l'appli
alter table public.planning add column if not exists equipe text;    -- 1, 2, 3
alter table public.planning add column if not exists source text;    -- 'excel' = recopié chaque vendredi depuis PLANNING_2026.xlsx
alter table public.planning drop constraint if exists planning_quoi;
alter table public.planning add constraint planning_quoi check (chantier is not null or libelle is not null);
