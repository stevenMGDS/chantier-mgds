-- ===== Réunion du 20/11/2026 =====
-- 1) Stéphanie et Yannick (profil « terrain ») : type neuf / rénovation, « pas de métré », date du RDV métré,
--    semaine de pose prévue et durée (en plus des fiches et des tâches).
create or replace function public.garde_terrain() returns trigger
language plpgsql security definer set search_path = public as
$$ declare libres text[] := array['docs','av','ap','steps','type','typeChange','delai','jp','sansMetre'];
begin
  if auth.uid() is null or public.est_editeur() then return new; end if;
  if (new.data - libres) is distinct from (old.data - libres)
    then raise exception 'modification non autorisée'; end if;
  if (coalesce(new.data->'steps','{}'::jsonb) - array['metre','prepa','recep','rdv']) is distinct from (coalesce(old.data->'steps','{}'::jsonb) - array['metre','prepa','recep','rdv'])
    then raise exception 'étape non autorisée'; end if;
  if jsonb_array_length(coalesce(new.data->'docs','[]'::jsonb)) < jsonb_array_length(coalesce(old.data->'docs','[]'::jsonb))
    then raise exception 'suppression de document non autorisée'; end if;
  return new;
end $$;

-- 2) Photos du stock pour un chantier absent de la liste (SAV ancien, autre) : nom écrit à la main
alter table public.photos add column if not exists chantier_libre text;
alter table public.photos drop constraint if exists photos_chantier_requis;
alter table public.photos add constraint photos_chantier_requis
  check (chantier is not null or chantier_libre is not null or categorie in ('atl_entree','atl_sortie','conso_entree','commande'));
drop policy if exists "photos lues" on public.photos;
create policy "photos lues" on public.photos for select to authenticated
  using (not public.est_poseur() or public.poseur_sur(chantier) or poseur = auth.uid());
drop policy if exists "photos déposées" on public.photos;
create policy "photos déposées" on public.photos for insert to authenticated
  with check (poseur = auth.uid() and (not public.est_poseur() or public.poseur_sur(chantier) or (chantier is null and chantier_libre is not null)));
drop policy if exists "photos fichiers lus" on storage.objects;
create policy "photos fichiers lus" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (not public.est_poseur() or public.poseur_sur((storage.foldername(name))[2]) or (storage.foldername(name))[1] = auth.uid()::text));

-- 3) Heures : retard, absence, heures supplémentaires
alter table public.heures add column if not exists motif text;
alter table public.heures drop constraint if exists heures_motif_check;
alter table public.heures add constraint heures_motif_check check (motif is null or motif in ('retard','absence','heures_sup'));
alter table public.heures add column if not exists motif_detail text;
