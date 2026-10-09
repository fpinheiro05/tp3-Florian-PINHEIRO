---
description: Lance le filet complet (lint, types, tests, build) et rend un verdict PASS/FAIL
subagent: true
agent: release-verifier
---

Lance le filet de sécurité du projet : `npm run verify`.

Rapporte :

1. Le statut de chaque maillon : **lint** (ESLint), **types** (`tsc --noEmit`), **tests** (Vitest), **build** (Vite).
2. Pour tout échec : `fichier:ligne`, la cause probable, et la correction proposée.
3. Un verdict final unique : **PASS** ou **FAIL**.

Tu es en lecture seule : tu ne modifies aucun fichier. Contexte : $ARGUMENTS
