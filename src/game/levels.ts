export interface Level {
  id: string;
  index: number;
  roomName: string;
  title: string;
  vulnerability: string;
  difficulty: "Facile" | "Moyen" | "Difficile";
  /** Consigne affichée en haut du panneau d'audit. */
  mission: string;
  description: string;
  /** Lignes de code Solidity, indexées à partir de 1 pour l'affichage. */
  code: string[];
  /** Numéros de ligne (1-based) contenant le bug. Toutes doivent être sélectionnées. */
  bugLines: number[];
  hints: [string, string, string];
  explanation: string;
  fix: string;
  basePoints: number;
}

export const MAX_HINTS = 3;

function hint3(answer: string): string {
  return `RÉPONSE — ${answer}`;
}

export const LEVELS: Level[] = [
  {
    id: "zombie-factory",
    index: 0,
    roomName: "Salle 01 — Le Labo",
    title: "Le clin d'œil de trop",
    vulnerability: "Syntaxe (compilation)",
    difficulty: "Facile",
    mission:
      "Trouve la ligne qui empêche le contrat de compiler : ce n'est pas du Solidity.",
    description:
      "Un débutant a laissé une note personnelle dans le fichier… mais Solidity ne comprend pas l'humour. Une ligne n'a rien à faire dans ce contrat.",
    code: [
      "pragma solidity >=0.5.0 <0.6.0;",
      "",
      "je suis un bug lol",
      "",
      "contract ZombieFactory {",
      "    uint dnaDigits = 16;",
      "    uint dnaModulus = 10 ** dnaDigits;",
      "",
      "    struct Zombie {",
      "        string name;",
      "        uint dna;",
      "    }",
      "",
      "    Zombie[] public zombies;",
      "",
      "    function createZombie(string memory _name, uint _dna) public {",
      "        zombies.push(Zombie(_name, _dna));",
      "    }",
      "}",
    ],
    bugLines: [3],
    hints: [
      "Indice 1 — Où regarder : le contrat ne compile pas. Cherche la ligne qui n'est ni une instruction Solidity ni un commentaire.",
      "Indice 2 — Ce qui cloche : la ligne 3 est une phrase en français, pas du code. Hors `pragma`, `import` et déclarations, Solidity ne tolère rien.",
      hint3("Ligne 3 : `je suis un bug lol` doit être supprimée (ou commentée avec `//`)."),
    ],
    explanation:
      "Un fichier Solidity ne peut contenir, au niveau supérieur, que `pragma`, `import` et des déclarations (`contract`, `interface`, `library`). La ligne `je suis un bug lol` est une instruction invalide : le compilateur échoue avec une erreur de syntaxe, donc le contrat ne se déploie jamais.",
    fix: "Supprimer la ligne 3, ou la transformer en commentaire : `// je suis un bug lol`.",
    basePoints: 1000,
  },
  {
    id: "tx-origin",
    index: 1,
    roomName: "Salle 02 — Le Fantôme",
    title: "Le mauvais mot-clé",
    vulnerability: "Authentification",
    difficulty: "Facile",
    mission: "Trouve la ligne où le contrôle d'accès utilise la mauvaise variable globale.",
    description:
      "La porte blindée s'ouvre pour un visiteur piégé. Le contrat vérifie bien une identité… mais pas la bonne. Cherche le `require` suspect.",
    code: [
      "// SPDX-License-Identifier: MIT",
      "pragma solidity ^0.8.0;",
      "",
      "contract BadgeDoor {",
      "    address public owner;",
      "",
      "    constructor() {",
      "        owner = msg.sender;",
      "    }",
      "",
      "    function openVault() external {",
      "        require(tx.origin == owner, \"acces refuse\");",
      "        _unlock();",
      "    }",
      "",
      "    function _unlock() internal {",
      "        // ouvre la porte...",
      "    }",
      "}",
    ],
    bugLines: [12],
    hints: [
      "Indice 1 — Où regarder : la fonction `openVault` contient un `require` qui décide si la porte s'ouvre.",
      "Indice 2 — Ce qui cloche : `tx.origin` désigne l'humain au départ de la transaction, pas l'appelant direct. Un contrat intermédiaire malveillant devient invisible.",
      hint3(
        "Ligne 12 : `require(tx.origin == owner, ...)` — remplace `tx.origin` par `msg.sender`.",
      ),
    ],
    explanation:
      "`tx.origin` remonte toute la chaîne d'appels jusqu'au compte externe d'origine. Si le propriétaire signe un appel vers un contrat piégé, ce dernier peut rappeler `openVault()` : `tx.origin` vaut encore le propriétaire, alors que `msg.sender` est l'attaquant.",
    fix: "Utiliser `msg.sender` pour l'authentification : `require(msg.sender == owner, ...)`. Réserver `tx.origin` à des cas très particuliers, jamais pour autoriser.",
    basePoints: 1000,
  },
  {
    id: "reentrancy",
    index: 2,
    roomName: "Salle 03 — Le Coffre",
    title: "L'ordre des opérations",
    vulnerability: "Réentrance",
    difficulty: "Moyen",
    mission: "Trouve la ligne qui envoie l'argent AVANT de mettre à jour le solde.",
    description:
      "Le coffre-fort se vide tout seul. Un attaquant en profite car le contrat fait les choses dans le mauvais ordre : il paie d'abord, il compte ensuite. Repère la ligne de l'envoi.",
    code: [
      "// SPDX-License-Identifier: MIT",
      "pragma solidity ^0.8.0;",
      "",
      "contract Vault {",
      "    mapping(address => uint256) public balances;",
      "",
      "    function deposit() external payable {",
      "        balances[msg.sender] += msg.value;",
      "    }",
      "",
      "    function withdraw() external {",
      "        uint256 bal = balances[msg.sender];",
      "        require(bal > 0, \"rien a retirer\");",
      "        (bool ok, ) = msg.sender.call{value: bal}(\"\");",
      "        require(ok, \"transfert echoue\");",
      "        balances[msg.sender] = 0;",
      "    }",
      "}",
    ],
    bugLines: [14],
    hints: [
      "Indice 1 — Où regarder : dans `withdraw`, regarde l'ordre exact des opérations entre l'envoi de l'argent et la mise à jour du solde.",
      "Indice 2 — Ce qui cloche : la ligne qui envoie l'éther (`.call{value:}`) arrive AVANT que le solde soit décrémenté. L'attaquant peut rappeler `withdraw` pendant ce laps de temps.",
      hint3(
        "Ligne 14 : `(bool ok, ) = msg.sender.call{value: bal}(\"\");` — le solde doit être mis à zéro AVANT cet appel (motif checks-effects-interactions).",
      ),
    ],
    explanation:
      "L'appel externe ligne 14 rend le contrôle à l'appelant avant `balances[msg.sender] = 0` (ligne 16). Un contrat attaquant ré-entre dans `withdraw()` via son `fallback` et vide le coffre (attaque DAO 2016).",
    fix: "Décrémenter le solde AVANT l'appel, ou utiliser `ReentrancyGuard` d'OpenZeppelin avec le motif checks-effects-interactions.",
    basePoints: 1200,
  },
];

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function totalBasePoints(): number {
  return LEVELS.reduce((s, l) => s + l.basePoints, 0);
}
