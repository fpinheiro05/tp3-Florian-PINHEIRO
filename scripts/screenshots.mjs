// Génère les captures d'écran du jeu dans docs/screenshots (preuves pour le TP3).
// Usage : npm run screenshots  (après `npm run build`)
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "docs", "screenshots");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

async function ensureDist() {
  try {
    await stat(join(DIST, "index.html"));
  } catch {
    throw new Error("dist/ introuvable : lancez `npm run build` d'abord.");
  }
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = url === "/" ? "/index.html" : url;
      const file = join(DIST, rel);
      const data = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function renderVerifyCard(browser, text) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const html = `<!doctype html><html><body style="margin:0;background:#05070d;font-family:Consolas,monospace;color:#d1fae5">
    <div style="padding:28px 36px">
      <div style="color:#38bdf8;font-size:20px;font-weight:700;margin-bottom:14px">npm run verify — le filet au travail</div>
      <pre style="font-size:13px;line-height:1.5;white-space:pre-wrap;background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:20px;color:#bbf7d0">${text
        .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
        .replace(/Ô£ô/g, "OK")
        .replace(/Ôöé/g, "|")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>
    </div></body></html>`;
  await page.setContent(html);
  await page.screenshot({ path: join(OUT, "06-filet-verify.png") });
  await page.close();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderHarnessCard(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const card = (title, items) => {
    const lis = items
      .map((i) => `<li style="margin:4px 0">${i}</li>`)
      .join("");
    return `<div style="background:#0b1220;border:1px solid #1e293b;border-radius:12px;padding:16px 18px">
      <div style="color:#38bdf8;font-weight:700;font-size:15px;margin-bottom:8px">${title}</div>
      <ul style="margin:0;padding-left:18px;color:#cbd5e1;font-size:13.5px;line-height:1.5">${lis}</ul>
    </div>`;
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#05070d;font-family:Segoe UI,system-ui,sans-serif;color:#e2e8f0">
    <div style="padding:26px 36px">
      <div style="font-size:24px;font-weight:800;background:linear-gradient(90deg,#38bdf8,#34d399);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px">
        Le harness OpenCode du projet</div>
      <div style="color:#94a3b8;font-size:13px;margin-bottom:18px">Le projet se construit avec la chaîne, pas à côté d'elle. Tous les droits sont dans opencode.jsonc et .opencode/.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        ${card("Agent principal — game-engineer (primary)", [
          "Édite src/**, tests/**, la config du projet",
          "Shell : npm run *, npx tsc/eslint/vitest ; git status/diff/log",
          "Peut déléguer aux subagents ; commit seulement si le filet est vert",
        ])}
        ${card("Subagents aux droits stricts", [
          "<b>solidity-auditor</b> — édite <i>uniquement</i> src/game/levels.ts ; shell interdit",
          "<b>test-engineer</b> — édite <i>uniquement</i> tests/ ; lance vitest",
          "<b>release-verifier</b> — lecture seule ; lance le filet, rend PASS/FAIL",
        ])}
        ${card("Rules — AGENTS.md", [
          "6 invariants non négociables (moteur pur, 3 indices, 3e = réponse…)",
          "Definition of Done : npm run verify vert avant tout commit",
          "Interdits : git push, rm -rf, éditer dist/",
        ])}
        ${card("Commands — .opencode/commands", [
          "<b>/new-level</b> — ajouter une salle (auditor + tests)",
          "<b>/verify</b> — lancer le filet, verdict PASS/FAIL",
          "<b>/level-check</b> — vérifier la cohérence des salles",
        ])}
        ${card("Skills & Hooks", [
          "<b>skill solidity-audit</b> — catalogue de vulnérabilités + format Level",
          "<b>hook harness-guard</b> — réinjecte les invariants à chaque appel modèle",
          "outil <b>game_verify_gate</b> — lance le filet depuis une session",
        ])}
        ${card("MCP & Filet & CI", [
          "<b>MCP level-guard</b> — outil <b>check_levels</b> (stdio, sans dépendance)",
          "ESLint · TypeScript strict · 28 tests Vitest · build Vite",
          "GitHub Actions : lint · types · tests · build à chaque push",
        ])}
      </div>
    </div></body></html>`;
  await page.setContent(html);
  await page.screenshot({ path: join(OUT, "08-harness.png") });
  await page.close();
}

async function main() {
  await ensureDist();
  await mkdir(OUT, { recursive: true });

  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.error("CONSOLE ERROR:", m.text());
  });

  await page.goto(`${base}/?debug=1`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.screenshot({ path: join(OUT, "01-titre.png") });
  console.log("✓ 01-titre.png");

  await page.evaluate(() => window.__escape?.start());
  await sleep(1500);
  await page.screenshot({ path: join(OUT, "02-labo-hud.png") });
  console.log("✓ 02-labo-hud.png");

  await page.evaluate(() => window.__escape?.openLevel(0));
  await sleep(600);
  await page.screenshot({ path: join(OUT, "03-salle1-audit.png") });
  console.log("✓ 03-salle1-audit.png");

  await page.evaluate(() => {
    window.__escape?.hint();
    window.__escape?.hint();
    window.__escape?.hint();
  });
  await sleep(400);
  await page.evaluate(() => {
    const panel = document.querySelector("#ov-puzzle .panel");
    if (panel) panel.scrollTop = panel.scrollHeight;
  });
  await sleep(300);
  await page.screenshot({ path: join(OUT, "04-salle1-indices.png") });
  console.log("✓ 04-salle1-indices.png");

  // Dernière salle (réentrance) + victoire.
  await page.evaluate(() => window.__escape?.openLevel(2));
  await sleep(500);
  await page.screenshot({ path: join(OUT, "05-salle3-reentrance.png") });
  console.log("✓ 05-salle3-reentrance.png");

  await page.evaluate(() => window.__escape?.solveAll());
  await sleep(800);
  await page.screenshot({ path: join(OUT, "07-victoire.png") });
  console.log("✓ 07-victoire.png");

  // Carte du filet (si le transcript existe).
  try {
    const gate = await readFile(join(ROOT, "docs", "preuves", "verify.txt"), "utf8");
    await renderVerifyCard(browser, gate);
    console.log("✓ 06-filet-verify.png");
  } catch {
    console.warn("· docs/preuves/verify.txt absent — carte du filet ignorée");
  }

  // Carte du harness (agents, droits, hooks, MCP).
  await renderHarnessCard(browser);
  console.log("✓ 08-harness.png");

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log("\nCaptures écrites dans docs/screenshots/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
