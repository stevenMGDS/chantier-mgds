-- Planning prévu (v21, 10/11/2026) : Yannick et Stéphanie (profil terrain) peuvent saisir le bloc « Planning prévu »
-- d'une fiche chantier (clé prevu). Seule la liste des clés autorisées change : 'prevu' est ajouté.
-- Les poseurs restent bloqués par garde_poseur. À coller dans Supabase > SQL Editor > New query > Run.
create or replace function public.garde_terrain() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if auth.uid() is null or public.est_editeur() then return new; end if;
  if current_setting('mgds.sync_atelier', true) = 'on' then return new; end if;
  if (new.data - array['docs','av','ap','steps','prevu']) is distinct from (old.data - array['docs','av','ap','steps','prevu'])
    then raise exception 'modification non autorisée'; end if;
  if (coalesce(new.data->'steps','{}'::jsonb) - array['metre','prepa','recep']) is distinct from (coalesce(old.data->'steps','{}'::jsonb) - array['metre','prepa','recep'])
    then raise exception 'étape non autorisée'; end if;
  if jsonb_array_length(coalesce(new.data->'docs','[]'::jsonb)) < jsonb_array_length(coalesce(old.data->'docs','[]'::jsonb))
    then raise exception 'suppression de document non autorisée'; end if;
  return new;
end $$;
