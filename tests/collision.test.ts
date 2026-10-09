import { describe, expect, it } from "vitest";
import { resolveCollision, type CollisionInput } from "../src/game/collision";

/** Agencement de test : 3 salles de 20 de profondeur + sas de sortie de 11. */
function layout(overrides: Partial<CollisionInput> = {}): CollisionInput {
  return {
    x: 0,
    z: 0,
    prevZ: 0,
    roomCenterZs: [0, -20, -40],
    frontZ: 9.4,
    exitStartZ: -50,
    exitEndZ: -60.4,
    halfWidth: 7.4,
    exitHalfWidth: 1.9,
    terminalHalf: 0.95,
    doorOpenHalf: 2.3,
    wallBand: 0.7,
    doors: [
      { z: -10, open: false },
      { z: -30, open: false },
      { z: -50, open: false },
    ],
    ...overrides,
  };
}

describe("resolveCollision — bornes", () => {
  it("garde le joueur dans la largeur des salles", () => {
    expect(resolveCollision(layout({ x: 100, z: 5, prevZ: 5 })).x).toBe(7.4);
    expect(resolveCollision(layout({ x: -100, z: 5, prevZ: 5 })).x).toBe(-7.4);
  });

  it("ne sort pas par le mur d'entrée ni par la fin du sas", () => {
    expect(resolveCollision(layout({ z: 100, prevZ: 5 })).z).toBe(9.4);
    expect(resolveCollision(layout({ z: -100, prevZ: -55, doors: [] })).z).toBe(-60.4);
  });

  it("resserre la largeur dans le sas de sortie", () => {
    const r = resolveCollision(layout({ x: 100, z: -55, prevZ: -55, doors: [] }));
    expect(r.x).toBe(1.9);
  });
});

describe("resolveCollision — pupitres", () => {
  it("empêche de traverser le terminal au centre de la salle", () => {
    const r = resolveCollision(layout({ x: 0.2, z: -20, prevZ: -20 }));
    const dToCenter = Math.hypot(r.x - 0, r.z - -20);
    expect(dToCenter).toBeGreaterThanOrEqual(0.95);
  });

  it("laisse passer à côté du pupitre", () => {
    const r = resolveCollision(layout({ x: 3, z: -20, prevZ: -20 }));
    expect(r.x).toBe(3);
    expect(r.z).toBe(-20);
  });
});

describe("resolveCollision — portes", () => {
  it("bloque une porte fermée (petit pas)", () => {
    const r = resolveCollision(layout({ x: 0, z: -10.5, prevZ: -9 }));
    expect(r.z).toBeCloseTo(-9.3, 6);
  });

  it("bloque une porte fermée même en un très grand pas (pas de saut)", () => {
    const r = resolveCollision(layout({ x: 0, z: -200, prevZ: 5 }));
    expect(r.z).toBeCloseTo(-9.3, 6);
  });

  it("laisse franchir une porte ouverte par l'ouverture", () => {
    const r = resolveCollision(
      layout({ x: 0, z: -12, prevZ: -8, doors: [{ z: -10, open: true }] }),
    );
    expect(r.z).toBe(-12);
    expect(r.x).toBe(0);
  });

  it("conserve x dans l'ouverture quand la porte est ouverte", () => {
    const r = resolveCollision(
      layout({ x: 1.5, z: -12, prevZ: -8, doors: [{ z: -10, open: true }] }),
    );
    expect(r.z).toBe(-12);
    expect(r.x).toBe(1.5);
  });

  it("bloque une porte ouverte si l'on n'est pas dans l'ouverture", () => {
    const r = resolveCollision(
      layout({ x: 5, z: -20, prevZ: -5, doors: [{ z: -10, open: true }] }),
    );
    expect(r.z).toBeCloseTo(-9.3, 6);
  });
});

describe("resolveCollision — robustesse", () => {
  it("ne lève jamais et retombe sur des valeurs sûres avec NaN/Infinity", () => {
    const r = resolveCollision(layout({ x: NaN, z: Infinity, prevZ: -Infinity }));
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.z)).toBe(true);
  });

  it("accepte une liste de salles vide", () => {
    const r = resolveCollision(layout({ roomCenterZs: [], doors: [] }));
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.z)).toBe(true);
  });
});
