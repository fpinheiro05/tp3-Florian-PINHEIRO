export interface Level {
  id: string;
  index: number;
  roomName: string;
  title: string;
  vulnerability: string;
  difficulty: "Facile" | "Moyen" | "Difficile";
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
    id: "reentrancy",
    index: 0,
    roomName: "Salle 01 — Le Coffre",
    title: "Le Coffre percé (Reentrancy)",
    vulnerability: "Réentrance",
    difficulty: "Facile",
    description:
      "Le coffre-fort du labo se vide tout seul. Un attaquant draine les fonds avec un contrat malveillant. Trouvez la faille.",
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
      "Indice 1 — L'argent quitte le contrat AVANT que la comptabilité soit mise à jour. Que peut faire un attaquant entre les deux ?",
      "Indice 2 — Ligne 13 : l'appel externe `call` rend la main à l'attaquant alors que `balances[msg.sender]` n'a pas encore été décrémenté. Il peut rappeler withdraw() en boucle.",
      hint3(
        "Ligne 13 : l'appel externe précède la mise à jour du solde. Corrigez avec le motif checks-effects-interactions (décrémenter AVANT le call) + ReentrancyGuard.",
      ),
    ],
    explanation:
      "L'appel externe ligne 13 rend le contrôle à l'appelant avant `balances[msg.sender] -= amount` (ligne 15). Un contrat attaquant ré-entre dans withdraw() via son fallback et vide le coffre (attaque DAO 2016).",
    fix: "Décrémenter le solde AVANT le call, ou utiliser OpenZeppelin ReentrancyGuard : `nonReentrant` + motif checks-effects-interactions.",
    basePoints: 1000,
  },
  {
    id: "tx-origin",
    index: 1,
    roomName: "Salle 02 — Le Badge",
    title: "Le Badge fantôme (tx.origin)",
    vulnerability: "Authentification tx.origin",
    difficulty: "Facile",
    description:
      "La porte blindée s'ouvre pour n'importe quel visiteur piégé. Le contrôle d'accès utilise la mauvaise variable globale.",
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
      "Indice 1 — `tx.origin` remonte toute la chaîne d'appels jusqu'à l'humain d'origine. Un contrat intermédiaire malveillant devient invisible.",
      "Indice 2 — Ligne 12 : si le propriétaire se fait piéger et appelle un contrat attaquant, `tx.origin` vaut toujours le propriétaire et le check passe.",
      hint3(
        "Ligne 12 : remplacez `tx.origin == owner` par `msg.sender == owner`. Ne jamais utiliser tx.origin pour l'authentification.",
      ),
    ],
    explanation:
      "tx.origin désigne le compte externe à l'origine de la transaction, pas l'appelant direct. Un attaquant fait signer un appel anodin au owner vers son contrat, qui appelle openVault() : le check passe alors que msg.sender est l'attaquant.",
    fix: "Utiliser `msg.sender` pour l'authentification. Réserver tx.origin à des cas très spécifiques (jamais pour autoriser).",
    basePoints: 1000,
  },
  {
    id: "access-control",
    index: 2,
    roomName: "Salle 03 — La Monnaie",
    title: "La Planche à billets (Access Control)",
    vulnerability: "Contrôle d'accès manquant",
    difficulty: "Moyen",
    description:
      "N'importe qui peut frapper des jetons et siphonner la réserve. Une fonction critique est ouverte aux quatre vents.",
    code: [
      "// SPDX-License-Identifier: MIT",
      "pragma solidity ^0.8.0;",
      "",
      "contract LabToken {",
      "    address public owner;",
      "    mapping(address => uint256) public balanceOf;",
      "",
      "    constructor() {",
      "        owner = msg.sender;",
      "    }",
      "",
      "    function mint(address to, uint256 amount) external {",
      "        balanceOf[to] += amount;",
      "    }",
      "",
      "    function withdrawReserve() external {",
      "        payable(msg.sender).transfer(address(this).balance);",
      "    }",
      "}",
    ],
    bugLines: [12, 16],
    hints: [
      "Indice 1 — Deux fonctions déplacent de la valeur sans vérifier QUI appelle. Cherchez les fonctions `external` sans `require` ni modificateur.",
      "Indice 2 — Lignes 12 et 16 : `mint` permet de créer des jetons infinis et `withdrawReserve` envoie tout l'ether du contrat à n'importe qui. Il manque un `onlyOwner`.",
      hint3(
        "Lignes 12 et 16 : ajoutez un modificateur `onlyOwner` (require(msg.sender == owner)) sur mint() et withdrawReserve().",
      ),
    ],
    explanation:
      "mint() et withdrawReserve() sont publiques sans contrôle d'accès. N'importe quelle adresse peut se minter des millions de jetons puis vider la réserve ETH. Classique OWASP Smart Contract Top 10.",
    fix: "Ajouter `modifier onlyOwner { require(msg.sender == owner); _; }` et l'appliquer aux deux fonctions. Idéalement utiliser OpenZeppelin Ownable.",
    basePoints: 1200,
  },
  {
    id: "randomness",
    index: 3,
    roomName: "Salle 04 — Le Casino",
    title: "Le Casino truqué (Randomness)",
    vulnerability: "Aléa prévisible",
    difficulty: "Moyen",
    description:
      "La loterie du labo est gagnée à chaque fois par le même joueur. Le tirage utilise des sources que tout le monde peut prédire.",
    code: [
      "// SPDX-License-Identifier: MIT",
      "pragma solidity ^0.8.0;",
      "",
      "contract LabLottery {",
      "    function play() external payable {",
      "        require(msg.value == 0.1 ether, \"mise = 0.1 ETH\");",
      "        uint256 roll = uint256(",
      "            keccak256(abi.encodePacked(block.timestamp, block.coinbase, msg.sender))",
      "        ) % 100;",
      "        if (roll < 10) {",
      "            payable(msg.sender).transfer(address(this).balance);",
      "        }",
      "    }",
      "}",
    ],
    bugLines: [8],
    hints: [
      "Indice 1 — Tout ce que le contrat peut lire, un attaquant peut le lire aussi AVANT de jouer. Le tirage est-il vraiment secret ?",
      "Indice 2 — Ligne 8 : `block.timestamp`, `block.coinbase` et `msg.sender` sont connus ou manipulables par le mineur / l'attaquant qui simule le tirage dans son propre contrat avant de miser.",
      hint3(
        "Ligne 8 : n'utilisez jamais block.timestamp/coinbase pour l'aléa. Utilisez Chainlink VRF ou un commit-reveal.",
      ),
    ],
    explanation:
      "L'aléa on-chain basé sur block.timestamp / coinbase est prévisible et manipulable : un attaquant déploie un contrat qui calcule `roll` à l'identique et ne joue que quand il gagne, ou un mineur ajuste le timestamp.",
    fix: "Utiliser un oracle d'aléa vérifiable (Chainlink VRF v2) ou un schéma commit-reveal en deux phases.",
    basePoints: 1200,
  },
  {
    id: "delegatecall",
    index: 4,
    roomName: "Salle 05 — Le Cœur",
    title: "Le Cœur possédé (Delegatecall)",
    vulnerability: "Delegatecall + appel non vérifié",
    difficulty: "Difficile",
    description:
      "Le cœur du labo exécute du code étranger comme s'il était le sien. Deux lignes permettent de voler le contrat de l'intérieur.",
    code: [
      "// SPDX-License-Identifier: MIT",
      "pragma solidity ^0.8.0;",
      "",
      "contract Core {",
      "    address public owner;",
      "    address public logic;",
      "",
      "    constructor(address _logic) {",
      "        owner = msg.sender;",
      "        logic = _logic;",
      "    }",
      "",
      "    function upgrade(address _logic) external {",
      "        logic = _logic;",
      "    }",
      "",
      "    fallback() external payable {",
      "        (bool ok, ) = logic.delegatecall(msg.data);",
      "        require(ok);",
      "    }",
      "}",
    ],
    bugLines: [13, 18],
    hints: [
      "Indice 1 — `delegatecall` exécute le code d'un autre contrat DANS le stockage du vôtre. Si l'adresse est contrôlable et l'appel aveugle, c'est une prise de contrôle totale.",
      "Indice 2 — Ligne 13 : `upgrade` n'a aucun contrôle d'accès, n'importe qui change l'adresse `logic`. Ligne 18 : le retour de delegatecall n'est pas vérifié finement et le fallback est ouvert à tout calldata.",
      hint3(
        "Lignes 13 et 18 : protégez upgrade() par onlyOwner (ou gouvernance + timelock) et blindez le proxy (UUPS/Transparent, allowlist de sélecteurs, vérification du retour).",
      ),
    ],
    explanation:
      "upgrade() sans onlyOwner permet à n'importe qui de pointer `logic` vers son contrat malveillant. Le fallback delegatecall l'exécute alors avec le stockage du Core : l'attaquant écrase `owner` (collision de slots) et vole tout (attaque Parity 2017). De plus `require(ok)` sans message masque les échecs.",
    fix: "Restreindre upgrade() à owner/gouvernance + timelock, utiliser un proxy standard audité (OZ UUPS), valider les retours delegatecall et émettre des événements.",
    basePoints: 1500,
  },
];

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function totalBasePoints(): number {
  return LEVELS.reduce((s, l) => s + l.basePoints, 0);
}
