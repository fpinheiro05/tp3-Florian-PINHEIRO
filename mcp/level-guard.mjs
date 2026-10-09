#!/usr/bin/env node
/**
 * MCP server minimal (stdio, JSON-RPC 2.0) — `level-guard`.
 *
 * Expose l'outil `check_levels` qui relit `src/game/levels.ts` et vérifie les invariants
 * de chaque salle (bugLines dans les bornes, 3 indices, 3e = réponse, index consécutifs…).
 * Aucune dépendance : transport stdio délimité par saut de ligne.
 *
 * Lancement : node mcp/level-guard.mjs   (déclaré dans opencode.jsonc)
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVELS_PATH = join(__dirname, "..", "src", "game", "levels.ts");

const TOOLS = [
  {
    name: "check_levels",
    description:
      "Vérifie les invariants de toutes les salles de src/game/levels.ts (cohérence bugLines/code, 3 indices dont le 3e = réponse, index consécutifs). Renvoie un rapport texte.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

/** Extrait le contenu équilibré `[...]`/`{...}` à partir de `start`, en ignorant les chaînes. */
function extractBalanced(text, start, open, close) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Découpe une liste `a, b, c` au niveau supérieur (virgules hors chaînes/parenthèses/crochets). */
function splitTopLevel(inner) {
  const parts = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      cur += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      cur += c;
      continue;
    }
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) depth--;
    if (c === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim() !== "") parts.push(cur.trim());
  return parts;
}

function unquote(s) {
  const m = /^"([\s\S]*)"$/.exec(s.trim());
  if (!m) return null;
  return m[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function fieldSpan(body, field) {
  const re = new RegExp(`\\b${field}\\s*:\\s*`, "m");
  const m = re.exec(body);
  if (!m) return null;
  const start = m.index + m[0].length;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (c === "[") return extractBalanced(body, i, "[", "]");
    if (c === "{" ) return extractBalanced(body, i, "{", "}");
    if (c === '"') return extractBalanced(body, i, '"', '"');
    if (i - start > 40) return null;
  }
  return null;
}

function parseLevels(source) {
  const startMarker = "export const LEVELS: Level[] = [";
  const start = source.indexOf(startMarker);
  if (start === -1) return [];
  const body = extractBalanced(source, start + startMarker.length - 1, "[", "]");
  if (body === null) return [];
  const inner = body.slice(1, -1);

  const objects = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let objStart = -1;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        objects.push(inner.slice(objStart, i + 1));
        objStart = -1;
      }
    }
  }

  return objects.map((o) => {
    const id = /id:\s*"([^"]+)"/.exec(o)?.[1] ?? "?";
    const index = Number(/index:\s*(\d+)/.exec(o)?.[1] ?? NaN);
    const basePoints = Number(/basePoints:\s*(\d+)/.exec(o)?.[1] ?? NaN);
    const codeSpan = fieldSpan(o, "code");
    const bugSpan = fieldSpan(o, "bugLines");
    const hintsSpan = fieldSpan(o, "hints");
    const code = codeSpan ? splitTopLevel(codeSpan.slice(1, -1)).map((s) => unquote(s) ?? "") : [];
    const bugLines = bugSpan
      ? splitTopLevel(bugSpan.slice(1, -1))
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n))
      : [];
    const hints = hintsSpan ? splitTopLevel(hintsSpan.slice(1, -1)) : [];
    const hasResponse = hints.some((h) => h.includes("RÉPONSE")) || /\bhint3\s*\(/.test(o);
    return { id, index, basePoints, codeLines: code.length, bugLines, hints: hints.length, hasResponse };
  });
}

async function runChecks() {
  let source;
  try {
    source = await readFile(LEVELS_PATH, "utf8");
  } catch (e) {
    return `ERREUR: impossible de lire levels.ts: ${e.message}`;
  }
  const levels = parseLevels(source);
  if (levels.length === 0) return "ERREUR: aucun niveau détecté (format inattendu).";

  const lines = [];
  let fail = 0;
  const ids = new Set();
  levels.forEach((l, i) => {
    const errs = [];
    if (ids.has(l.id)) errs.push("id dupliqué");
    ids.add(l.id);
    if (l.index !== i) errs.push(`index=${l.index} attendu ${i}`);
    if (!(l.codeLines > 5)) errs.push(`code trop court (${l.codeLines})`);
    if (l.bugLines.length < 1) errs.push("bugLines vide");
    for (const b of l.bugLines) {
      if (b < 1 || b > l.codeLines) errs.push(`bugLine ${b} hors bornes [1..${l.codeLines}]`);
    }
    if (l.hints !== 3) errs.push(`${l.hints} indice(s) au lieu de 3`);
    if (!l.hasResponse) errs.push("le 3e indice ne contient pas la réponse");
    if (!(l.basePoints > 0)) errs.push("basePoints <= 0");
    if (errs.length) {
      fail++;
      lines.push(`✗ ${l.id} — ${errs.join(" ; ")}`);
    } else {
      lines.push(`✓ ${l.id} (${l.codeLines} lignes, bugs: [${l.bugLines.join(", ")}])`);
    }
  });

  const head = `${levels.length} niveau(x) analysé(s) — ${fail === 0 ? "PASS" : `FAIL (${fail})`}`;
  return `${head}\n${lines.join("\n")}`;
}

// --- Transport stdio JSON-RPC ---
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  const t = line.trim();
  if (!t) return;
  let req;
  try {
    req = JSON.parse(t);
  } catch {
    return;
  }
  const { id, method, params } = req;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "level-guard", version: "1.0.0" },
      },
    });
    return;
  }
  if (method === "notifications/initialized") return;
  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }
  if (method === "tools/call") {
    if (params?.name !== "check_levels") {
      send({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: `Outil inconnu: ${params?.name}` }] } });
      return;
    }
    const text = await runChecks();
    send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
    return;
  }
  if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Méthode inconnue: ${method}` } });
  }
});
