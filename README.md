# tupasse

Calcule la note qu'il te faut au prochain examen pour valider ton semestre à l'université.

- Les **ECTS servent de coefficients** (une matière à 5 ECTS compte 5 fois).
- Tu remplis les notes que tu as déjà. Ce qui reste à passer, tu le laisses vide.
- Le site calcule la note à avoir **sur chaque épreuve restante** pour atteindre 10 (ou 12, 14, 16 pour une mention).
- Deux modes de calcul :
  - **un seul bloc** : tout le semestre est compensé ensemble (cas de la licence informatique) ;
  - **chaque bloc séparément** : DS, TS, LS et ES doivent chacun atteindre l'objectif.
- Chaque matière peut avoir un contrôle continu (CC) avec son pourcentage, en plus de l'examen.
- La maquette est modifiable : ajouter, renommer, supprimer des matières ou changer leurs ECTS.
- Les notes restent dans ton navigateur (localStorage), rien n'est envoyé nulle part.

Maquette fournie par défaut : Licence Informatique 2025-2026 (L1 à L3, S1 à S6).

## Lancer

C'est un seul fichier, `index.html`, sans dépendance à installer. Ouvre-le dans un navigateur, ou active GitHub Pages (Settings → Pages → branche `main`, dossier `/`).

## Formule

Pour un bloc, avec `E` le total des ECTS, `K` la somme des notes déjà obtenues pondérées (ECTS × poids de l'épreuve) et `U` le poids des épreuves restantes :

```
note à viser = (objectif × E − K) / U
```
