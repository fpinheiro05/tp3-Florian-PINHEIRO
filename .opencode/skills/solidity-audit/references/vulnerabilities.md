# Catalogue des vulnérabilités (pour les salles)

| Salle | Classe | Bug typique | Ligne piège | Correctif |
| --- | --- | --- | --- | --- |
| 01 | Réentrance | appel externe avant mise à jour d'état | `call{value:}` avant `balance -=` | checks-effects-interactions + `ReentrancyGuard` |
| 02 | Auth `tx.origin` | `require(tx.origin == owner)` | ligne du `require` | utiliser `msg.sender` |
| 03 | Contrôle d'accès | `mint`/`withdraw` publiques sans `onlyOwner` | définitions des fonctions | modificateur `onlyOwner` (Ownable) |
| 04 | Aléa prévisible | `keccak256(block.timestamp, ...)` pour tirer un gagnant | ligne de génération du `roll` | Chainlink VRF / commit-reveal |
| 05 | `delegatecall` + upgrade | `upgrade()` sans contrôle d'accès, proxy ouvert | ligne de `upgrade`, `delegatecall` | gouvernance + timelock, proxy audité |

## Autres classes à piocher

- **Front-running** : `require(answer == keccak256(solution))` révélé dans la transaction (commit-reveal).
- **Oracle manipulable** : prix lu depuis un pool unique (`getReserves`) sans TWAP.
- **Signature replay** : `ecrecover` sans `nonce` ni `chainId` (EIP-712 absent).
- **DoS** : boucle sur tableau non borné, `.transfer()` à `gas` fixe, `push` à un index bloquant.
- **Overflow non contrôlé** : bloc `unchecked { }` autour d'une soustraction `a - b`.
- **Initialisation** : `initialize()` publique sans `initializer` (proxy non protégé).
- **Collision de slots** : ordre de stockage incohérent entre proxy et implémentation.

## Rappel

Un niveau = **un** bug net. Pas de bug « combiné » sur deux lignes éloignées sans lien logique évident.
Le joueur doit pouvoir désigner la ou les lignes fautives sans ambiguïté.
