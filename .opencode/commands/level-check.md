---
description: Vérifie la cohérence de toutes les salles (bugLines, 3 indices, 3e = réponse)
agent: release-verifier
---

Vérifie la cohérence de **toutes** les salles de `src/game/levels.ts` sans modifier aucun fichier.

Pour chaque niveau, contrôle et rapporte :

- `id` unique et `index` consécutif depuis 0 ;
- `code.length > 5` et `bugLines` non vide, entièrement dans `[1, code.length]` ;
- exactement 3 `hints`, le 3e contenant la chaîne `RÉPONSE` ;
- présence de `explanation`, `fix`, `basePoints` positifs ;
- aucun chevauchement de `bugLines` d'un niveau à l'autre n'a de sens ici : concentre-toi sur la validité.

Pour t'aider, tu peux t'appuyer sur l'outil MCP `level-guard` (`check_levels`) s'il est disponible,
sinon sur une simple lecture du fichier. Termine par un tableau récapitulatif et un verdict **PASS**/**FAIL**.
