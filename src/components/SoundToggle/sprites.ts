/**
 * Pixel art for the sound toggle, and the plan for morphing its speaker into
 * Pac-Man: every Pac-Man pixel flies out of one of the speaker's pixels.
 * Both drawings share the toggle's 12 by 10 grid.
 */

export type Pixel = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
];

export type Cell = { x: number; y: number };

export type MorphCell = Cell & {
  /** Offset back to the speaker pixel this cell flies out of. */
  fromX: number;
  fromY: number;
  /** Share of the morph's stagger to wait, from 0 to 1. */
  delay: number;
  /** Part of the wedge Pac-Man's mouth opens. */
  isMouth: boolean;
};

export const SPEAKER: readonly Pixel[] = [
  [1, 3, 3, 4],
  [4, 2, 1, 6],
  [5, 1, 1, 8],
  [6, 0, 1, 10],
];
export const WAVE_NEAR: readonly Pixel[] = [
  [8, 3, 1, 1],
  [9, 4, 1, 2],
  [8, 6, 1, 1],
];
export const WAVE_FAR: readonly Pixel[] = [
  [10, 1, 1, 1],
  [11, 2, 1, 6],
  [10, 8, 1, 1],
];
export const MUTED: readonly Pixel[] = [
  [8, 3, 1, 1],
  [9, 4, 1, 1],
  [10, 5, 1, 1],
  [11, 6, 1, 1],
  [11, 3, 1, 1],
  [10, 4, 1, 1],
  [9, 5, 1, 1],
  [8, 6, 1, 1],
];

// Facing right, mouth shut; `m` marks the wedge the mouth opens.
const PACMAN_ROWS = [
  "....####....",
  "..########..",
  ".########mm.",
  ".######mmmm.",
  ".#####mmmmm.",
  ".#####mmmmm.",
  ".######mmmm.",
  ".########mm.",
  "..########..",
  "....####....",
];

export const PACMAN: readonly (Cell & { isMouth: boolean })[] =
  PACMAN_ROWS.flatMap((row, y) =>
    [...row].flatMap((pixel, x) =>
      pixel === "." ? [] : [{ x, y, isMouth: pixel === "m" }],
    ),
  );

/** Splits rectangles of pixel art into single pixels. */
export function toCells(pixels: readonly Pixel[]): Cell[] {
  return pixels.flatMap(([x, y, width, height]) =>
    Array.from({ length: width * height }, (_, index) => ({
      x: x + (index % width),
      y: y + Math.floor(index / width),
    })),
  );
}

function byAngle<T extends Cell>(cells: readonly T[]): T[] {
  const cx = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
  const cy = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
  const angle = (cell: T) => Math.atan2(cell.y - cy, cell.x - cx);
  return [...cells].sort(
    (a, b) => angle(a) - angle(b) || a.y - b.y || a.x - b.x,
  );
}

/**
 * Pairs each Pac-Man pixel with a speaker pixel, both taken in order around
 * their centres, so the pixels swirl into place. The mouth's pixels hide while
 * Pac-Man chomps, so the rest of him covers every speaker pixel on their own.
 */
export function assignSources(
  targets: readonly (Cell & { isMouth: boolean })[],
  sources: readonly Cell[],
): MorphCell[] {
  const orderedSources = byAngle(sources);
  const orderedTargets = byAngle(targets);
  const bodyCount = orderedTargets.filter((cell) => !cell.isMouth).length;
  let bodyIndex = 0;
  let source = orderedSources[0];

  return orderedTargets.map((target, order) => {
    if (!target.isMouth) {
      source =
        orderedSources[
          Math.floor((bodyIndex * orderedSources.length) / bodyCount)
        ];
      bodyIndex += 1;
    }
    return {
      x: target.x,
      y: target.y,
      fromX: source.x - target.x,
      fromY: source.y - target.y,
      delay:
        orderedTargets.length > 1 ? order / (orderedTargets.length - 1) : 0,
      isMouth: target.isMouth,
    };
  });
}
