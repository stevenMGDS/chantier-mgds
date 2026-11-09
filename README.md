# Chantiers MGDS

Suivi des chantiers MGDS, consultable sur téléphone, tablette et ordinateur.
Accès sur invitation uniquement ; les données sont dans une base Supabase protégée par connexion.

- **`MEMOIRE.md` : mémoire partagée des sessions Claude, à lire en premier** (copie de référence : Supabase, bucket outil, memoire/MEMOIRE.md)
- `index.html` : l'appli, modifiée directement dans le dépôt (l'ancien build.sh depuis l'appli claude.ai est supprimé)
- `outil/schema.sql` : structure de la base et droits (éditeurs / terrain / lecteurs)
- `outil/mots-de-passe.sql` : Steven donne un mot de passe à chaque compte (à lancer dans Supabase > SQL Editor ; tous les comptes ou une liste d'e-mails) ; plus de lien par e-mail. Chacun peut ensuite le changer avec le bouton « Mot de passe » en bas à droite de l'appli
- `outil/identifiants.sql` : connexion par identifiant (prénom, minuscules sans accent) en plus de l'e-mail : colonne profils.identifiant et fonction email_connexion appelée par l'écran de connexion
- `poseurs.html` : espace poseurs (planning, fiches, heures, photos chantier et consommables) ; vue Planning / Heures / Photos pour Marine
- `outil/releve_conso.py` : Claude relit les photos de consommables (sorties / retours au stock) et enregistre ce qu'il voit ; l'appli le reprend dans la fiche (fenêtre Consommables) et dans l'onglet Stock. Atelier : photos « Entrée en stock » (barres en trop, chutes réutilisables marquées réf. + longueur) et « Sortie » (chute reprise), sans chantier ni déboursé ; les barres neuves restent liées à leur chantier. Bouton « Bac vide » (double bac) : l'article passe « à commander » jusqu'à la prochaine livraison
- `outil/poseurs.sql` : tables planning, heures, photos et rôle « poseur »
- `outil/stock.sql` : stock de consommables, deux stocks distincts (pose / atelier) : articles, mouvements (inventaire, livraison, sortie, retour) et niveau calculé ; onglet Stock de l'appli. On peut y déposer des dossiers entiers (glisser-déposer), rangés dans documents/stock/pose ou stock/atelier
- `outil/prevision-conso.md` : règles pour anticiper les commandes de consommables (délais fournisseurs, silicone transparent en neuf, couleur en rénovation)
- `outil/seuils-depart-2026-11-07.json` : seuils de départ écrits le 07/11/2026 (25 % du comptage du 30/06, arrondi à l'inférieur) sur les seuls consommables : stock pose (silicones, mousses, étanchéité, vis, chevilles, cales, adhésifs, entretien, forets et lames) et « Consommables atelier ». Liste id → seuil, pour revenir en arrière si besoin
- `outil/stock_import.py` : import d'un inventaire Excel (ex. « Inventaire au 30.06.26 ») dans le stock. Dans l'autre sens, le bouton « Exporter l'Excel » de l'onglet Stock produit l'inventaire valorisé du jour (mêmes feuilles, entrées et sorties comprises), réimportable tel quel
- `outil/atelier.sql` : espace atelier (rôle « atelier » pour Christophe) : commandes de fabrication, commandes matière / accessoires / vitrages / volets, rétro-planning depuis la date de pose, charge par semaine ; l'ARC atelier validé est recopié dans « ARC et livraisons » de la fiche chantier ; onglet Atelier de l'appli. Réservations du stock atelier pour une commande (Christophe seul) : pas de double réservation ni de réservation au-delà du stock, alerte « manque » avant fabrication, fiche imprimable des éléments réservés triée par emplacement. « Besoins et stock » : Christophe colle la liste de la commande, l'appli retrouve dans le stock ce qu'on a déjà, le réserve d'un coup et donne ce qui reste à commander
- `outil/generateurs/` : scripts de Claude pour les fiches Réception de support (support_nicollin.py = modèle à partir de MANCOSU, apparences.py = cases visibles en consultation, ajout_etancheite.py = cases étanchéité base + par menuiserie)
- Chantier neuf : la fiche de préparation est reprise de la réception de support (Ce qu'on pose : applique / tunnel ; fixations et quantité estimée ; Attention à : support de la RS, appui / rejingot à créer avec hauteur et repères ; rubriques de rénovation retirées) ; quantités prévues modifiables
- Fiche métré : cotes hors tout facultatives (les cotes tableau restent obligatoires)
- Espace poseurs : onglet « Stock » (photos Sortie / Retour au stock, chantier du jour choisi d'office)
- Accès par poste : bureau (éditeurs) tout ; Stéphanie, Yannick (terrain) appli principale ; atelier (Christophe, Manu) Atelier + Stock, renvoyés de poseurs.html ; poseurs renvoyés vers poseurs.html
- Listes des chantiers et des commandes atelier : menu « Trier » (pose la plus proche par défaut, retards et alertes, ordre alphabétique), retenu sur chaque appareil
- `theme-mac.css` : habillage façon Mac (barre latérale, tuiles de compteurs, onglets en bas sur téléphone, mode sombre) ; pour revenir à l'ancien aspect, retirer la ligne <link … theme-mac.css> de index.html et poseurs.html
- `outil/reservations.sql` : seul Christophe réserve le stock atelier (case profils.reserve_stock) ; Manu, chef d'atelier (rôle « atelier », identifiant manu), fait les entrées / sorties de stock sans réserver
- `outil/sauvegarde.py` : sauvegarde hebdomadaire sur le Mac du bureau (tables en JSON/CSV, fichiers devis/fiches/photos, copie du site ; 12 semaines gardées)
- `outil/sauvegarde.sql` + `outil/installer-sauvegarde.command` : compte sauvegarde@mgds.fr en lecture seule (rôle « sauvegarde ») et installation de la sauvegarde du lundi 7 h 30 sur le Mac (LaunchAgent fr.mgds.sauvegarde)
- `outil/atelier_sync.py` : veille atelier : dossiers ATELIER des chantiers et dossier ATELIER (hors pose MGDS) du serveur -> commandes de l'onglet Atelier (deux étapes : liste sur le Mac, import dans l'environnement Supabase)
