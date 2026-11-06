# Chantiers MGDS

Suivi des chantiers MGDS, consultable sur téléphone, tablette et ordinateur.
Accès sur invitation uniquement ; les données sont dans une base Supabase protégée par connexion.

- `index.html` : l'appli, modifiée directement dans le dépôt (l'ancien build.sh depuis l'appli claude.ai est supprimé)
- `outil/schema.sql` : structure de la base et droits (éditeurs / terrain / lecteurs)
- `poseurs.html` : espace poseurs (planning, fiches, heures, photos chantier et consommables) ; vue Planning / Heures / Photos pour Marine
- `outil/releve_conso.py` : Claude relit les photos de consommables (sorties / retours au stock) et enregistre ce qu'il voit ; l'appli le reprend dans la fiche (fenêtre Consommables) et dans l'onglet Stock
- `outil/poseurs.sql` : tables planning, heures, photos et rôle « poseur »
- `outil/stock.sql` : stock de consommables, deux stocks distincts (pose / atelier) : articles, mouvements (inventaire, livraison, sortie, retour) et niveau calculé ; onglet Stock de l'appli
- `outil/stock_import.py` : import d'un inventaire Excel (ex. « Inventaire au 30.06.26 ») dans le stock
- `outil/atelier.sql` : espace atelier (rôle « atelier » pour Christophe) : commandes de fabrication, commandes matière / accessoires / vitrages / volets, rétro-planning depuis la date de pose, charge par semaine ; l'ARC atelier validé est recopié dans « ARC et livraisons » de la fiche chantier ; onglet Atelier de l'appli
