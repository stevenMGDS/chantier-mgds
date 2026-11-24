-- ===== Yannick passe les commandes et suit les ARC (Steven, 24/11/2026) =====
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque.
-- Le profil terrain (Yannick, Stéphanie) peut maintenant, en plus de ce qu'il faisait déjà :
--   - cocher les étapes « Commande saisie », « Commande validée », « ARC validé », « Livraison prévue », « Matériel livré » ;
--   - modifier les lignes d'ARC (Validé, « Pas d'ARC » pour Keller, semaine de livraison, lieu, Livré) et le lieu de livraison.
-- Toujours interdit au terrain : supprimer un document, toucher aux prix, aux autres étapes ou aux autres champs.
create or replace function public.garde_terrain() returns trigger
language plpgsql security definer set search_path = public as
$$ declare libres text[] := array['docs','av','ap','steps','type','typeChange','delai','jp','sansMetre','arcs','livraison'];
        etapes text[] := array['metre','prepa','recep','rdv','cmd','cmdok','arc','livprev','livre'];
begin
  if auth.uid() is null or public.est_editeur() then return new; end if;
  if (new.data - libres) is distinct from (old.data - libres)
    then raise exception 'modification non autorisée'; end if;
  if (coalesce(new.data->'steps','{}'::jsonb) - etapes) is distinct from (coalesce(old.data->'steps','{}'::jsonb) - etapes)
    then raise exception 'étape non autorisée'; end if;
  if jsonb_array_length(coalesce(new.data->'docs','[]'::jsonb)) < jsonb_array_length(coalesce(old.data->'docs','[]'::jsonb))
    then raise exception 'suppression de document non autorisée'; end if;
  return new;
end $$;
