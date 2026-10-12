/** Pac-Man's 1980 arcade scoring, for the chase along the pan. */

export type ChaseKind = "dot" | "power" | "cherry" | "ghost";

const DOT_POINTS = 10;
const POWER_POINTS = 50;
/** The level 1 bonus fruit. */
export const CHERRY_POINTS = 100;
/** Each ghost eaten on one power pellet doubles the last. */
export const GHOST_CHAIN = [200, 400, 800, 1600] as const;

/** Points for eating `kind`; ghosts pay by their place in the chain. */
export function pointsFor(kind: ChaseKind, chainIndex = 0): number {
  switch (kind) {
    case "dot":
      return DOT_POINTS;
    case "power":
      return POWER_POINTS;
    case "cherry":
      return CHERRY_POINTS;
    case "ghost":
      return GHOST_CHAIN[
        Math.min(Math.max(chainIndex, 0), GHOST_CHAIN.length - 1)
      ];
    default:
      return 0;
  }
}
