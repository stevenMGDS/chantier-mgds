# Prévision des consommables de pose : règles

Objectif (Steven, 06/11/2026) : anticiper les commandes de consommables d'après les chantiers signés,
avec un stock pose en flux tendu. Pas encore construit dans l'appli : ce fichier garde les règles
données par Steven pour le jour où on le fera.

## Délais fournisseurs
- Couleurs courantes : 24 à 48 h.
- Couleurs exceptionnelles : 1 semaine, 2 semaines au plus.
- Conséquence : les couleurs courantes peuvent rester en flux tendu, avec juste de quoi couvrir 2 jours
  ouvrés. Les couleurs exceptionnelles se commandent seulement pour un chantier signé qui les demande,
  au plus tard 2 semaines avant la pose.

## Couleur du silicone selon le type de chantier
- **Neuf** (`type = "neuf"`) : **silicone transparent uniquement**, aucune couleur, sauf exception
  signalée par Steven, à noter sur le chantier.
- **Rénovation** (`type = "reno"`) : silicone extérieur dans la couleur de la menuiserie (RAL et finition
  pris dans le devis ou le métré). Le silicone intérieur est généralement blanc.

## Sources par chantier signé, pas encore posé
1. Métré fait : on prend le préconisé de la fiche de métré (`docs[].conso`), c'est le chiffre exact.
2. Métré pas fait : on estime avec les ratios × le nombre de menuiseries (lu dans le devis), dans la couleur
   du devis pour une rénovation, en transparent pour du neuf.
3. Les ratios viennent du consommé réel des chantiers terminés (photos sortie / retour, `outil/releve_conso.py`).
   Il en faut une quinzaine avant qu'ils soient fiables.

## État au 06/11/2026
24 chantiers signés : 12 en neuf, 12 en rénovation. 7 rénovations ont leur métré fait. Aucun chantier
neuf n'a encore de métré dans l'appli.
