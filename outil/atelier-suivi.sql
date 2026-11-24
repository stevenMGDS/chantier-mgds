-- Suivi de l'atelier (Steven, 24/11/2026) — à lancer une fois dans Supabase : SQL Editor > New query > Run.
-- Peut être relancé sans risque. Ne modifie et n'efface aucune heure ni aucun montant déjà saisi.
--
-- 1. Christophe (atelier avec reserve_stock = est_reservant) complète les heures d'atelier manquantes de tout le monde
--    (Manu, lui-même, les poseurs venus aider), même sur une commande livrée : seulement des lignes liées à une commande
--    atelier avec une tâche. Une ligne validée par Marine ne bouge plus.
-- 2. Christophe lit la rentabilité de l'atelier : prix de l'atelier et matière (direction/atl_<commande>), et peut saisir
--    le prix de l'atelier à la main (direction/atlv_<chantier>). Le reste de la table direction reste à Steven seul.
-- 3. Le bureau (Marine, Stéphanie, Yannick) voit la projection et les heures de l'atelier ; la rentabilité de l'atelier
--    est lue par Steven, Christophe, Marine et Stéphanie (pas Yannick, pas Manu) (Steven, 24/11/2026).
-- Manu (atelier sans reserve_stock) lit déjà toutes les heures d'atelier (heures-atelier.sql) : rien à changer pour lui.

-- qui lit la rentabilité de l'atelier : éditeurs (Steven, Marine), Christophe, Stéphanie
create or replace function public.est_renta_atelier() returns boolean
language sql stable security definer set search_path = public as
$$ select public.est_editeur() or public.est_reservant() or auth.uid() = '9ed183c3-5699-4142-bd5d-b27e521f2ff0'::uuid $$;

drop policy if exists "heures atelier lues par le bureau" on public.heures;
create policy "heures atelier lues par le bureau" on public.heures for select to authenticated
  using (atelier is not null and tache is not null and public.est_terrain());

create or replace function public.garde_heures() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if public.est_editeur() or auth.uid() is null then new.maj_le := now(); return new; end if;
  -- Christophe : heure d'atelier d'une autre personne (commande + tâche)
  if public.est_reservant() and new.atelier is not null and new.tache is not null and new.tache <> 'Autre tâche' then
    if tg_op = 'UPDATE' and old.valide_le is not null then raise exception 'heures déjà validées'; end if;
    new.poseur := coalesce(new.poseur, auth.uid());
    new.valide_le := null; new.valide_par := null; new.maj_le := now();
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.valide_le is not null then raise exception 'heures déjà validées'; end if;
    new.poseur := old.poseur;
  else
    new.poseur := auth.uid();
  end if;
  new.valide_le := null; new.valide_par := null; new.maj_le := now();
  return new;
end $$;

drop policy if exists "heures atelier saisies par Christophe" on public.heures;
create policy "heures atelier saisies par Christophe" on public.heures for insert to authenticated
  with check (public.est_reservant() and atelier is not null and tache is not null and tache <> 'Autre tâche');
drop policy if exists "heures atelier corrigées par Christophe" on public.heures;
create policy "heures atelier corrigées par Christophe" on public.heures for update to authenticated
  using (public.est_reservant() and atelier is not null and tache is not null and valide_le is null)
  with check (public.est_reservant() and atelier is not null and tache is not null and tache <> 'Autre tâche');
drop policy if exists "heures atelier retirées par Christophe" on public.heures;
create policy "heures atelier retirées par Christophe" on public.heures for delete to authenticated
  using (public.est_reservant() and atelier is not null and tache is not null and valide_le is null);

drop policy if exists "rentabilite atelier lue par Christophe" on public.direction;
drop policy if exists "rentabilite atelier lue" on public.direction;
create policy "rentabilite atelier lue" on public.direction for select to authenticated
  using (public.est_renta_atelier() and (id like 'atl\_%' or id like 'atlv\_%'));
drop policy if exists "prix atelier saisi par Christophe" on public.direction;
drop policy if exists "prix atelier saisi" on public.direction;
create policy "prix atelier saisi" on public.direction for insert to authenticated
  with check (public.est_renta_atelier() and id like 'atlv\_%');
drop policy if exists "prix atelier corrigé par Christophe" on public.direction;
drop policy if exists "prix atelier corrigé" on public.direction;
create policy "prix atelier corrigé" on public.direction for update to authenticated
  using (public.est_renta_atelier() and id like 'atlv\_%') with check (public.est_renta_atelier() and id like 'atlv\_%');
