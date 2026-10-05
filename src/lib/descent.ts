/**
 * Share of the pinned scroll spent before the clouds start / after they finish
 * parting. Mirrors `$part-range` in `src/styles/_descent.scss`.
 */
export const PART_HOLD = 0.12;
export const PART_TAIL = 0.12;

export function clampUnit(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Scroll distance the stage (the descent's first child) stays pinned. The
 * stage runs a dock band taller than the viewport, so the descent's last
 * stretch of scroll lifts the card out of the way for the footer.
 */
function measurePinnedTravel(root: HTMLElement): number {
  const stage = root.firstElementChild;
  const stageHeight =
    stage instanceof HTMLElement ? stage.offsetHeight : window.innerHeight;
  return root.offsetHeight - stageHeight;
}

/** How far through its pinned scroll the descent is, from 0 to 1. */
export function measureDescentProgress(root: HTMLElement): number {
  const pinnedTravel = measurePinnedTravel(root);
  return pinnedTravel > 0
    ? clampUnit(-root.getBoundingClientRect().top / pinnedTravel)
    : 1;
}

/** Document scroll offset at which the card has fully arrived. */
export function measureDescentEnd(root: HTMLElement): number {
  return (
    root.getBoundingClientRect().top +
    window.scrollY +
    measurePinnedTravel(root)
  );
}
