-- Connexion par identifiant (prénom) en plus de l'e-mail.
-- L'identifiant est stocké dans profils.identifiant (minuscules, sans accent, unique) ;
-- la fonction email_connexion le traduit en e-mail pour l'écran de connexion (rien d'autre n'est visible sans connexion).
alter table public.profils add column if not exists identifiant text;
create unique index if not exists profils_identifiant_key on public.profils (identifiant);

create or replace function public.email_connexion(ident text) returns text
language sql stable security definer set search_path = public, auth as $$
  select u.email from auth.users u join public.profils p on p.id = u.id
   where p.identifiant = lower(trim(ident)) limit 1
$$;
revoke all on function public.email_connexion(text) from public;
grant execute on function public.email_connexion(text) to anon, authenticated;
