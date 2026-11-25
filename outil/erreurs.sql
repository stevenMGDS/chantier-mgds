-- Erreurs de l'appli (Steven, 25/11/2026 : Yannick voit une page blanche en ouvrant un chantier).
-- Quand une fiche ne peut pas s'afficher, l'appli note la cause ici (reglages/erreurs_appli, 30 dernières), pour que
-- Claude la lise et corrige. Ni prix, ni donnée de chantier : seulement le message d'erreur, la fiche et le navigateur.
-- À lancer une fois dans Supabase : SQL Editor > New query > Run. Peut être relancé sans risque.
create or replace function public.note_erreur(texte text) returns void
language plpgsql security definer set search_path = public as
$$ declare l jsonb;
begin
  if auth.uid() is null then return; end if;
  select coalesce(data->'liste', '[]'::jsonb) into l from reglages where id = 'erreurs_appli';
  l := coalesce(l, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('le', now(), 'qui', auth.uid(), 'texte', left(texte, 1500)));
  if jsonb_array_length(l) > 30 then
    l := (select jsonb_agg(e order by o) from jsonb_array_elements(l) with ordinality t(e, o) where o > jsonb_array_length(l) - 30);
  end if;
  insert into reglages (id, data, maj_le) values ('erreurs_appli', jsonb_build_object('liste', l), now())
    on conflict (id) do update set data = excluded.data, maj_le = now();
end $$;
revoke all on function public.note_erreur(text) from public, anon;
grant execute on function public.note_erreur(text) to authenticated;
