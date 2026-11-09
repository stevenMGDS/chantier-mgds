-- Compte « sauvegarde » (sauvegarde@mgds.fr) : lecture seule, utilisé chaque lundi par le Mac du bureau (outil/sauvegarde.py).
-- Il lit tout ce que lit un compte « consultation », plus les heures des poseurs.
-- Il ne lit pas l'onglet Direction (réservé à Steven) et ne peut rien modifier.
alter table public.profils drop constraint if exists profils_role_check;
alter table public.profils add constraint profils_role_check
  check (role in ('editeur','terrain','lecteur','poseur','atelier','sauvegarde'));

create or replace function public.est_sauvegarde() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profils where id = auth.uid() and role = 'sauvegarde') $$;

drop policy if exists "heures lues par la sauvegarde" on public.heures;
create policy "heures lues par la sauvegarde" on public.heures for select to authenticated using (public.est_sauvegarde());

update public.profils set role = 'sauvegarde', nom = 'Sauvegarde (automatique)' where email = 'sauvegarde@mgds.fr';

select nom, email, role from public.profils where email = 'sauvegarde@mgds.fr';
