/**
 * Share of the parting's scroll spent before the clouds start / after they
 * finish parting. Mirrors `$part-range` in `src/styles/_descent.scss`.
 */
export const PART_HOLD = 0.12;
export const PART_TAIL = 0.12;

/** Past halfway through the pan, the gallery is the panel in front. */
export const PANNED_AT = 0.5;

/** The descent's pinned scroll, in the order it plays. */
export type DescentSegment = "part" | "socials" | "insert" | "leave" | "pan";

/** Where a segment starts, in scroll past the descent's top, and its length. */
export type DescentSpan = { start: number; length: number };

export function clampUnit(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/** How far through `span` the descent is, once scrolled `scrolled` past it. */
export function spanProgress(scrolled: number, span: DescentSpan): number {
  return span.length > 0 ? clampUnit((scrolled - span.start) / span.length) : 1;
}

/**
 * Each segment has a spacer after the stage (the descent's first child), sized
 * in the stylesheet's own units, so reading its box keeps this in step with
 * `_descent.scss` however the browser resolves `svh`.
 */
function measureSpan(root: HTMLElement, segment: DescentSegment): DescentSpan {
  const stage = root.firstElementChild;
  const spacer = root.querySelector(`:scope > [data-travel="${segment}"]`);
  if (!(stage instanceof HTMLElement) || !(spacer instanceof HTMLElement)) {
    return { start: 0, length: 0 };
  }
  return {
    start: spacer.offsetTop - stage.offsetHeight,
    length: spacer.offsetHeight,
  };
}

/** How far through `segment` the descent is, from 0 to 1. */
export function measureProgress(
  root: HTMLElement,
  segment: DescentSegment,
): number {
  return spanProgress(
    -root.getBoundingClientRect().top,
    measureSpan(root, segment),
  );
}

/** Document scroll offset at which `segment` has finished playing. */
export function measureEnd(root: HTMLElement, segment: DescentSegment): number {
  const { start, length } = measureSpan(root, segment);
  return root.getBoundingClientRect().top + window.scrollY + start + length;
}
