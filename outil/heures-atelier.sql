-- Heures de production à l'atelier (Steven, 12/11/2026) — à lancer une fois dans Supabase : SQL Editor > New query > Run.
-- Peut être relancé sans risque. Ne modifie aucune heure déjà saisie.
--
-- Manu et les poseurs qui l'aident notent leur journée à l'atelier : pour chaque ligne, la commande atelier et la tâche
-- (Débit, Usinage, Montage, Vitrage, Divers), ou une « Autre tâche » hors production (ex. décharger un camion).
-- Une ligne avec une tâche = heure faite à l'atelier (en orange dans l'Excel de Marine).

alter table public.heures add column if not exists atelier text references public.atelier(id) on delete set null;
alter table public.heures add column if not exists tache text;
create index if not exists heures_atelier on public.heures (atelier) where atelier is not null;

-- l'atelier (Christophe, Manu) voit toutes les heures de production : temps passé et reste à faire de chaque commande
drop policy if exists "heures atelier lues" on public.heures;
create policy "heures atelier lues" on public.heures for select to authenticated
  using (tache is not null and public.est_atelier());

-- liste des commandes atelier en cours pour le choix du chantier (les poseurs ne lisent pas la table atelier)
create or replace function public.atelier_choix()
returns table (id text, nom text, objet text, chantier text, heures numeric, debut text, fin text)
language sql stable security definer set search_path = public as
$$ select a.id,
          coalesce(nullif(a.data->>'client',''), c.data->>'client', nullif(a.data->>'chantier',''), a.id),
          a.data->>'objet', c.id,
          case when (a.data->>'heures') ~ '^[0-9]+([.,][0-9]+)?$' then replace(a.data->>'heures', ',', '.')::numeric end,
          a.data->'steps'->'debut'->>'d', coalesce(a.data->'steps'->'fin'->>'d', a.data->'calc'->>'fin')
     from public.atelier a left join public.chantiers c on c.id = a.data->>'chantier'
    where a.id not like '\_%' and coalesce(a.data->'steps'->'livre'->>'d', '') = ''
      and auth.uid() is not null
    order by 2 $$;
revoke all on function public.atelier_choix() from public, anon;
grant execute on function public.atelier_choix() to authenticated;
