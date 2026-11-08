-- Réservations du stock atelier : seul Christophe réserve, sort ou retire une réservation (Steven, 06/11 et 08/11/2026).
-- Les autres comptes « atelier » (Manu, chef d'atelier) gardent l'onglet Atelier et les entrées / sorties de stock, sans réserver.
-- La case profils.reserve_stock dit qui peut réserver ; personne ne peut la changer soi-même (pas de droit de modification sur profils).
alter table public.profils add column if not exists reserve_stock boolean not null default false;
update public.profils set reserve_stock = true where email = 'atelier@mgds.fr';

create or replace function public.est_reservant() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profils where id = auth.uid() and role = 'atelier' and reserve_stock) $$;

drop policy if exists "réservations gérées" on public.stock_reservations;
create policy "réservations gérées" on public.stock_reservations for all to authenticated
  using (public.est_reservant()) with check (public.est_reservant());

select nom, role, identifiant, reserve_stock from public.profils where role = 'atelier';
