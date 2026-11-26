# tupasse

https://moneyfo.github.io/tupasse/

Choisis ta licence, puis ton semestre.

- Les **ECTS servent de coefficients** (une matière à 5 ECTS compte 5 fois).
- Tu remplis les notes que tu as déjà. Ce qui reste à passer, tu le laisses vide.
- Le calcul se fait **par bloc** (DS, TS, LS, ES) : chaque bloc doit avoir 10 de moyenne.
  Le site affiche la moyenne de chaque bloc et la note à avoir **sur chaque épreuve restante** du bloc le plus serré.
- Bouton **« validée ? »** sur chaque matière : pour une matière déjà acquise (redoublement).
  Elle sort du calcul : sa note ne compte pas.
- Chaque matière a **1 à 6 CC** (2 par défaut, qui comptent pareil sauf si tu changes leurs pourcentages avec le bouton « % », ex. 60 / 40 ou 25 / 65 / 10) et **1 rattrapage**. Le nombre se règle par matière (menu « épreuves », « 1 note » pour un stage ou un examen unique) ou pour tout le semestre (règles de calcul).
- Tant qu'il reste des CC à passer, le site donne la note à viser au(x) CC restant(s).
  Quand tous les CC sont notés et que le semestre n'est pas validé, il donne la note à viser au rattrapage
  (bouton « rattrapage ? » sur chaque matière ; celles sous 10 sont cochées par défaut).
- Trois règles de rattrapage au choix :
  - il remplace la moyenne des CC s'il est meilleur ;
  - il remplace le CC le plus faible ;
  - on fait la moyenne des CC et du rattrapage.
- **Compensation annuelle** (option) : chaque bloc est calculé sur les deux semestres de l'année (S1 + S2, S3 + S4, S5 + S6).
- **Matières à choix** (activité d'ouverture, option, LVE…) : un menu sous la matière pour indiquer ce que tu as pris.
- **Sauvegarder / restaurer** : un code à copier pour retrouver ses notes sur un autre appareil.
- **Une erreur dans la maquette ?** ouvre une issue GitHub pré-remplie avec la licence et le semestre.
- Thème auto / clair / sombre (bouton dans le pied de page).
- La maquette est modifiable : ajouter, renommer, supprimer des matières ou changer leurs ECTS.
- Les notes restent dans ton navigateur (localStorage), rien n'est envoyé nulle part.

Licences disponibles : 22 licences et parcours tirés des 18 maquettes officielles de licence UPF 2024-2028
« Autre licence » avec une maquette vide à remplir.

Les données sont dans `licences.js`, généré à partir des PDF.

Choix faits pour coller au calcul par bloc :
- une licence par parcours quand les semestres diffèrent (Droit général / Excellence, Économie-gestion MCI / CCA,
  Sciences de la vie Biologie / Chimie / Environnement avec la majeure de S4 correspondante) ;
- LAS S2 : le bloc « Santé 2 » (15 ECTS, UE selon la filière) est une seule ligne ;
- licence pro ERME : chaque UE est un bloc ;
- LLCER Anglais : la maquette donne 28 et 24 ECTS en L3 ; on a ajouté la LVE (2) en S5 et le stage (6) en S6 pour arriver à 30.

## Formule

Note d'une matière = `(CC1 + CC2) / 2`, puis la règle de rattrapage choisie.
Moyenne d'un bloc = `Σ (ECTS × note de la matière) / Σ ECTS`.

La note à viser est la plus petite note `x`, la même sur toutes les épreuves restantes, qui donne une moyenne ≥ objectif.
Pour les CC c'est direct : `x = (objectif × E − K) / U` (`E` total ECTS, `K` points déjà acquis, `U` poids des CC restants).
Pour le rattrapage, la règle « garde le meilleur » n'est pas linéaire, donc `x` est trouvé par dichotomie.
