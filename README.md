# Solidity Escape 3D

> Escape game 3D jouable au navigateur : vous êtes enfermé dans un laboratoire de smart contracts.
> Cinq contrats Solidity **piégés** bloquent autant de portes. Repérez **toutes** les lignes buguées de chaque contrat, validez l'audit et évadez-vous. **Trois indices par salle** — le troisième donne la réponse, mais coûte cher en score.

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

## 🏫 Les 5 salles

| Salle | Contrat | Vulnérabilité | Difficulté |
| --- | --- | --- | --- |
| 01 — Le Coffre | `Vault` | Réentrance | Facile |
| 02 — Le Badge | `BadgeDoor` | Authentification `tx.origin` | Facile |
| 03 — La Monnaie | `LabToken` | Contrôle d'accès manquant | Moyen |
| 04 — Le Casino | `LabLottery` | Aléa prévisible | Moyen |
| 05 — Le Cœur | `Core` | `delegatecall` / appel non vérifié | Difficile |

Chaque niveau est défini dans `src/game/levels.ts` avec son code, ses lignes buguées, ses 3 indices, l'explication et le correctif — la **donnée du jeu est ainsi séparée du moteur**, ce qui rend l'ajout de salles trivial.

## 🏗️ Architecture

```
src/
├── main.ts              # orchestrateur : état, progression, victoire
├── styles.css           # HUD, overlays, coloration
└── game/
    ├── levels.ts        # les 5 contrats piégés + indices + explications
    ├── engine.ts        # règles pures : sélection, check, score, sauvegarde
    ├── highlight.ts     # coloration syntaxique Solidity maison
    ├── world.ts         # scène Three.js : salles, portes, terminaux, FPS
    ├── ui.ts            # interfaces DOM : titre, HUD, panneau d'audit, victoire
    └── audio.ts         # effets sonores WebAudio (sans assets)
tests/
└── engine.test.ts       # 15 tests sur les règles et la coloration
```

Le **moteur (`engine.ts`) est pur** (aucun DOM, aucun Three.js) et **ne lève jamais** :
il normalise toute entrée, y compris corrompue, ce qui le rend directement testable
et robuste (exigence de qualité demandée au TP).

## ✅ Qualité

```bash
npm run verify   # lint + typecheck + tests + build
```

- **TypeScript strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`…)
- **15 tests unitaires** sur les règles de jeu et la coloration
- **ESLint** sans warning
- Build Vite ~130 ko gzip

## 🚀 Idées d'extension

- Nouvelles salles (ajouter un objet dans `LEVELS`) : front-running, oracle, signature replay…
- Mode chronométré / classement local, niveaux difficiles (plusieurs bugs proches).
- Compilation réelle des correctifs via `solc` pour vérifier la réponse « à la compilation ».
