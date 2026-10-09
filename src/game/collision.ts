/**
 * Résolution de collision du joueur — logique PURE, sans Three.js ni DOM.
 *
 * Le joueur évolue dans des salles rectangulaires mitoyennes (larges), reliées par
 * des portes percées d'une ouverture étroite, puis un sas de sortie plus étroit.
 * On corrige la position voulue en quatre temps :
 *   1. bornes globales en Z (entrée ↔ fin du sas) ;
 *   2. bornes en X, larges dans les salles, étroites dans le sas ;
 *   3. les pupitres (terminaux) sont infranchissables ;
 *   4. chaque plan-porte bloque le franchissement tant qu'elle est fermée, et
 *      canalise le passage par l'ouverture quand elle est ouverte.
 *
 * Ne lève jamais : toute valeur non finie retombe sur une valeur sûre.
 */

export interface CollisionDoor {
  /** Position Z du plan de la porte. */
  z: number;
  /** Porte ouverte : on peut la franchir par l'ouverture. */
  open: boolean;
}

export interface CollisionInput {
  /** Position voulue par le déplacement. */
  x: number;
  z: number;
  /** Position Z au début de la frame (pour savoir de quel côté on vient). */
  prevZ: number;
  /** Centres Z des salles (l'axe du couloir). */
  roomCenterZs: number[];
  /** Limite Z de la première salle (mur d'entrée). */
  frontZ: number;
  /** Z du premier plan de porte (début du sas de sortie). */
  exitStartZ: number;
  /** Z de fin du sas de sortie. */
  exitEndZ: number;
  /** Demi-largeur jouable dans une salle. */
  halfWidth: number;
  /** Demi-largeur jouable dans le sas. */
  exitHalfWidth: number;
  /** Demi-emprise d'un pupitre. */
  terminalHalf: number;
  /** Demi-largeur franchissable d'une ouverture de porte. */
  doorOpenHalf: number;
  /** Épaisseur de collision d'un plan-mur. */
  wallBand: number;
  /** Plans-portes, dans l'ordre des salles. */
  doors: CollisionDoor[];
}

const fin = (n: number, fallback: number): number => (Number.isFinite(n) ? n : fallback);
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function resolveCollision(input: CollisionInput): { x: number; z: number } {
  let x = fin(input.x, 0);
  let z = fin(input.z, fin(input.prevZ, 0));
  const prevZ = fin(input.prevZ, z);

  // 1) Bornes globales en Z.
  z = clamp(z, input.exitEndZ, input.frontZ);

  // 2) Bornes en X selon la zone (salles larges, sas étroit).
  const inExit = z < input.exitStartZ - input.wallBand;
  const halfX = inExit ? input.exitHalfWidth : input.halfWidth;
  x = clamp(x, -halfX, halfX);

  // 3) Pupitres infranchissables : on sort par la plus petite pénétration.
  for (const cz of input.roomCenterZs) {
    const dz = z - cz;
    if (Math.abs(x) < input.terminalHalf && Math.abs(dz) < input.terminalHalf) {
      const penX = input.terminalHalf - Math.abs(x);
      const penZ = input.terminalHalf - Math.abs(dz);
      if (penX < penZ) x = (x >= 0 ? 1 : -1) * input.terminalHalf;
      else z = cz + (dz >= 0 ? 1 : -1) * input.terminalHalf;
    }
  }

  // 4) Plans-portes : on bloque le franchissement (même en un grand pas) tant que
  //    la porte est fermée ou qu'on n'est pas dans l'ouverture.
  for (const d of input.doors) {
    const crossed = (prevZ - d.z) * (z - d.z) <= 0;
    const near = Math.abs(z - d.z) < input.wallBand;
    if (!crossed && !near) continue;
    const inOpening = Math.abs(x) <= input.doorOpenHalf;
    if (d.open && inOpening) {
      if (near) x = clamp(x, -input.doorOpenHalf, input.doorOpenHalf);
    } else {
      const side = prevZ >= d.z ? 1 : -1;
      z = d.z + side * input.wallBand;
    }
  }

  return { x, z };
}
