# Mémoire partagée des sessions Claude — Chantiers MGDS

**À lire en entier au début de chaque session, et à mettre à jour à la fin de chaque série de modifications.**
Steven (gérant de MGDS, menuiserie) n'est pas développeur : lui répondre en français, simplement.
Plusieurs sessions Claude travaillent en parallèle sans se voir : cette mémoire est le seul fil commun.

- **Page à jour (la plus pratique) : « Mémoire application MGDS », https://claude.ai/artifact/VTDW6pygZPA97raYPibxJL** (doc Claude ; la lire avec l'outil Artifact ou les outils Claude Docs).
- Copie de référence : stockage Supabase, bucket `outil`, fichier `memoire/MEMOIRE.md`
  (lire : `curl -sS "https://azgvzgenfykvlkuwevty.supabase.co/storage/v1/object/outil/memoire/MEMOIRE.md" -H "apikey: x" -H "Authorization: Bearer x"`).
  Le fichier du même nom dans le code peut être plus ancien : en cas de doute, la copie Supabase fait foi.
- Le code de référence : bucket `outil`, dossier `depot/`, dernier fichier `chantier-mgds-*.bundle` (historique git complet).
- La sauvegarde hebdomadaire du Mac copie aussi ces fichiers sur le serveur de Steven.

## Règles pour ne plus s'écraser (incident du 09/11/2026)

Le 08 et le 09/11, trois sessions ont publié tour à tour sur Netlify depuis leur propre copie du code : chaque
publication a effacé le travail des autres (fiche Réception de support, temps atelier, accès par poste). Réparé
le 09/11 par une fusion à trois voies (commit « Fusion des travaux des autres sessions »). Désormais :

1. **Avant de modifier le code** : partir du dernier bundle de `outil/depot/`, ou à défaut de la version en ligne.
2. **Avant chaque publication** : comparer la version en ligne avec la dernière que vous avez publiée vous-même.
   Si elle a changé, fusionner (`git merge-file -p notre.html base.html enligne.html`) avant de publier.
   Liste des publications : `GET https://api.netlify.com/api/v1/sites/72a370ca-216f-42d6-9af6-905d2842708d/deploys`.
   Contenu d'un fichier publié : `GET https://api.netlify.com/api/v1/deploys/<id>/files/<chemin>` avec l'en-tête
   `Content-Type: application/vnd.bitballoon.v1.raw` (sans cet en-tête : seulement les métadonnées).
3. **Après chaque publication** : déposer le nouveau bundle dans `outil/depot/` (le plus récent fait foi), mettre à jour
   cette mémoire (section Journal), et envoyer le bundle à Steven.
4. Donner un titre clair à chaque publication (`?title=vNN-sujet`).

## Environnement

- Session « MGDS Supabase » : le proxy authentifie `azgvzgenfykvlkuwevty.supabase.co` (en-têtes factices
  `apikey: x` / `Authorization: Bearer x`, accès service) et `api.netlify.com` (`Authorization: Bearer x`).
- Pas de SQL possible depuis les sessions : écrire le SQL dans `outil/*.sql` et le donner à Steven, qui le colle dans
  Supabase > SQL Editor (marche à suivre : SQL Editor > New query > coller > Run).
- Publication : `npx netlify-cli deploy` échoue (« Project not found ») ; publier par l'API :
  `POST /api/v1/sites/72a370ca-216f-42d6-9af6-905d2842708d/deploys?title=…` avec un zip (`Content-Type: application/zip`).
  Dossier publié : index.html, poseurs.html, plan-stock.html, fiche-stock.html, guide-stock.html, theme-mac.css,
  manifest.json, manifest-poseurs.json, icon.svg, icon-180.png, icon-512.png, outil/shim.js (rien d'autre de outil/).
- `chantiers-mgds.netlify.app`, jsdelivr et cdnjs sont bloqués par le proxy : pour tester l'appli avec Playwright,
  servir le dossier en local, fournir les bibliothèques depuis npm (`npm pack`) et relayer Supabase par Node
  (`NODE_USE_ENV_PROXY=1`, en retirant les en-têtes origin / referer / user-agent, sinon Supabase refuse la clé).
- GitHub : compte stevenMGDS suspendu depuis le 07/11/2026. Ne pas cloner, ne rien pousser, ne pas créer de compte.
- Le compte `claude@mgds.fr` (rôle éditeur) ne sert qu'aux sessions Claude pour leurs essais dans le navigateur.
  Une session peut lui reposer un mot de passe (`PUT /auth/v1/admin/users/<id>`), mais cela casse les essais des
  autres sessions : préférer le compte `sauvegarde@mgds.fr` (lecture seule) quand c'est possible.
  Ne jamais écrire un mot de passe dans un fichier, un commit ou cette mémoire.

## Comptes et postes (09/11/2026)

| Personne | Identifiant | Rôle | Voit |
|---|---|---|---|
| Steven, Marine | steven, marine | editeur | tout (Direction : Steven seul) |
| Stéphanie (commerciale), Yannick (conduite de travaux) | stephanie, yannick | terrain | appli principale ; cochent métré / ARC atelier |
| Christophe (atelier) | christophe | atelier, reserve_stock = true | Atelier + Stock ; seul à réserver le stock atelier |
| Manu (chef d'atelier) | manu (manu.atelier@mgds.fr, pas une vraie boîte) | atelier, reserve_stock = false | Atelier + Stock, entrées / sorties |
| Allan, Jordi, Yanis, Youssef | allan, jordi, yanis (un seul n), youssef | poseur | espace poseurs seulement |
| Claude | claude | editeur | essais des sessions |
| Sauvegarde | sauvegarde@mgds.fr | sauvegarde (après outil/sauvegarde.sql) | lecture seule |

Connexion : identifiant = prénom en minuscules sans accent (colonne profils.identifiant, fonction email_connexion), ou e-mail.
Mots de passe provisoires posés le 07/11 (format xxxxx-xxxxx) ; chacun peut le changer (bouton « Mot de passe »).
Les poseurs sont renvoyés de index.html vers poseurs.html ; tous les autres sont renvoyés de poseurs.html vers
index.html (sauf poseurs.html?embed=1, le planning intégré à l'onglet Planning).

## Fonctionnement à connaître

- Fiches remplissables (Métré, Préparation, Réception, Support) : PDF à champs ; l'étape se coche toute seule quand
  toutes les cases obligatoires sont remplies (`rempli.reste === 0`). Cotes hors tout facultatives depuis le 09/11.
- Les fiches métré sont des PDF à nombre de lignes fixe (4 en page 1, 8 par page suivante). L'outil qui les fabriquait
  n'est pas dans le code (il tournait ailleurs) : proposé à Steven de le refaire (nombre de lignes = devis).
- Messages à l'équipe dans l'appli : `chantiers.data.controles` (liste de {texte, niveau: "info" | "alerte"}),
  affichés dans « Points relevés par Claude » de la fiche chantier. Steven veut une alerte quand un dossier est trop
  incomplet pour remplir une fiche correcte.
- Devis scannés : pas de texte ; les lire en image (pypdfium2 → PNG) page par page.
- Tri des listes chantiers et atelier : pose la plus proche (défaut), retards et alertes, alphabétique.
- Seuil de stock : article « à commander » quand niveau ≤ seuil.

## Sauvegardes (deux systèmes complémentaires)

- **Mac du bureau** (Claude « Note de reprise », 09/11) : `outil/sauvegarde.py`, installé par
  `outil/installer-sauvegarde.command` ; chaque lundi 7 h 30 vers le serveur (dossier « Appli chantiers/Sauvegardes ») :
  tables JSON + CSV, tous les fichiers (devis, fiches, photos), copie du site ; 12 semaines gardées.
  À faire par Steven : coller outil/sauvegarde.sql, lancer l'installateur sur le Mac (mot de passe donné en direct).
- **Cloud** (Claude « Sauvegarde chantier », 09/11) : tâche planifiée chaque lundi 7 h 13, zip daté de la base dans le
  bucket Supabase `sauvegardes` (12 gardés), script `sauvegardes/outil/sauvegarde_cloud.py`. Ne copie pas les fichiers.
- Le code (bundle) : envoyé à Steven après chaque série de modifications + déposé dans `outil/depot/`.

## En cours / à faire (09/11/2026)

- **Naudet (D260901915)** : fiche métré complétée d'après le devis scanné (12 lignes) ; manquent 2 repères (porte
  d'entrée Pirnar, volet chambre 3 arrière) : proposé d'ajouter une page de 2 lignes, en attente de l'accord de Steven.
  4 alertes posées dans la fiche (repères, porte, cornières 7 vs 4, grilles de ventilation).
- **9 devis encore « à traiter »** (fiches non pré-remplies) : Delaporte, GTM La Baule, Godot, Vollet, LSDJ,
  Ateliers Quelle, Weith, Belouet, Foyer les Belettes. Steven a validé de les faire comme Naudet, avec une alerte dans
  l'appli quand un dossier est trop incomplet.
- **Seuils de stock** : silicone blanc et translucide = 2 cartons (fait le 09/11). Compribande : 2 cartons de 3-7
  (20 et 15 interchangeables, une seule alerte) et 2 cartons de 5-14 — attend le nombre de rouleaux par carton.
  Vis : seuil selon la rotation réelle, il faut l'historique des achats (Steven doit déposer factures ou export
  fournisseur dans Stock > Dossiers) ; 1 boîte pour les références peu utilisées.
- MANCOSU : coupes Technal à ajouter en annexe de la fiche Support (attend les PDF).
- En suspens (proposer, ne rien lancer sans accord) : vue 4 du tableau de bord du stock (artifact
  5qrssh7owea1i9cHiTvifN), emplacements du stock pose d'après les photos des allées, curseur de l'écran de connexion
  après Annuler / Enregistrer.

## Journal (le plus récent en haut)

- 09/11 après-midi (Note de reprise) : fusion des travaux écrasés (Réception de support du 08/11, temps atelier du
  09/11) ; espace poseurs réservé aux poseurs ; création de cette mémoire.
- 09/11 (Note de reprise) : accès par poste ; onglet Stock (photos) pour les poseurs ; cotes hors tout facultatives ;
  Naudet ; compte et script de sauvegarde Mac ; seuils silicones.
- 09/11 matin (Suivi atelier et commandes) : temps atelier Christophe / Manu (+20 %), métré dans la fiche atelier,
  pièces validées du serveur ; bundle dans outil/depot.
- 09/11 matin (Sauvegarde chantier) : sauvegarde cloud du lundi 7 h 13.
- 08/11 (Note de reprise) : habillage façon Mac (theme-mac.css), tri des listes, réservations Christophe seul, Manu.
- 08/11 (Correction feuille de métré) : fiche Réception de support (neuf), MANCOSU.
- 07/11 (Note de reprise) : reprise depuis le bundle v4, identifiants par prénom, mots de passe provisoires, v4 publiée.
