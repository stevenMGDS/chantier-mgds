# Chantiers MGDS

Suivi des chantiers MGDS, consultable sur téléphone, tablette et ordinateur.
Accès sur invitation uniquement ; les données sont dans une base Supabase protégée par connexion.

- `index.html` : l'appli (fabriquée par `outil/build.sh`)
- `outil/schema.sql` : structure de la base et droits (éditeurs / terrain / lecteurs)
- `poseurs.html` : espace poseurs (planning, fiches, heures, photos chantier et consommables) ; vue Planning / Heures / Photos pour Marine
- `outil/releve_conso.py` : Claude relit les photos de consommables (sorties / retours au stock) et enregistre ce qu'il voit ; l'appli le reprend dans la fiche (fenêtre Consommables) et dans l'onglet Stock
- `outil/poseurs.sql` : tables planning, heures, photos et rôle « poseur »
