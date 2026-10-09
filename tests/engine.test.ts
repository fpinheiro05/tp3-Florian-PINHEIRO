import { describe, expect, it } from "vitest";
import {
  checkAttempt,
  emptyProgress,
  isGameComplete,
  isLevelSolved,
  normalizeSelection,
  scoreForLevel,
  solvedCount,
  totalScore,
  WRONG_ATTEMPT_PENALTY,
} from "../src/game/engine";
import { LEVELS, getLevel, totalBasePoints, type Level } from "../src/game/levels";
import { highlightSolidity, escapeHtml } from "../src/game/highlight";

describe("levels", () => {
  it("expose 3 salles indexées de 0 à 2", () => {
    expect(LEVELS).toHaveLength(3);
    LEVELS.forEach((l, i) => expect(l.index).toBe(i));
  });

  it("chaque niveau a 3 indices, une mission, un bug et des lignes valides", () => {
    for (const l of LEVELS) {
      expect(l.hints).toHaveLength(3);
      expect(l.mission.length).toBeGreaterThan(10);
      expect(l.description.length).toBeGreaterThan(10);
      expect(l.code.length).toBeGreaterThan(5);
      expect(l.bugLines.length).toBeGreaterThanOrEqual(1);
      for (const b of l.bugLines) {
        expect(b).toBeGreaterThanOrEqual(1);
        expect(b).toBeLessThanOrEqual(l.code.length);
      }
    }
  });

  it("le 3e indice contient la réponse (mot RÉPONSE)", () => {
    for (const l of LEVELS) {
      expect(l.hints[2]).toContain("RÉPONSE");
    }
  });

  it("les identifiants sont uniques", () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getLevel retrouve par id et totalBasePoints = somme", () => {
    expect(getLevel("reentrancy")?.id).toBe("reentrancy");
    expect(getLevel("zombie-factory")?.id).toBe("zombie-factory");
    expect(getLevel("inconnu")).toBeUndefined();
    expect(totalBasePoints()).toBe(LEVELS.reduce((s, l) => s + l.basePoints, 0));
  });
});

describe("normalizeSelection", () => {
  it("déduplique, trie et filtre les valeurs invalides", () => {
    expect(normalizeSelection([3, 1, 1, 2], 10)).toEqual([1, 2, 3]);
    expect(normalizeSelection([0, 11, -2], 10)).toEqual([]);
    expect(normalizeSelection(["4", "5"], 10)).toEqual([4, 5]);
    expect(normalizeSelection(null, 10)).toEqual([]);
    expect(normalizeSelection([1.5, 2], 10)).toEqual([2]);
  });

  it("tolère un codeLength absurde sans lever", () => {
    expect(() => normalizeSelection([1], NaN)).not.toThrow();
    expect(normalizeSelection([1], NaN)).toEqual([]);
  });
});

describe("checkAttempt", () => {
  const single = getLevel("zombie-factory")!; // bugLines [15]

  it("réussit uniquement si la bonne ligne est trouvée, sans faux positif", () => {
    expect(checkAttempt(single, [15]).success).toBe(true);
    expect(checkAttempt(single, [14]).success).toBe(false);
    expect(checkAttempt(single, [15, 3]).success).toBe(false);
    expect(checkAttempt(single, []).success).toBe(false);
  });

  it("rapporte corrects, faux positifs et manquants", () => {
    const r = checkAttempt(single, [14]);
    expect(r.found).toBe(0);
    expect(r.total).toBe(1);
    expect(r.falsePositives).toEqual([14]);
    expect(r.missing).toEqual([15]);
  });

  it("gère un niveau à plusieurs bugs (synthétique)", () => {
    const multi: Level = {
      ...single,
      code: Array.from({ length: 20 }, (_v, i) => `ligne ${i + 1}`),
      bugLines: [3, 12],
    };
    expect(checkAttempt(multi, [3, 12]).success).toBe(true);
    expect(checkAttempt(multi, [12, 3]).success).toBe(true);
    const r = checkAttempt(multi, [3, 99]);
    expect(r.correctPicked).toEqual([3]);
    expect(r.falsePositives).toEqual([]); // 99 hors bornes
    expect(r.missing).toEqual([12]);
  });
});

describe("scoreForLevel", () => {
  const level = getLevel("zombie-factory")!; // basePoints 1000

  it("applique les pénalités d'indices puis les échecs", () => {
    expect(scoreForLevel(level, 0, 0)).toBe(level.basePoints);
    expect(scoreForLevel(level, 1, 0)).toBe(level.basePoints - 150);
    expect(scoreForLevel(level, 3, 0)).toBe(Math.max(100, level.basePoints - 900));
    expect(scoreForLevel(level, 0, 2)).toBe(level.basePoints - 2 * WRONG_ATTEMPT_PENALTY);
  });

  it("a un plancher de 100", () => {
    expect(scoreForLevel(level, 3, 999)).toBe(100);
  });
});

describe("progress", () => {
  it("détecte l'avancement et la complétion", () => {
    const p = emptyProgress();
    expect(solvedCount(p)).toBe(0);
    expect(isGameComplete(p)).toBe(false);
    expect(isLevelSolved(p, "reentrancy")).toBe(false);

    for (const l of LEVELS) p.solved[l.id] = { hintsUsed: 0, wrongAttempts: 0, score: l.basePoints, timeMs: 1000 };
    expect(solvedCount(p)).toBe(3);
    expect(isGameComplete(p)).toBe(true);
    expect(totalScore(p)).toBe(totalBasePoints());
  });
});

describe("highlight", () => {
  it("échappe le HTML", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("colore les mots-clés et commentaires", () => {
    const html = highlightSolidity("function withdraw() external { // test");
    expect(html).toContain("tok-kw");
    expect(html).toContain("tok-com");
  });

  it("gère une ligne vide", () => {
    expect(highlightSolidity("")).toBe("");
  });
});
