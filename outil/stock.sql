-- Chantiers MGDS : stock de consommables
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé sans risque. Ne touche à aucune table existante.
--
-- Deux stocks distincts (Steven, 04/11/2026) : « pose » (consommables de pose) et « atelier » (production :
-- barres, accessoires de fabrication, quelques consommables). Chaque article appartient à l'un des deux.
-- stock_articles   : un article du dépôt (silicone gris alu, mousse PU, vis…) avec son coloris, son unité de comptage,
--                    son fournisseur et son seuil d'alerte.
-- stock_mouvements : tout ce qui fait bouger le stock. « inventaire » = quantité comptée (remet le compteur à cette valeur) ;
--                    « livraison » et « retour » ajoutent ; « sortie » enlève ; « correction » ajoute ou enlève (signée).
--                    Les sorties / retours relevés par Claude sur les photos portent le n° de la photo.
-- stock_niveaux    : vue calculée = dernier inventaire + mouvements suivants.

create table if not exists public.stock_articles (
  id bigint generated always as identity primary key,
  stock text not null default 'pose' check (stock in ('pose','atelier')),
  nom text not null,
  famille text not null default 'Divers',
  coloris text,
  unite text not null default 'unité',     -- ce qu'on compte au dépôt (carton, boîte, rouleau, cartouche…)
  detail text,                              -- unité utilisée sur chantier si différente (ex. cartouche)
  contenance numeric,                       -- combien de « detail » dans une « unite » (ex. 12 cartouches par carton)
  fournisseur text,
  ref text,                                 -- référence fabricant (profilés, accessoires atelier)
  seuil numeric,                            -- en dessous : à commander
  reassort numeric,                         -- quantité commandée d'habitude
  pu numeric,                               -- prix unitaire HT (déboursé), visible des éditeurs seulement dans l'appli
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

alter table public.stock_articles add column if not exists stock text not null default 'pose' check (stock in ('pose','atelier'));
create index if not exists stock_articles_stock on public.stock_articles (stock, famille);

create table if not exists public.stock_mouvements (
  id bigint generated always as identity primary key,
  article bigint not null references public.stock_articles(id) on delete cascade,
  type text not null check (type in ('inventaire','livraison','sortie','retour','correction')),
  qte numeric not null,
  chantier text references public.chantiers(id) on delete set null,
  photo bigint references public.photos(id) on delete set null,
  note text,
  le timestamptz not null default now(),
  par uuid default auth.uid()
);
create index if not exists stock_mvt_article on public.stock_mouvements (article, le);
create index if not exists stock_mvt_chantier on public.stock_mouvements (chantier);
create index if not exists stock_mvt_photo on public.stock_mouvements (photo);

create or replace function public.stock_article_maj() returns trigger language plpgsql as
$$ begin new.maj_le := now(); return new; end $$;
drop trigger if exists stock_article_maj on public.stock_articles;
create trigger stock_article_maj before update on public.stock_articles for each row execute function public.stock_article_maj();

create or replace view public.stock_niveaux with (security_invoker = true) as
with inv as (
  select distinct on (article) article, qte, le from public.stock_mouvements
  where type = 'inventaire' order by article, le desc, id desc
)
select a.id, inv.le as inventaire_le,
  coalesce(inv.qte, 0) + coalesce((
    select sum(case m.type when 'sortie' then -m.qte else m.qte end) from public.stock_mouvements m
    where m.article = a.id and m.type <> 'inventaire' and (inv.le is null or m.le > inv.le)), 0) as niveau
from public.stock_articles a left join inv on inv.article = a.id;

alter table public.stock_articles enable row level security;
alter table public.stock_mouvements enable row level security;

drop policy if exists "stock lu par les connectés" on public.stock_articles;
create policy "stock lu par les connectés" on public.stock_articles for select to authenticated using (true);
drop policy if exists "stock géré par les éditeurs" on public.stock_articles;
create policy "stock géré par les éditeurs" on public.stock_articles for all to authenticated
  using (public.est_editeur()) with check (public.est_editeur());

drop policy if exists "mouvements lus par les connectés" on public.stock_mouvements;
create policy "mouvements lus par les connectés" on public.stock_mouvements for select to authenticated using (true);
drop policy if exists "mouvements gérés par les éditeurs" on public.stock_mouvements;
create policy "mouvements gérés par les éditeurs" on public.stock_mouvements for all to authenticated
  using (public.est_editeur()) with check (public.est_editeur());

grant select on public.stock_niveaux to authenticated;
