/**
 * Which text tone the score panel takes over the scene behind the bottom-left
 * corner. Each tone has its own frosted veil, so both stay at 4.5:1 or better
 * over any backdrop; the tone picks whichever suits the scene.
 *
 * The thresholds come from sampling the corner at desktop and phone sizes in
 * Chromium and WebKit: the only bright backdrop is the cloud bank, which
 * reaches the corner once the descent has risen a tenth of the viewport and
 * clears it by 60% of the parting. The sky, the card, the pan, the gallery
 * and the docked footer all sample dark.
 */

export type Tone = "light" | "dark";

export type Backdrop = {
  /** How far the descent's top has risen up the viewport, from 0 to 1. */
  rise: number;
  /** How far the clouds have parted, from 0 to 1 in scroll (not eased). */
  part: number;
};

export const CLOUD_ENTRY = 0.1;
export const CLOUD_EXIT = 0.6;

export function toneAt({ rise, part }: Backdrop): Tone {
  return rise > CLOUD_ENTRY && part < CLOUD_EXIT ? "dark" : "light";
}
