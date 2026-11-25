-- Onglet Direction (Steven, 25/11/2026) : ouvert à Steven, Marine et Stéphanie ; fermé à tous les autres comptes.
-- À lancer une fois : Supabase > SQL Editor > New query > Run. Peut être relancé sans risque ; ne modifie aucune donnée.
create or replace function public.est_direction() returns boolean
language sql stable security definer set search_path = public as
$$ select lower(coalesce(auth.jwt()->>'email','')) = 's.gallais@mgds.fr'
       or auth.uid() in ('54652710-3291-4367-9233-b5df31966f13'::uuid,   -- Marine
                         '9ed183c3-5699-4142-bd5d-b27e521f2ff0'::uuid)   -- Stéphanie
$$;
drop policy if exists "direction reservee a Steven" on public.direction;
drop policy if exists "direction reservee" on public.direction;
create policy "direction reservee" on public.direction for all to authenticated
  using (public.est_direction()) with check (public.est_direction());
-- heures de tous (pose et atelier) pour les pages Heures et Rentabilité de l'onglet Direction
drop policy if exists "heures lues par la direction" on public.heures;
create policy "heures lues par la direction" on public.heures for select to authenticated using (public.est_direction());
