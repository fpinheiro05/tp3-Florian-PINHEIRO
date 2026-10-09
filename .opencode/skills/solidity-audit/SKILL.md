---
name: Solidity Audit
description: Concevoir et auditer les contrats Solidity piégés des salles, catalogue des vulnérabilités et format Level
---

# Skill — Audit Solidity

Utilise cette skill dès qu'il faut **créer, relire ou corriger** un contrat Solidity d'une salle du jeu.

## Workflow

1. Lis `references/vulnerabilities.md` pour choisir une classe de bug non encore utilisée.
2. Écris un contrat **minimal** (15–20 lignes), compilable, dont le seul défaut est la vulnérabilité visée.
   Aucun bug de style, aucun faux positif : le `bugLines` doit être la **seule** bonne réponse.
3. Renseigne le `Level` complet (voir plus bas) dans `src/game/levels.ts`.
4. Vérifie la cohérence : `bugLines ⊆ [1, code.length]`, 3 indices, le 3e commence par `RÉPONSE —`.
5. Fais écrire les tests d'invariants par l'agent `test-engineer`, puis passe `npm run verify`.

## Format `Level` (voir `references/level-format.md`)

- `code` est un tableau de lignes ; la **ligne affichée n° N correspond à `code[N-1]`** (index 1-based).
- `hints[2]` = réponse, préfixée `RÉPONSE — ...`.
- `explanation` cite l'attaque réelle (ex. « DAO 2016 », « Parity 2017 », « OWASP SC Top 10 »).
- `fix` décrit la correction idiomatique (OpenZeppelin, checks-effects-interactions, VRF…).

## Rappel de sécurité du jeu

Un joueur doit pouvoir trouver le bug **en lisant**. Interdit de piéger sur une dépendance externe absente
ou sur une subtilité de version du compilateur : le bug doit tenir dans le listing affiché.
