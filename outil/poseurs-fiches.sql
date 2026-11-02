-- Chantiers MGDS : les poseurs remplissent les fiches de préparation et de réception de leurs chantiers
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque. (Suite de poseurs.sql)

-- fichier PDF rempli : rangé dans documents/poseurs/<id du poseur>/
drop policy if exists "fiches déposées par les poseurs" on storage.objects;
create policy "fiches déposées par les poseurs" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.est_poseur()
    and (storage.foldername(name))[1] = 'poseurs' and (storage.foldername(name))[2] = auth.uid()::text);

-- chantier : un poseur ne peut modifier que les chantiers où il est planifié…
drop policy if exists "fiches remplies par les poseurs" on public.chantiers;
create policy "fiches remplies par les poseurs" on public.chantiers for update to authenticated
  using (public.est_poseur() and public.poseur_sur(id)) with check (public.est_poseur() and public.poseur_sur(id));

-- … et seulement remplacer une fiche Préparation / Réception et cocher l'étape correspondante
create or replace function public.garde_poseur() returns trigger
language plpgsql security definer set search_path = public as
$$ declare autres_new jsonb; autres_old jsonb;
begin
  if auth.uid() is null or not public.est_poseur() then return new; end if;
  if (new.data - array['docs','steps']) is distinct from (old.data - array['docs','steps'])
    then raise exception 'modification non autorisée'; end if;
  if (coalesce(new.data->'steps','{}'::jsonb) - array['prepa','recep']) is distinct from (coalesce(old.data->'steps','{}'::jsonb) - array['prepa','recep'])
    then raise exception 'étape non autorisée'; end if;
  if jsonb_array_length(coalesce(new.data->'docs','[]'::jsonb)) <> jsonb_array_length(coalesce(old.data->'docs','[]'::jsonb))
    then raise exception 'ajout ou suppression de document non autorisé'; end if;
  select coalesce(jsonb_agg(d order by n), '[]'::jsonb) into autres_new
    from jsonb_array_elements(coalesce(new.data->'docs','[]'::jsonb)) with ordinality x(d, n) where d->>'type' not in ('Préparation','Réception');
  select coalesce(jsonb_agg(d order by n), '[]'::jsonb) into autres_old
    from jsonb_array_elements(coalesce(old.data->'docs','[]'::jsonb)) with ordinality x(d, n) where d->>'type' not in ('Préparation','Réception');
  if autres_new is distinct from autres_old then raise exception 'document non autorisé'; end if;
  return new;
end $$;
drop trigger if exists garde_poseur on public.chantiers;
create trigger garde_poseur before update on public.chantiers for each row execute function public.garde_poseur();
