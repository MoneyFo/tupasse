# tupasse

Calcule la note qu'il te faut au prochain examen pour valider ton semestre à l'université.

À l'arrivée, tu choisis ta licence dans un menu déroulant, puis ton semestre, et tu cliques sur **calculer**. La page suivante ne montre que ce semestre ; le bouton « changer de semestre » en haut ramène au choix.

- Les **ECTS servent de coefficients** (une matière à 5 ECTS compte 5 fois).
- Tu remplis les notes que tu as déjà. Ce qui reste à passer, tu le laisses vide.
- Le calcul se fait **par bloc** (DS, TS, LS, ES) : chaque bloc doit avoir 10 de moyenne.
  Le site affiche la moyenne de chaque bloc et la note à avoir **sur chaque épreuve restante** du bloc le plus serré.
- Bouton **« validée ? »** sur chaque matière : pour une matière déjà acquise (redoublement).
  Elle sort du calcul, sauf si tu indiques la note gardée.
- Chaque matière a **2 CC** (poids réglable, 50/50 par défaut) et **1 rattrapage**.
- Tant qu'il reste des CC à passer, le site donne la note à viser au(x) CC restant(s).
  Quand tous les CC sont notés et que le semestre n'est pas validé, il donne la note à viser au rattrapage
  (matières sous 10 cochées « je repasse » par défaut, modifiable).
- Trois règles de rattrapage au choix :
  - il remplace la moyenne des CC s'il est meilleur ;
  - il remplace le plus faible des 2 CC ;
  - on fait la moyenne des 3 notes (CC1, CC2, rattrapage).
- La maquette est modifiable : ajouter, renommer, supprimer des matières ou changer leurs ECTS.
- Les notes restent dans ton navigateur (localStorage), rien n'est envoyé nulle part.

Licences disponibles :
- **Licence Informatique** : maquette 2025-2026 pré-remplie (L1 à L3, S1 à S6) ;
- **Autre licence** : maquette vide, tu ajoutes tes matières et leurs ECTS.

Pour ajouter une licence pré-remplie, ajoute une entrée dans l'objet `LIC` de `script.js`.

## Lancer

Trois fichiers (`index.html`, `style.css`, `script.js`), sans dépendance à installer. Ouvre-le dans un navigateur, ou active GitHub Pages (Settings → Pages → branche `main`, dossier `/`).

## Formule

Note d'une matière = `poids CC1 × CC1 + poids CC2 × CC2`, puis la règle de rattrapage choisie.
Moyenne d'un bloc = `Σ (ECTS × note de la matière) / Σ ECTS`.

La note à viser est la plus petite note `x`, la même sur toutes les épreuves restantes, qui donne une moyenne ≥ objectif.
Pour les CC c'est direct : `x = (objectif × E − K) / U` (`E` total ECTS, `K` points déjà acquis, `U` poids des CC restants).
Pour le rattrapage, la règle « garde le meilleur » n'est pas linéaire, donc `x` est trouvé par dichotomie.
