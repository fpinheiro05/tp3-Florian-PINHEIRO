# Solidity Escape 3D

> Escape game 3D jouable au navigateur : vous êtes enfermé dans un laboratoire de smart contracts.
> Trois contrats Solidity **piégés** bloquent autant de portes. Repérez la ligne buguée de chaque contrat, validez l'audit et évadez-vous. **Trois indices par salle** — le troisième donne la réponse, mais coûte cher en score.

Réalisé pour le **TP3** du cours *IA – IUT 2026* (Florian PINHEIRO).

---

## 🎮 Jouer

```bash
npm install
npm run dev      # http://localhost:5173
```

Build de production :

```bash
npm run build    # génère dist/
npm run preview  # sert dist/ sur http://localhost:4173
```

### Commandes

| Touche | Action |
| --- | --- |
| `ZQSD` / `WASD` / flèches | Se déplacer |
| Souris | Regarder (cliquer pour capturer le curseur) |
| `Maj` | Courir |
| `E` | Examiner un terminal / interagir avec une porte |
| `Échap` | Fermer le panneau ou mettre en pause |
| Clic sur une ligne de code | Marquer / démarquer un bug |

## 🧩 Règles

1. Avancez dans le labo et visez un **terminal** (pupitre lumineux) puis `E`.
2. Le contrat s'ouvre : cliquez les lignes que vous jugez buguées, puis **Valider l'audit**.
3. Il faut trouver **toutes** les lignes buguées **sans faux positif**.
4. Bloqué ? Demandez un **indice** (max 3) :
   - **Indice 1** — piste générale (−150 pts)
   - **Indice 2** — localisation précise (−250 pts)
   - **Indice 3** — **la réponse** (−500 pts)
5. Chaque échec coûte −50 pts. La porte s'ouvre quand la salle est validée.

## 🏫 Les 3 salles

| Salle | Contrat | Vulnérabilité | Difficulté | Points |
| --- | --- | --- | --- | --- |
| 01 — Le Badge | `LabToken` | Contrôle d'accès (modificateur oublié) | Facile | 1000 |
| 02 — Le Fantôme | `BadgeDoor` | Authentification `tx.origin` | Facile | 1000 |
| 03 — Le Coffre | `Vault` | Réentrance (ordre des opérations) | Moyen | 1200 |

Chaque salle est pensée comme une **mini-leçon** à la CryptoZombies : une mission claire en français,
un contrat court et lisible, et un seul bug à désigner. Chaque niveau est défini dans
`src/game/levels.ts` avec son code, ses lignes buguées, ses 3 indices, l'explication et le correctif —
la **donnée du jeu est ainsi séparée du moteur**, ce qui rend l'ajout de salles trivial.

## 🏗️ Architecture

```
src/
├── main.ts              # orchestrateur : état, progression, victoire
├── styles.css           # HUD, overlays, coloration
└── game/
    ├── levels.ts        # les 3 contrats piégés + indices + explications
    ├── engine.ts        # règles pures : sélection, vérification, score
    ├── collision.ts     # collisions pures : murs, portes, pupitres (testables)
    ├── highlight.ts     # coloration syntaxique Solidity maison
    ├── world.ts         # scène Three.js : salles, portes, terminaux, FPS
    ├── ui.ts            # interfaces DOM : titre, HUD, panneau d'audit, victoire
    └── audio.ts         # effets sonores WebAudio (sans assets)
tests/
├── engine.test.ts       # 16 tests sur les règles et la coloration
├── collision.test.ts    # 12 tests sur les collisions (murs, portes, pupitres)
└── ui.test.ts           # 6 tests sur la sélection des lignes (régression)
```

Le **moteur (`engine.ts`) est pur** (aucun DOM, aucun Three.js) et **ne lève jamais** :
il normalise toute entrée, y compris corrompue, ce qui le rend directement testable
et robuste (exigence de qualité demandée au TP).

## 🤖 Harness OpenCode (TP3)

Le projet se construit **avec** la chaîne, pas à côté. Tout est dans le dépôt :

| Brique | Emplacement | Rôle |
| --- | --- | --- |
| Rules | `AGENTS.md` | 6 invariants + Definition of Done |
| Agent principal | `.opencode/agents/game-engineer.md` | développe les fonctionnalités |
| Subagents | `solidity-auditor`, `test-engineer`, `release-verifier` | droits stricts par tâche |
| Commands | `.opencode/commands/` | `/new-level`, `/verify`, `/level-check` |
| Skill | `.opencode/skills/solidity-audit/` | catalogue de vulnérabilités + format `Level` |
| Hook (plugin) | `.opencode/plugins/harness-guard/` | réinjecte les invariants, outil `game_verify_gate` |
| MCP | `mcp/level-guard.mjs` | outil `check_levels` (valide les données de jeu) |
| Droits | `opencode.jsonc` | lecture libre, shell sur accord, `git push`/`rm -rf` interdits |
| CI | `.github/workflows/ci.yml` | lint · types · tests · build à chaque push |

```bash
npm run verify   # le filet : lint + typecheck + tests + build
```

## 📸 Captures

Dans `docs/screenshots/` (preuves) : titre, labo 3D, audit d'une salle, les 3 indices, victoire,
le filet qui tourne et la carte du harness. Rapport complet dans `docs/rapport.md`.

```bash
npm run build && npm run screenshots
```

## ✅ Qualité


```bash
npm run verify   # lint + typecheck + tests + build
```

- **TypeScript strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`…)
- **34 tests unitaires** sur les règles de jeu, la coloration, les collisions et l'interface
- **ESLint** sans warning
- Build Vite ~130 ko gzip

## 🚀 Idées d'extension

- Nouvelles salles (ajouter un objet dans `LEVELS`) : front-running, oracle, signature replay…
- Mode chronométré / classement local, niveaux difficiles (plusieurs bugs proches).
- Compilation réelle des correctifs via `solc` pour vérifier la réponse « à la compilation ».
