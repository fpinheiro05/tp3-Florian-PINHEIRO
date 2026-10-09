# Format `Level` — référence

Objet défini dans `src/game/levels.ts`. Interface TypeScript :

```ts
export interface Level {
  id: string;                 // kebab-case, unique
  index: number;              // consécutif depuis 0, = position dans LEVELS
  roomName: string;           // "Salle 0X — Nom"
  title: string;              // titre du contrat
  vulnerability: string;      // classe de bug affichée
  difficulty: "Facile" | "Moyen" | "Difficile";
  description: string;        // message d'ambiance pour le joueur
  code: string[];             // lignes Solidity ; ligne affichée N = code[N-1]
  bugLines: number[];         // numéros 1-based des lignes contenant le(s) bug(s)
  hints: [string, string, string]; // 3 indices ; hints[2] = RÉPONSE — ...
  explanation: string;        // pourquoi c'est un bug
  fix: string;                // correction idiomatique
  basePoints: number;         // 1000 facile, ~1200 moyen, ~1500 difficile
}
```

## Invariants (vérifiés par les tests et le MCP `level-guard`)

1. `id` unique dans `LEVELS`.
2. `index === position` dans le tableau, en partant de 0.
3. `code.length > 5`.
4. `bugLines.length >= 1` et pour chaque `b` : `1 <= b <= code.length`.
5. `hints.length === 3` et `hints[2].includes("RÉPONSE")`.
6. `basePoints > 0`.

## Pièges à éviter

- **Index 0-based vs 1-based** : dans `code`, la première ligne est `code[0]` mais s'affiche « 1 ».
  Un `bugLines: [13]` vise la **13e** ligne affichée, donc `code[12]`.
- **Coloration** : `highlightSolidity` échappe le HTML ; ne mets pas de HTML dans `code`.
- **Commentaire de fin de ligne** : `//` coupe la coloration ; c'est géré.
- **Guillemets** : utilise des guillemets doubles échappés dans les chaînes TS.
