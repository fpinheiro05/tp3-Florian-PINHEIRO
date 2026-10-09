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
import { LEVELS, getLevel, totalBasePoints } from "../src/game/levels";
import { highlightSolidity, escapeHtml } from "../src/game/highlight";

describe("levels", () => {
  it("expose 5 salles indexées de 0 à 4", () => {
    expect(LEVELS).toHaveLength(5);
    LEVELS.forEach((l, i) => expect(l.index).toBe(i));
  });

  it("chaque niveau a 3 indices, un bug au moins et des lignes valides", () => {
    for (const l of LEVELS) {
      expect(l.hints).toHaveLength(3);
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

  it("getLevel retrouve par id et totalBasePoints = somme", () => {
    expect(getLevel("reentrancy")?.id).toBe("reentrancy");
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
  const level = getLevel("access-control")!; // bugLines [12, 16]

  it("réussit uniquement si toutes les lignes buguées sont trouvées sans faux positif", () => {
    expect(checkAttempt(level, [12, 16]).success).toBe(true);
    expect(checkAttempt(level, [16, 12]).success).toBe(true);
    expect(checkAttempt(level, [12]).success).toBe(false);
    expect(checkAttempt(level, [12, 16, 3]).success).toBe(false);
    expect(checkAttempt(level, []).success).toBe(false);
  });

  it("rapporte corrects, faux positifs et manquants", () => {
    const r = checkAttempt(level, [12, 99]);
    expect(r.correctPicked).toEqual([12]);
    expect(r.falsePositives).toEqual([]); // 99 hors bornes
    expect(r.missing).toEqual([16]);
    expect(r.found).toBe(1);
    expect(r.total).toBe(2);

    const r2 = checkAttempt(level, [3, 4]);
    expect(r2.falsePositives).toEqual([3, 4]);
    expect(r2.missing).toEqual([12, 16]);
  });

  it("gère un niveau à une seule ligne", () => {
    const one = getLevel("reentrancy")!;
    expect(checkAttempt(one, [13]).success).toBe(true);
    expect(checkAttempt(one, [14]).success).toBe(false);
  });
});

describe("scoreForLevel", () => {
  const level = getLevel("access-control")!;

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
    expect(solvedCount(p)).toBe(5);
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
