-- Chantiers MGDS : espace atelier (suivi des commandes de fabrication, rétro-planning, ARC atelier)
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque.
--
-- Rôle « atelier » (Christophe Couton) : voit et gère l'onglet Atelier, rien d'autre (l'appli lui masque chantiers, planning, stock).
-- Éditeurs (Steven, Marine) : gèrent aussi l'atelier. Terrain (Yannick, Stéphanie) : consultent, et peuvent cocher
-- « Métré réalisé » et « ARC validé ». Lecteurs : consultent. Poseurs : n'y ont pas accès.
--
-- Une commande atelier = un document JSON (même principe que les chantiers) :
--   chantier (n° de devis MGDS, vide pour une revente), dest (mgds | annexe | revente), client, objet, devis,
--   heures (temps de production), besoin (date de besoin si pas de date de pose), cmds (matière, accessoires,
--   vitrages, volets / stores), steps, lignes de l'ARC, docs (bons de commande), calc (dates calculées par l'appli).
-- Quand l'ARC atelier est validé, il apparaît tout seul dans « ARC et livraisons » de la fiche chantier
-- (fournisseur « Atelier MGDS », semaine = fin de production prévue, « Livré » = production terminée).

-- ===== rôle =====
alter table public.profils drop constraint if exists profils_role_check;
alter table public.profils add constraint profils_role_check check (role in ('editeur','terrain','lecteur','poseur','atelier'));

create or replace function public.est_atelier() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profils where id = auth.uid() and role = 'atelier') $$;

-- ===== commandes atelier =====
create table if not exists public.atelier (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  maj_le timestamptz not null default now(),
  maj_par uuid references auth.users
);
-- même compteur de version que les chantiers : deux personnes ne s'écrasent pas
drop trigger if exists atelier_maj on public.atelier;
create trigger atelier_maj before update on public.atelier for each row execute function public.chantier_maj();

-- terrain : seulement les étapes « Métré réalisé » et « ARC validé » (et les dates recalculées)
create or replace function public.garde_atelier() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if auth.uid() is null or public.est_editeur() or public.est_atelier() then return new; end if;
  if public.est_terrain() then
    if (new.data - array['steps','calc']) is distinct from (old.data - array['steps','calc'])
      then raise exception 'modification non autorisée'; end if;
    if (coalesce(new.data->'steps','{}'::jsonb) - array['metre','arc']) is distinct from (coalesce(old.data->'steps','{}'::jsonb) - array['metre','arc'])
      then raise exception 'étape non autorisée'; end if;
    return new;
  end if;
  raise exception 'modification non autorisée';
end $$;
drop trigger if exists garde_atelier on public.atelier;
create trigger garde_atelier before update on public.atelier for each row execute function public.garde_atelier();

alter table public.atelier enable row level security;
drop policy if exists "atelier lu" on public.atelier;
create policy "atelier lu" on public.atelier for select to authenticated using (not public.est_poseur());
drop policy if exists "atelier créé" on public.atelier;
create policy "atelier créé" on public.atelier for insert to authenticated with check (public.est_editeur() or public.est_atelier());
drop policy if exists "atelier modifié" on public.atelier;
create policy "atelier modifié" on public.atelier for update to authenticated
  using (public.est_editeur() or public.est_atelier() or public.est_terrain())
  with check (public.est_editeur() or public.est_atelier() or public.est_terrain());
drop policy if exists "atelier supprimé" on public.atelier;
create policy "atelier supprimé" on public.atelier for delete to authenticated using (public.est_editeur() or public.est_atelier());

-- bons de commande, ARC : rangés dans documents/atelier/
drop policy if exists "docs atelier déposés" on storage.objects;
create policy "docs atelier déposés" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (public.est_atelier() or public.est_editeur()) and (storage.foldername(name))[1] = 'atelier');

-- ===== ARC atelier -> fiche chantier =====
-- garde_terrain (schema.sql) refuse toute écriture d'un non-éditeur sur un chantier : on la laisse passer
-- uniquement pendant la recopie de l'ARC atelier faite ci-dessous (réglage local à la transaction).
create or replace function public.garde_terrain() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if auth.uid() is null or public.est_editeur() then return new; end if;
  if current_setting('mgds.sync_atelier', true) = 'on' then return new; end if;
  if (new.data - array['docs','av','ap','steps']) is distinct from (old.data - array['docs','av','ap','steps'])
    then raise exception 'modification non autorisée'; end if;
  if (coalesce(new.data->'steps','{}'::jsonb) - array['metre','prepa','recep']) is distinct from (coalesce(old.data->'steps','{}'::jsonb) - array['metre','prepa','recep'])
    then raise exception 'étape non autorisée'; end if;
  if jsonb_array_length(coalesce(new.data->'docs','[]'::jsonb)) < jsonb_array_length(coalesce(old.data->'docs','[]'::jsonb))
    then raise exception 'suppression de document non autorisée'; end if;
  return new;
end $$;

-- place (arc non nul), met à jour ou retire (arc nul) la ligne ARC de la commande atelier « aid » dans le chantier « cid »,
-- puis recalcule les étapes ARC validé / Livraison prévue / Matériel livré comme le fait l'appli (arcSync)
create or replace function public.atelier_arc_pose(cid text, aid text, arc jsonb) returns void
language plpgsql security definer set search_path = public as
$$ declare d jsonb; arcs0 jsonb; arcs jsonb; old_arc jsonb; n int; nok int; nprev int; nliv int; mok text; mprev text; mliv text; lieux text[]; st jsonb;
begin
  select data into d from chantiers where id = cid for update;
  if not found then return; end if;
  arcs0 := case when jsonb_typeof(d->'arcs') = 'array' then d->'arcs' else '[]'::jsonb end;
  select e into old_arc from jsonb_array_elements(arcs0) e where e->>'aid' = aid limit 1;
  if arc is not null then
    arc := arc || jsonb_build_object('lieu', coalesce(nullif(old_arc->>'lieu',''), 'depot'));
    if old_arc is null then arcs := arcs0 || jsonb_build_array(arc);
    else select coalesce(jsonb_agg(case when e->>'aid' = aid then arc else e end order by o), '[]'::jsonb) into arcs
           from jsonb_array_elements(arcs0) with ordinality t(e, o); end if;
  else
    if old_arc is null then return; end if;
    select coalesce(jsonb_agg(e order by o), '[]'::jsonb) into arcs
      from jsonb_array_elements(arcs0) with ordinality t(e, o) where e->>'aid' is distinct from aid;
  end if;
  if arcs = arcs0 then return; end if;
  n := jsonb_array_length(arcs);
  select count(*) filter (where coalesce(e->'ok'->>'d','') <> ''), max(nullif(e->'ok'->>'d','')),
         count(*) filter (where coalesce(e->>'prev','') <> ''), max(nullif(e->>'prev','')),
         count(*) filter (where coalesce(e->'livre'->>'d','') <> ''), max(nullif(e->'livre'->>'d','')),
         array_agg(distinct e->>'lieu') filter (where coalesce(e->>'lieu','') <> '')
    into nok, mok, nprev, mprev, nliv, mliv, lieux
    from jsonb_array_elements(arcs) e;
  if n = 0 then
    -- plus aucun ARC : les étapes venaient de l'ARC atelier, on les décoche
    d := (d || jsonb_build_object('arcs', arcs,
      'steps', (case when jsonb_typeof(d->'steps') = 'object' then d->'steps' else '{}'::jsonb end)
               || '{"arc":null,"livprev":null,"livre":null}'::jsonb)) - 'livraison';
  else
    st := jsonb_build_object(
      'arc',     case when nok = n   then jsonb_build_object('d', mok,   'by', '') else 'null'::jsonb end,
      'livprev', case when nprev = n then jsonb_build_object('d', mprev, 'by', '') else 'null'::jsonb end,
      'livre',   case when nliv = n  then jsonb_build_object('d', mliv,  'by', '') else 'null'::jsonb end);
    d := d || jsonb_build_object('arcs', arcs,
      'livraison', case when coalesce(array_length(lieux, 1), 0) > 1 then 'mixte' else coalesce(lieux[1], '') end,
      'steps', (case when jsonb_typeof(d->'steps') = 'object' then d->'steps' else '{}'::jsonb end) || st);
  end if;
  perform set_config('mgds.sync_atelier', 'on', true);
  update chantiers set data = d where id = cid;
  perform set_config('mgds.sync_atelier', 'off', true);
end $$;
revoke execute on function public.atelier_arc_pose(text, text, jsonb) from public, anon, authenticated;

create or replace function public.atelier_vers_chantier() returns trigger
language plpgsql security definer set search_path = public as
$$ declare c_old text; c_new text; arc jsonb; s jsonb;
begin
  if tg_op in ('UPDATE','DELETE') then c_old := nullif(old.data->>'chantier', ''); end if;
  if tg_op in ('INSERT','UPDATE') then c_new := nullif(new.data->>'chantier', ''); end if;
  if c_old is not null and c_old is distinct from c_new then perform public.atelier_arc_pose(c_old, old.id, null); end if;
  if c_new is not null then
    s := coalesce(new.data->'steps', '{}'::jsonb);
    if coalesce(s->'arc'->>'d', '') <> '' then
      arc := jsonb_build_object('aid', new.id, 'four', 'Atelier MGDS',
        'ref', coalesce(nullif(new.data->>'arcRef', ''), new.id),
        'objet', coalesce(new.data->>'objet', ''),
        'prev', coalesce(new.data->'calc'->>'finSem', ''),
        'ok', jsonb_build_object('d', s->'arc'->>'d', 'by', ''),
        'livre', case when coalesce(s->'fin'->>'d', '') <> '' then jsonb_build_object('d', s->'fin'->>'d', 'by', '') else 'null'::jsonb end);
    end if;
    perform public.atelier_arc_pose(c_new, new.id, arc);
  end if;
  return null;
end $$;
drop trigger if exists atelier_vers_chantier on public.atelier;
create trigger atelier_vers_chantier after insert or update or delete on public.atelier for each row execute function public.atelier_vers_chantier();

-- temps réel : l'onglet Atelier se met à jour seul
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'atelier')
    then alter publication supabase_realtime add table public.atelier; end if;
end $$;

-- ===== stock : Christophe enregistre les entrées et sorties (pas d'inventaire, pas de réglage des articles ni des prix) =====
drop policy if exists "mouvements saisis par l'atelier" on public.stock_mouvements;
create policy "mouvements saisis par l'atelier" on public.stock_mouvements for insert to authenticated
  with check (public.est_atelier() and type in ('livraison','sortie','retour') and qte > 0 and par = auth.uid());

-- ===== compte de Christophe (invité le 06/11/2026) =====
update public.profils set role = 'atelier', nom = 'Christophe' where email = 'atelier@mgds.fr';
