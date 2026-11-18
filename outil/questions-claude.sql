-- Questions de Claude (Steven, 18/11/2026) : quand une photo de stock est ambiguë, Claude enregistre ce qui est sûr
-- et pose une question avec 2 ou 3 réponses proposées. Christophe ou Manu répond dans l'onglet Stock (bandeau
-- « Questions de Claude »). Au passage suivant, Claude lit la réponse et fait les mouvements de stock correspondants
-- (outil/releve_conso.py : question, questions, applique, classe). Une question sans réponse ne déclenche rien.
-- À coller dans Supabase > SQL Editor > New query > Run. Se relance sans risque.

create table if not exists public.questions_claude (
  id           bigint generated always as identity primary key,
  cree_le      timestamptz not null default now(),
  pour         text not null default 'atelier' check (pour in ('atelier', 'pose', 'bureau')),
  photo        bigint references public.photos(id) on delete set null,
  chantier     text,
  question     text not null,
  detail       text,
  choix        jsonb not null default '[]'::jsonb,   -- [{"t":"Oui, c'est elle", ...}] : l'appli n'affiche que t
  libre        boolean not null default true,         -- réponse « Autre » en texte libre permise
  statut       text not null default 'ouverte' check (statut in ('ouverte', 'repondue', 'appliquee', 'annulee')),
  reponse      int,                                   -- n° du choix (0 = le premier), -1 = « Autre » (texte libre)
  reponse_txt  text,
  repondu_par  uuid references public.profils(id) on delete set null,
  repondu_le   timestamptz,
  suite        text,                                  -- ce que Claude a fait de la réponse
  applique_le  timestamptz
);
create index if not exists questions_claude_statut on public.questions_claude (statut);

alter table public.questions_claude enable row level security;

-- qui voit une question : les éditeurs toutes ; l'atelier celles « atelier » ; les poseurs celles « pose » ; le terrain celles « bureau »
create or replace function public.peut_repondre_question(p_pour text) returns boolean
language sql stable security definer set search_path = public as
$$ select public.est_editeur()
       or (p_pour = 'atelier' and public.est_atelier())
       or (p_pour = 'pose' and public.est_poseur())
       or (p_pour = 'bureau' and public.est_terrain()) $$;

drop policy if exists "questions lues" on public.questions_claude;
create policy "questions lues" on public.questions_claude for select to authenticated
  using (public.peut_repondre_question(pour));
-- pas de droit d'écriture direct : on répond par la fonction ci-dessous (Claude écrit avec l'accès service)

create or replace function public.repondre_question(p_id bigint, p_reponse int, p_txt text default null) returns void
language plpgsql security definer set search_path = public as
$$
declare q public.questions_claude;
begin
  select * into q from public.questions_claude where id = p_id for update;
  if not found then raise exception 'question introuvable'; end if;
  if not public.peut_repondre_question(q.pour) then raise exception 'vous ne pouvez pas répondre à cette question'; end if;
  if q.statut not in ('ouverte', 'repondue') then raise exception 'Claude a déjà traité cette réponse'; end if;
  if p_reponse is null or p_reponse < -1 or p_reponse >= jsonb_array_length(q.choix) then raise exception 'réponse inconnue'; end if;
  if p_reponse = -1 and (not q.libre or coalesce(trim(p_txt), '') = '') then raise exception 'écrivez votre réponse'; end if;
  update public.questions_claude
     set reponse = p_reponse, reponse_txt = nullif(trim(coalesce(p_txt, '')), ''),
         repondu_par = auth.uid(), repondu_le = now(), statut = 'repondue'
   where id = p_id;
end $$;
revoke all on function public.repondre_question(bigint, int, text) from public, anon;
grant execute on function public.repondre_question(bigint, int, text) to authenticated;
