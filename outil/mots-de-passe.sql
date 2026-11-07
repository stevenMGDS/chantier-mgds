-- Mots de passe par compte, donnés par Steven (sans lien envoyé par e-mail).
-- Où : Supabase > SQL Editor > New query, coller ce fichier, puis Run.
-- Résultat : un tableau nom / e-mail / rôle / mot de passe. Notez-le ou exportez-le tout de suite :
-- les mots de passe ne sont enregistrés que chiffrés, on ne pourra plus les relire ensuite.
-- Chacun se connecte avec son e-mail et ce mot de passe, puis peut le changer dans l'appli
-- (bouton « Mot de passe » en bas à droite).
--
-- Par défaut, TOUS les comptes reçoivent un nouveau mot de passe.
-- Pour n'en changer que certains, mettez leurs e-mails dans la liste « seulement » ci-dessous
-- (ex. array['yannick@mgds.fr','marine@mgds.fr']). Laissez array[]::text[] pour tout le monde.

with reglage as (
  select array[]::text[] as seulement
),
comptes as (
  select u.id, u.email, p.nom, p.role,
         (select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', get_byte(r.b, i) % 31 + 1, 1), '' order by i)
            from generate_series(0, 9) i) as brut
  from auth.users u
  left join public.profils p on p.id = u.id
  cross join reglage
  cross join lateral (select extensions.gen_random_bytes(10) as b where u.id is not null) r
  where u.email is not null
    and (cardinality(reglage.seulement) = 0 or lower(u.email) = any (select lower(x) from unnest(reglage.seulement) x))
),
mdp as (
  select id, email, nom, role, substr(brut, 1, 5) || '-' || substr(brut, 6, 5) as mot_de_passe from comptes
),
maj as (
  update auth.users u
     set encrypted_password = extensions.crypt(m.mot_de_passe, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(u.email_confirmed_at, now()),
         updated_at = now()
    from mdp m
   where u.id = m.id
  returning u.id
)
select m.nom, m.email, m.role, m.mot_de_passe
  from mdp m join maj using (id)
 order by m.nom nulls last, m.email;
