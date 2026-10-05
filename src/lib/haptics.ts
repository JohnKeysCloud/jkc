import { playIosHaptic } from "./iosHaptic";

/** Vibration patterns in ms (buzz, pause, buzz…). */
const PATTERNS = {
  tap: 10,
  press: 20,
  success: [15, 60, 25],
  error: [40, 60, 40],
} satisfies Record<string, VibratePattern>;

export type Haptic = keyof typeof PATTERNS;

/**
 * A light touch of feedback where the device allows it. Browsers only honor
 * it after the visitor has interacted with the page; the iPhone fallback
 * plays a single tick, and only from within a tap.
 */
export function haptic(kind: Haptic = "tap") {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  if ("vibrate" in navigator) {
    navigator.vibrate(PATTERNS[kind]);
    return;
  }
  playIosHaptic();
}
