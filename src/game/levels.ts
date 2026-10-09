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
    id: "access-control",
    index: 0,
    roomName: "Salle 01 — Le Badge",
    title: "Qui a le droit ?",
    vulnerability: "Contrôle d'accès",
    difficulty: "Facile",
    mission:
      "Trouve la fonction qui devrait être réservée au propriétaire, mais qui est ouverte à tout le monde.",
    description:
      "La réserve de jetons du labo se vide. Regarde bien : une fonction est protégée, l'autre non. Repère celle qui manque de protection.",
    code: [
      "// SPDX-License-Identifier: MIT",
      "pragma solidity ^0.8.0;",
      "",
      "contract LabToken {",
      "    address public owner;",
      "    mapping(address => uint256) public balanceOf;",
      "",
      "    modifier onlyOwner() {",
      "        require(msg.sender == owner, \"acces refuse\");",
      "        _;",
      "    }",
      "",
      "    constructor() { owner = msg.sender; }",
      "",
      "    function mint(address to, uint256 amount) external onlyOwner {",
      "        balanceOf[to] += amount;",
      "    }",
      "",
      "    function burn(address from, uint256 amount) external {",
      "        balanceOf[from] -= amount;",
      "    }",
      "}",
    ],
    bugLines: [19],
    hints: [
      "Indice 1 — Où regarder : compare les deux dernières fonctions, `mint` et `burn`. Qu'est-ce qui change entre les deux déclarations ?",
      "Indice 2 — Ce qui cloche : `mint` porte le mot-clé `onlyOwner`, `burn` non. N'importe qui peut donc brûler les jetons d'une autre adresse.",
      hint3(
        "Ligne 19 : `function burn(...) external` — il manque `onlyOwner` (à ajouter comme sur `mint` ligne 15).",
      ),
    ],
    explanation:
      "`burn` est publique et sans contrôle d'accès. N'importe quelle adresse peut détruire les jetons de n'importe qui. Le modificateur `onlyOwner` existe déjà (lignes 8-11) et est bien utilisé par `mint`, mais oublié sur `burn`.",
    fix: "Ajouter `onlyOwner` à `burn` : `function burn(address from, uint256 amount) external onlyOwner`.",
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
      "    function withdraw(uint256 amount) external {",
      "        require(balances[msg.sender] >= amount, \"fonds insuffisants\");",
      "        (bool ok, ) = msg.sender.call{value: amount}(\"\");",
      "        require(ok, \"transfert echoue\");",
      "        balances[msg.sender] -= amount;",
      "    }",
      "}",
    ],
    bugLines: [13],
    hints: [
      "Indice 1 — Où regarder : dans `withdraw`, regarde l'ordre exact des opérations entre l'envoi de l'argent et la mise à jour du solde.",
      "Indice 2 — Ce qui cloche : la ligne qui envoie l'éther (`.call{value:}`) arrive AVANT que le solde soit décrémenté. L'attaquant peut rappeler `withdraw` pendant ce laps de temps.",
      hint3(
        "Ligne 13 : `(bool ok, ) = msg.sender.call{value: amount}(\"\");` — le solde doit être décrémenté AVANT cet appel (motif checks-effects-interactions).",
      ),
    ],
    explanation:
      "L'appel externe ligne 13 rend le contrôle à l'appelant avant `balances[msg.sender] -= amount` (ligne 15). Un contrat attaquant ré-entre dans `withdraw()` via son `fallback` et vide le coffre (attaque DAO 2016).",
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
