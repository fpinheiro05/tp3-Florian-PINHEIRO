/**
 * Hook de garde du projet (TP3) — plugin OpenCode V2.
 *
 * - `session.hook("context")` réinjecte les invariants du dépôt dans chaque appel modèle,
 *   pour que la règle reste présente même après compaction du contexte.
 * - Un outil `verify_gate` permet à un agent de lancer le filet et d'en recevoir le verdict.
 *
 * Le plugin ne modifie rien : il observe et outille. On utilise l'export d'objet V2
 * (id + setup) sans dépendre de `@opencode/plugin`, résolu par le runtime.
 */
export default {
  id: "harness-guard",
  async setup(ctx) {
    // 1) Rappel d'invariants avant chaque appel modèle (survit à la compaction).
    await ctx.session.hook("context", (event) => {
      event.system.push({
        type: "text",
        text: [
          "RAPPEL PROJET (Solidity Escape 3D) :",
          "- Le moteur src/game/engine.ts reste pur (aucun DOM, aucun Three.js) et ne lève jamais.",
          "- La donnée des niveaux vit uniquement dans src/game/levels.ts ; chaque niveau a 3 indices",
          "  et le 3e commence par 'RÉPONSE —'.",
          "- Toute logique nouvelle arrive avec ses tests dans tests/.",
          "- Avant de conclure ou committer : `npm run verify` doit être vert.",
          "Voir AGENTS.md pour les invariants complets.",
        ].join("\n"),
      });
    });

    // 2) Outil : lancer le filet depuis une session.
    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "game",
        description: "Outils du projet Solidity Escape 3D",
      });
      editor.add({
        name: "verify_gate",
        description:
          "Lance le filet du projet (lint + types + tests + build) et renvoie PASS/FAIL avec la sortie.",
        input: {
          type: "object",
          properties: {
            full: {
              type: "boolean",
              description: "true pour `npm run verify` complet, false pour `npm run test` seulement.",
            },
          },
          required: [],
          additionalProperties: false,
        },
        options: { namespace: "game", codemode: true },
        execute: async (input) => {
          const full = (input as { full?: boolean }).full === true;
          const { spawn } = await import("node:child_process");
          const command = full ? "npm run verify" : "npm run test";
          const output = await new Promise<string>((resolve) => {
            const child = spawn(command, {
              shell: true,
              cwd: ctx.location.directory,
            });
            let buf = "";
            child.stdout.on("data", (d: Buffer) => (buf += d.toString()));
            child.stderr.on("data", (d: Buffer) => (buf += d.toString()));
            child.on("error", (e) => resolve(`ERREUR: ${e.message}`));
            child.on("close", (code) =>
              resolve(`$ ${command}\n(exit ${code})\n\n${buf}`.slice(-6000)),
            );
          });
          const pass = /\(exit 0\)/.test(output);
          return { content: `${pass ? "PASS" : "FAIL"}\n\n${output}` };
        },
      });
    });
  },
};
