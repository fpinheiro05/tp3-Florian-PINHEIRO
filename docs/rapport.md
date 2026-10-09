# Solidity Escape 3D — rapport de projet (TP3)

*Outils d'IA pour développeurs — IUT 2026/2027 — Florian PINHEIRO*

## 1. L'idée

Un **escape game 3D** jouable au navigateur. Le joueur est enfermé dans un laboratoire de
smart contracts : trois contrats Solidity **piégés** bloquent autant de portes. Il doit repérer
toutes les lignes buguées de chaque contrat pour valider l'audit et s'échapper.

Trois indices par salle aident à avancer, et **le troisième donne la réponse** — mais coûte
−500 points. Le score récompense l'autonomie, le temps et la précision.

## 2. Ce qu'on ne saurait pas écrire à la main

Le projet croise trois domaines que je ne maîtrisais pas au départ et que la chaîne a rendus
accessibles :

- **Trois.js / WebGL** : scène 3D, contrôles FPS, portes animées, terminaux interactifs, éclairage.
- **Sécurité Solidity** : réentrance, `tx.origin`, contrôle d'accès, aléa prévisible, `delegatecall`.
- **Moteur de jeu robuste** : entrées corrompues, `localStorage` cassé, score borné, pas d'exception.

## 3. Les trois salles

| Salle | Contrat | Vulnérabilité | Difficulté | Points |
| --- | --- | --- | --- | --- |
| 01 — Le Badge | `LabToken` | Contrôle d'accès (modificateur `onlyOwner` oublié) | Facile | 1000 |
| 02 — Le Fantôme | `BadgeDoor` | Authentification `tx.origin` | Facile | 1000 |
| 03 — Le Coffre | `Vault` | Réentrance (ordre des opérations) | Moyen | 1200 |

Chaque salle est une **mini-leçon à la CryptoZombies** : une mission explicite (« trouve la fonction qui
devrait être réservée au propriétaire »), un contrat court et lisible, **un seul bug** à désigner, et une
progression de difficulté douce. Après l'audit, le joueur reçoit l'**explication** de la faille
(DAO 2016…) et le **correctif** idiomatique.

## 4. Architecture

```
src/
├── main.ts            orchestrateur (état, progression, victoire)
├── styles.css         HUD, overlays, coloration
└── game/
    ├── levels.ts      la donnée : contrats, lignes buguées, 3 indices, correctifs
    ├── engine.ts      règles PURES : sélection, check, score, sauvegarde — ne lève jamais
    ├── collision.ts   collisions PURES : murs, portes, pupitres (testables sans WebGL)
    ├── highlight.ts   coloration syntaxique Solidity maison
    ├── world.ts       scène Three.js (salles, portes, terminaux, FPS)
    ├── ui.ts          interfaces DOM (titre, HUD, panneau d'audit, victoire)
    └── audio.ts       effets WebAudio sans asset
```

**Séparation stricte moteur / donnée / rendu** : ajouter une salle = ajouter un objet dans
`LEVELS`, sans toucher au moteur ni au monde 3D.

## 5. Le harness

Voir la capture `docs/screenshots/08-harness.png`. Tout est dans le dépôt :

- **Agent principal** `game-engineer` (`.opencode/agents/`) et **subagents** aux droits stricts :
  `solidity-auditor` (édite *uniquement* `levels.ts`), `test-engineer` (édite *uniquement* `tests/`),
  `release-verifier` (lecture seule, rend PASS/FAIL).
- **Rules** : `AGENTS.md` — 6 invariants non négociables + Definition of Done.
- **Commands** : `/new-level`, `/verify`, `/level-check` (`.opencode/commands/`).
- **Skill** : `solidity-audit` — catalogue de vulnérabilités et format `Level`.
- **Hook** : plugin `harness-guard` — réinjecte les invariants à chaque appel modèle et expose
  l'outil `game_verify_gate`.
- **MCP local** : `level-guard` — outil `check_levels` qui valide les données de jeu (stdio,
  sans dépendance).
- **Droits** : `opencode.jsonc` — lecture libre, shell soumis à accord, `git push` / `rm -rf` interdits.

## 6. Solidité (« je vais essayer de la casser »)

- Le moteur normalise **toute** entrée : sélection vide, doublons, hors bornes, `NaN`, chaînes,
  `null`, `localStorage` corrompu. Il ne lève jamais.
- Score plancher à 100, pénalités d'indices plafonnées, progression réparable.
- TypeScript **strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), zéro `any`.
- **28 tests Vitest** + lint + build, en local et en **CI GitHub Actions** (`npm run verify`).

## 7. Lancer

```bash
npm install
npm run dev        # http://localhost:5173
npm run verify     # lint + types + tests + build
npm run screenshots
```

## 8. Preuves

- `docs/screenshots/` : titre, labo 3D, audit d'une salle, les 3 indices, salle difficile, victoire,
  le filet qui tourne, carte du harness.
- `docs/preuves/verify.txt` : sortie du filet.
