import { LEVELS, type Level } from "./levels";

/** Pénalités fixes par indice demandé (indice 3 = réponse, très pénalisé). */
export const HINT_PENALTIES = [150, 250, 500] as const;
export const WRONG_ATTEMPT_PENALTY = 50;
export const MAX_WRONG_DISPLAY = 999;

export interface AttemptResult {
  /** true si la sélection correspond exactement aux lignes buguées. */
  success: boolean;
  /** Nombre de bonnes lignes trouvées. */
  found: number;
  /** Nombre total de bugs dans le niveau. */
  total: number;
  /** Lignes correctes parmi la sélection (triées). */
  correctPicked: number[];
  /** Lignes sélectionnées qui ne sont pas des bugs. */
  falsePositives: number[];
  /** Lignes buguées manquantes. */
  missing: number[];
}

/**
 * Normalise une sélection brute (clics UI, entrées clavier, localStorage corrompu…)
 * en liste de numéros de lignes valides, dédupliqués et triés.
 * Ne lève JAMAIS : les valeurs absurdes sont ignorées (solidité demandée au TP3).
 */
export function normalizeSelection(input: unknown, codeLength: number): number[] {
  if (!Array.isArray(input)) return [];
  const safeLen = Number.isFinite(codeLength) && codeLength > 0 ? Math.floor(codeLength) : 0;
  const set = new Set<number>();
  for (const raw of input) {
    const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : (raw as number);
    if (!Number.isInteger(n)) continue;
    if (n < 1 || n > safeLen) continue;
    set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function checkAttempt(level: Level, selection: unknown): AttemptResult {
  const picked = normalizeSelection(selection, level.code.length);
  const target = [...level.bugLines].sort((a, b) => a - b);
  const pickedSet = new Set(picked);
  const targetSet = new Set(target);
  const correctPicked = picked.filter((n) => targetSet.has(n));
  const falsePositives = picked.filter((n) => !targetSet.has(n));
  const missing = target.filter((n) => !pickedSet.has(n));
  return {
    success: correctPicked.length === target.length && falsePositives.length === 0,
    found: correctPicked.length,
    total: target.length,
    correctPicked,
    falsePositives,
    missing,
  };
}

/** Score d'un niveau : base − pénalités indices − 50€/échec, plancher 100 si réussi. */
export function scoreForLevel(level: Level, hintsUsed: number, wrongAttempts: number): number {
  const h = Math.max(0, Math.min(3, Math.floor(hintsUsed) || 0));
  const w = Math.max(0, Math.floor(wrongAttempts) || 0);
  let penalty = 0;
  for (let i = 0; i < h; i++) penalty += HINT_PENALTIES[i] ?? 0;
  penalty += w * WRONG_ATTEMPT_PENALTY;
  return Math.max(100, level.basePoints - penalty);
}

export interface GameProgress {
  solved: Record<string, { hintsUsed: number; wrongAttempts: number; score: number; timeMs: number }>;
  startedAt: number;
}

export function emptyProgress(now = Date.now()): GameProgress {
  return { solved: {}, startedAt: now };
}

export function isLevelSolved(progress: GameProgress, levelId: string): boolean {
  return Object.prototype.hasOwnProperty.call(progress.solved, levelId);
}

export function solvedCount(progress: GameProgress): number {
  return Object.keys(progress.solved).length;
}

export function totalScore(progress: GameProgress): number {
  return Object.values(progress.solved).reduce((s, r) => s + r.score, 0);
}

export function isGameComplete(progress: GameProgress): boolean {
  return LEVELS.every((l) => isLevelSolved(progress, l.id));
}

const STORAGE_KEY = "solidity-escape-3d-progress-v1";

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<GameProgress>;
    if (typeof parsed !== "object" || parsed === null) return emptyProgress();
    const solved: GameProgress["solved"] = {};
    const src = (parsed.solved ?? {}) as Record<string, unknown>;
    for (const level of LEVELS) {
      const entry = src[level.id];
      if (typeof entry === "object" && entry !== null) {
        const e = entry as Record<string, unknown>;
        solved[level.id] = {
          hintsUsed: Math.max(0, Math.min(3, Math.floor(Number(e["hintsUsed"]) || 0))),
          wrongAttempts: Math.max(0, Math.min(MAX_WRONG_DISPLAY, Math.floor(Number(e["wrongAttempts"]) || 0))),
          score: Math.max(0, Math.floor(Number(e["score"]) || 0)),
          timeMs: Math.max(0, Math.floor(Number(e["timeMs"]) || 0)),
        };
      }
    }
    const startedAt = Number(parsed.startedAt);
    return { solved, startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : Date.now() };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: GameProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // stockage indisponible (navigation privée…) : le jeu reste jouable en mémoire.
  }
}

export function clearProgress(): GameProgress {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return emptyProgress();
}
