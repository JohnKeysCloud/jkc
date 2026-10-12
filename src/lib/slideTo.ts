import { easeInOutSine } from "@/lib/easing";

/** An unhurried glide, for slides without their own pace. */
const SLIDE_DURATION_MS = 3400;
const INTERRUPT_EVENTS = ["wheel", "touchstart", "keydown"] as const;

let cancelActiveSlide: (() => void) | null = null;

/**
 * Eases the page to `destination`, giving way as soon as the reader scrolls or
 * types. Jumps straight there when they prefer reduced motion.
 */
export function slideTo(destination: number, durationMs = SLIDE_DURATION_MS) {
  cancelActiveSlide?.();
  const root = document.documentElement;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.setAttribute("data-sliding", "");
    window.scrollTo(0, destination);
    // The jump's scroll event fires before the next frame's callbacks.
    window.requestAnimationFrame(() => root.removeAttribute("data-sliding"));
    return;
  }

  const start = window.scrollY;
  const distance = destination - start;
  const startTime = performance.now();
  let frameId: number | null = null;

  const cancel = () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    INTERRUPT_EVENTS.forEach((type) =>
      window.removeEventListener(type, cancel),
    );
    root.removeAttribute("data-sliding");
    cancelActiveSlide = null;
  };

  const step = (now: number) => {
    const progress = Math.min((now - startTime) / durationMs, 1);
    window.scrollTo(0, start + distance * easeInOutSine(progress));
    if (progress < 1) {
      frameId = window.requestAnimationFrame(step);
    } else {
      cancel();
    }
  };

  INTERRUPT_EVENTS.forEach((type) =>
    window.addEventListener(type, cancel, { passive: true }),
  );
  cancelActiveSlide = cancel;
  // Tells the fling stop this is a slide, free to run past the gallery's top.
  root.setAttribute("data-sliding", "");
  frameId = window.requestAnimationFrame(step);
}
