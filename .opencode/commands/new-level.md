---
description: Ajoute une nouvelle salle (contrat Solidity piégé) avec ses 3 indices et ses tests
agent: game-engineer
---

Ajoute une nouvelle salle à **Solidity Escape 3D**.

Délègue la conception du contrat à l'agent `solidity-auditor` : il édite uniquement
`src/game/levels.ts`. Puis fais ajouter les tests d'invariants par `test-engineer`.

Contraintes à respecter impérativement (voir `AGENTS.md`) :

- Le nouveau `Level` a un `id` unique, un `index` égal à la longueur actuelle de `LEVELS`,
  un `code` de plus de 5 lignes, au moins une ligne dans `bugLines` (toutes dans `[1, code.length]`),
  exactement 3 `hints` dont le 3e commence par `RÉPONSE —`, plus `explanation`, `fix` et `basePoints`.
- Thème au choix parmi : front-running, oracle manipulable, signature replay, déni de service,
  overflow non contrôlé (unchecked), initialisation non protégée, collision de slots.
- Aucun faux positif : une seule interprétation correcte.
- Vérifie que la séparation moteur/donnée est intacte : **aucune** modification de `engine.ts`, `world.ts` ou `ui.ts`.

Termine par `npm run verify`. Si un maillon est rouge, corrige avant de conclure.

Sujet (optionnel) : $ARGUMENTS
