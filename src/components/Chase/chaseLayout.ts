/**
 * Lays the Pac-Man chase along the sound toggle's crossing, and plays it as
 * the pan moves. Positions are shares of the crossing in eased pan progress
 * (where Pac-Man is), so the overlay lines up at any viewport width.
 */

import type { ChaseKind } from "./chaseScore.ts";

export type GhostName = "binky" | "pinky" | "inky" | "clyde";

export type ChaseItem = {
  id: string;
  kind: ChaseKind;
  /** Share of the crossing, from 0 to 1. */
  at: number;
  ghost?: GhostName;
};

export type ItemState =
  "ready" | "eaten" | "roaming" | "frightened" | "flickering";

/** A stretch of the crossing, as shares from 0 to 1. */
type Span = { low: number; high: number };

/** What Pac-Man has eaten since he last set off from the speaker's corner. */
export type Pass = {
  isPowered: boolean;
  eaten: ReadonlySet<string>;
  /** Ghosts eaten on the power pellet, for the doubling chain. */
  chain: number;
  /**
   * Where his centre has been. Dots are always edible, so the dots eaten are
   * exactly those within his mouth's reach of it, at any layout.
   */
  swept: Span | null;
};

/** Shares of the crossing, from the toggle's measured sizes. */
export type ChaseMetrics = {
  /** How far ahead of Pac-Man's centre his mouth reaches. */
  lead: number;
  /**
   * How close he gets, as a share of the crossing, before a frightened ghost
   * starts to flicker.
   */
  flicker: number;
};

export type Meal = { item: ChaseItem; chainIndex: number };

// In toggle pixels (a twelfth of its icon): Pac-Man is 10 across.
const PACMAN_HALF = 5;
const DOT_SPACING = 6;
const GHOST_HALF = 5;
// Share of the crossing. A few pixels of warning vanishes in one scroll tick,
// so the blue/white pulse starts while he is still closing in.
const FLICKER_SPAN = 0.18;
const CLEARANCE: Record<Exclude<ChaseKind, "dot">, number> = {
  power: 2 + DOT_SPACING / 2,
  cherry: 5 + DOT_SPACING / 2,
  ghost: GHOST_HALF + DOT_SPACING / 2,
};

const POWER_AT = 0.06;
export const CHERRY_AT = 0.5;
export const GHOST_SLOTS: readonly (readonly [GhostName, number])[] = [
  ["binky", 0.12],
  ["pinky", 0.26],
  ["inky", 0.74],
  ["clyde", 0.88],
];

function place(
  id: string,
  kind: ChaseKind,
  at: number,
  ghost?: GhostName,
): ChaseItem {
  return { id, kind, at, ...(ghost && { ghost }) };
}

/**
 * The route, left to right: dots, a power pellet, Binky, Pinky, the cherry
 * halfway, Inky, Clyde, and closing dots. Every ghost shows at any width; only
 * the dots thin out.
 */
export function layoutChase(crossPx: number, pixelPx: number): ChaseItem[] {
  const specials: ChaseItem[] = [
    place("power", "power", POWER_AT),
    ...GHOST_SLOTS.map(([name, at]) => place(name, "ghost", at, name)),
    place("cherry", "cherry", CHERRY_AT),
  ];
  if (crossPx <= 0 || pixelPx <= 0) {
    return specials;
  }

  const share = (pixels: number) => (pixels * pixelPx) / crossPx;
  const step = share(DOT_SPACING);
  const first = share(PACMAN_HALF + DOT_SPACING);
  const last = 1 - share(PACMAN_HALF + DOT_SPACING);
  const isClear = (at: number) =>
    specials.every(
      (special) =>
        Math.abs(at - special.at) >=
        share(CLEARANCE[special.kind as Exclude<ChaseKind, "dot">]),
    );

  const dots: ChaseItem[] = [];
  for (let at = first; at <= last; at += step) {
    if (isClear(at)) {
      dots.push(place(`dot-${dots.length}`, "dot", at));
    }
  }
  return [...dots, ...specials].sort((a, b) => a.at - b.at);
}

export function chaseMetrics(crossPx: number, pixelPx: number): ChaseMetrics {
  return crossPx > 0
    ? {
        lead: (PACMAN_HALF * pixelPx) / crossPx,
        flicker: Math.max(
          (GHOST_HALF * 2 * 1.5 * pixelPx) / crossPx,
          FLICKER_SPAN,
        ),
      }
    : { lead: 0, flicker: 0 };
}

export const freshPass = (): Pass => ({
  isPowered: false,
  eaten: new Set(),
  chain: 0,
  swept: null,
});

/**
 * The same pass on a new layout. Dots are numbered by position, so which of
 * them are eaten comes from where Pac-Man has been; everything else keeps its
 * id at every width.
 */
export function carryPass(
  pass: Pass,
  items: readonly ChaseItem[],
  { lead }: ChaseMetrics,
): Pass {
  const { swept } = pass;
  const isSwept = (at: number) =>
    swept !== null && at >= swept.low - lead && at <= swept.high + lead;
  const eaten = items
    .filter((item) =>
      item.kind === "dot" ? isSwept(item.at) : pass.eaten.has(item.id),
    )
    .map((item) => item.id);
  return { ...pass, eaten: new Set(eaten) };
}

/**
 * Refills the route only when Pac-Man sets off from the speaker's corner, at
 * the start of the crossing. Turning back mid-crossing, or crossing back from
 * the far side, keeps what he has eaten, so a cleared route stays empty.
 */
export function passFor(pass: Pass, from: number, to: number): Pass {
  return from <= 0 && to > 0 && pass.swept !== null ? freshPass() : pass;
}

/**
 * Eats whatever Pac-Man's mouth passed over moving from `from` to `to`, in
 * the order he met it. Ghosts are only edible once he's had the power pellet.
 */
export function advance(
  items: readonly ChaseItem[],
  pass: Pass,
  from: number,
  to: number,
  { lead }: ChaseMetrics,
): { pass: Pass; meals: Meal[] } {
  const low = Math.min(from, to) - lead;
  const high = Math.max(from, to) + lead;
  const route = to >= from ? items : [...items].reverse();
  const eaten = new Set(pass.eaten);
  let { isPowered, chain } = pass;
  const swept = {
    low: Math.min(from, to, pass.swept?.low ?? Infinity),
    high: Math.max(from, to, pass.swept?.high ?? -Infinity),
  };
  const meals: Meal[] = [];

  route.forEach((item) => {
    if (eaten.has(item.id) || item.at < low || item.at > high) {
      return;
    }
    if (item.kind === "ghost") {
      if (!isPowered) {
        return;
      }
      meals.push({ item, chainIndex: chain });
      chain += 1;
    } else {
      if (item.kind === "power") {
        isPowered = true;
      }
      meals.push({ item, chainIndex: 0 });
    }
    eaten.add(item.id);
  });

  return { pass: { isPowered, eaten, chain, swept }, meals };
}

/** How `item` should look with Pac-Man at `at` on `pass`. */
export function stateOf(
  item: ChaseItem,
  pass: Pass,
  at: number,
  { flicker }: ChaseMetrics,
): ItemState {
  if (pass.eaten.has(item.id)) {
    return "eaten";
  }
  if (item.kind !== "ghost") {
    return "ready";
  }
  if (!pass.isPowered) {
    return "roaming";
  }
  return Math.abs(item.at - at) <= flicker ? "flickering" : "frightened";
}
