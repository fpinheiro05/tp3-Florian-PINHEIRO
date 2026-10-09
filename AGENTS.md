# AGENTS.md — Solidity Escape 3D

Règles de vérité pour tout agent qui travaille sur ce dépôt. **À lire avant d'agir.**

## Le projet

Escape game 3D navigateur (TypeScript + Three.js + Vite) : le joueur audite 5 smart contracts
Solidity piégés pour ouvrir 5 portes. Trois indices par salle ; le 3e révèle la réponse.
C'est le **TP3** du cours *Outils d'IA pour développeurs – IUT 2026/2027*.

## Layout

| Chemin | Rôle |
| --- | --- |
| `src/main.ts` | Orchestrateur : état, progression, victoire |
| `src/game/levels.ts` | **Donnée du jeu** : contrats piégés, lignes buguées, 3 indices, correctifs |
| `src/game/engine.ts` | Règles pures (aucun DOM, aucun Three.js) : sélection, vérification d'audit, score |
| `src/game/collision.ts` | Collisions pures (murs, portes, pupitres), testables sans WebGL |
| `src/game/world.ts` | Scène Three.js : salles, portes, terminaux, contrôles FPS |
| `src/game/ui.ts` | Interface DOM : titre, HUD, panneau d'audit, victoire |
| `src/game/highlight.ts` | Coloration syntaxique Solidity |
| `src/game/audio.ts` | Effets sonores WebAudio |
| `tests/` | Tests Vitest des règles |
| `docs/` | Rapport et captures d'écran (preuves) |

## Invariants NON NÉGOCIABLES

1. **Le moteur reste pur.** `src/game/engine.ts` ne touche ni au DOM ni à Three.js et **ne lève jamais** : toute
   entrée (y compris corrompue) est normalisée et bornée.
2. **La donnée est séparée du moteur.** Ajouter une salle = ajouter un objet dans `LEVELS` (`src/game/levels.ts`),
   sans modifier `engine.ts` ni `world.ts`.
3. **Chaque niveau** a : un `id` unique, `index` consécutif depuis 0, `code` de plus de 5 lignes,
   au moins une ligne dans `bugLines`, toutes comprises dans `[1, code.length]`, exactement 3 `hints`,
   et `hints[2]` **contient la réponse** (préfixée `RÉPONSE —`), plus `explanation` et `fix`.
4. **Le 3e indice donne la réponse.** Ne jamais casser cette promesse de jeu.
5. **Le score ne peut pas devenir négatif** : plancher 100 pts pour une salle validée.
6. **Aucune régression du filet.** `npm run verify` doit passer avant tout commit
   (lint + typecheck + tests + build).

## Commandes utiles

```bash
npm run dev        # serveur de développement Vite
npm run verify     # le filet complet (à lancer avant chaque commit)
npm run test       # Vitest
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # build de production dans dist/
```

## Attentes de qualité

- Code **TypeScript strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Pas de `any`. Pas de `console.log` laissé. Pas de dépendance inutile.
- Toute logique de jeu nouvelle arrive **avec ses tests** dans `tests/`.
- Les messages utilisateur sont en **français**, l'anglais reste pour les identifiants de code.
- **Aucune persistance** : chaque lancement démarre une partie neuve. Le bouton « Rejouer » réinitialise tout (progression, portes, écran de victoire).

## Interdits

- `git push`, `rm -rf`, réécrire l'historique sans demande explicite.
- Modifier `package-lock.json` à la main.
- Éditer `dist/` (généré).
- Retirer ou affaiblir un test pour faire passer le filet.

## Definition of Done

- [ ] `npm run verify` vert (lint, types, tests, build).
- [ ] Les invariants ci-dessus respectés.
- [ ] Documentation mise à jour si le comportement change (`README.md`, ce fichier).
- [ ] Un commit clair, au message explicite.
