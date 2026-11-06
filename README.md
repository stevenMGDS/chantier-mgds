# Chantiers MGDS

Suivi des chantiers MGDS, consultable sur téléphone, tablette et ordinateur.
Accès sur invitation uniquement ; les données sont dans une base Supabase protégée par connexion.

- `index.html` : l'appli, modifiée directement dans le dépôt (l'ancien build.sh depuis l'appli claude.ai est supprimé)
- `outil/schema.sql` : structure de la base et droits (éditeurs / terrain / lecteurs)
- `poseurs.html` : espace poseurs (planning, fiches, heures, photos chantier et consommables) ; vue Planning / Heures / Photos pour Marine
- `outil/releve_conso.py` : Claude relit les photos de consommables (sorties / retours au stock) et enregistre ce qu'il voit ; l'appli le reprend dans la fiche (fenêtre Consommables) et dans l'onglet Stock. Atelier : photos « Entrée en stock » (barres en trop, chutes réutilisables marquées réf. + longueur) et « Sortie » (chute reprise), sans chantier ni déboursé ; les barres neuves restent liées à leur chantier. Bouton « Bac vide » (double bac) : l'article passe « à commander » jusqu'à la prochaine livraison
- `outil/poseurs.sql` : tables planning, heures, photos et rôle « poseur »
- `outil/stock.sql` : stock de consommables, deux stocks distincts (pose / atelier) : articles, mouvements (inventaire, livraison, sortie, retour) et niveau calculé ; onglet Stock de l'appli. On peut y déposer des dossiers entiers (glisser-déposer), rangés dans documents/stock/pose ou stock/atelier
- `outil/prevision-conso.md` : règles pour anticiper les commandes de consommables (délais fournisseurs, silicone transparent en neuf, couleur en rénovation)
- `outil/stock_import.py` : import d'un inventaire Excel (ex. « Inventaire au 30.06.26 ») dans le stock. Dans l'autre sens, le bouton « Exporter l'Excel » de l'onglet Stock produit l'inventaire valorisé du jour (mêmes feuilles, entrées et sorties comprises), réimportable tel quel
- `outil/atelier.sql` : espace atelier (rôle « atelier » pour Christophe) : commandes de fabrication, commandes matière / accessoires / vitrages / volets, rétro-planning depuis la date de pose, charge par semaine ; l'ARC atelier validé est recopié dans « ARC et livraisons » de la fiche chantier ; onglet Atelier de l'appli. Réservations du stock atelier pour une commande (Christophe seul) : pas de double réservation ni de réservation au-delà du stock, alerte « manque » avant fabrication, fiche imprimable des éléments réservés triée par emplacement. « Besoins et stock » : Christophe colle la liste de la commande, l'appli retrouve dans le stock ce qu'on a déjà, le réserve d'un coup et donne ce qui reste à commander
- `outil/atelier_sync.py` : veille atelier : dossiers ATELIER des chantiers et dossier ATELIER (hors pose MGDS) du serveur -> commandes de l'onglet Atelier (deux étapes : liste sur le Mac, import dans l'environnement Supabase)
