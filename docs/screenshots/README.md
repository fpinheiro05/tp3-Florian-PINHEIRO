# Captures d'écran (preuves)

| Fichier | Contenu |
| --- | --- |
| `01-titre.png` | Écran titre et commandes |
| `02-labo-hud.png` | Vue 3D du labo + HUD (score, salles) |
| `03-salle1-audit.png` | Panneau d'audit du contrat `Vault` (coloration Solidity) |
| `04-salle1-indices.png` | Les 3 indices affichés, dont la réponse (−500 pts) |
| `05-salle5-delegatecall.png` | Salle difficile : `Core` (`delegatecall`) |
| `06-filet-verify.png` | `npm run verify` — lint · types · tests · build |
| `07-victoire.png` | Écran de victoire et détail du score |
| `08-harness.png` | Carte du harness (agents, droits, hooks, MCP, CI) |

Régénérer :

```bash
npm run build
npm run screenshots
```

Le script `scripts/screenshots.mjs` sert le build via un serveur local, pilote Chromium
(WebGL en SwiftShader) et capture aussi la sortie du filet (`docs/preuves/verify.txt`).
