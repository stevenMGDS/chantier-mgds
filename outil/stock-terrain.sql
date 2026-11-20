-- ===== Stock : Yannick et Stéphanie (profil « terrain ») enregistrent ce qui entre et sort (Steven, 20/11/2026) =====
-- Comme Christophe : livraison, sortie, retour (pas d'inventaire ni de prix). Ils peuvent aussi créer un article
-- qui n'existe pas encore (sans prix ; le bureau complète ensuite les réglages).
drop policy if exists "mouvements saisis par le terrain" on public.stock_mouvements;
create policy "mouvements saisis par le terrain" on public.stock_mouvements for insert to authenticated
  with check (public.est_terrain() and type in ('livraison','sortie','retour') and qte > 0 and par = auth.uid());
drop policy if exists "articles créés par le terrain" on public.stock_articles;
create policy "articles créés par le terrain" on public.stock_articles for insert to authenticated
  with check (public.est_terrain() and pu is null);

-- ===== Photos : entrée en stock (livraison reçue au dépôt) et commande passée, chantier facultatif =====
alter table public.photos drop constraint if exists photos_categorie_check;
alter table public.photos add constraint photos_categorie_check
  check (categorie in ('avant','fin','conso_sortie','conso_retour','conso_entree','commande','autre','atl_entree','atl_sortie'));
alter table public.photos drop constraint if exists photos_chantier_requis;
alter table public.photos add constraint photos_chantier_requis
  check (chantier is not null or categorie in ('atl_entree','atl_sortie','conso_entree','commande'));
