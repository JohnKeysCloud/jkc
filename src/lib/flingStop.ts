/**
 * A scroll event this long after the last one starts a fresh scroll, not the
 * tail of a fling.
 */
const IDLE_MS = 250;

/** Which side of `stop` the page is on: -1 above, 1 below, 0 on it. */
export function sideOf(scrollY: number, stop: number): number {
  return Math.sign(Math.round(scrollY - stop)) || 0;
}

/** Whether a fling that set off on `from`'s side of `stop` has carried past it. */
export function hasCrossed(from: number, scrollY: number, stop: number) {
  return from !== 0 && sideOf(scrollY, stop) === -from;
}

/**
 * Halts a touch fling where it would carry the page past `getStop()`, either
 * way, so crossing it takes a fresh swipe. A finger dragging across is left
 * alone. Not `scroll-snap-stop`: WebKit's momentum scrolling skips it, and
 * where iOS snaps the root needn't match the measured stop, so it could pull
 * the page into Pac-Man's crossing. Returns a cleanup.
 */
export function holdFlingsAt(getStop: () => number): () => void {
  const root = document.documentElement;
  let touches = 0;
  let from = 0;
  let lastScroll = 0;
  let releaseId: number | null = null;

  const onTouch = (event: TouchEvent) => {
    touches = event.touches.length;
    from = touches === 0 ? sideOf(window.scrollY, getStop()) : 0;
  };

  const onScroll = () => {
    const now = performance.now();
    if (now - lastScroll > IDLE_MS && touches === 0) {
      from = 0;
    }
    lastScroll = now;
    // A slide's last scroll can land after it lets go, so no side outlives it.
    if (root.hasAttribute("data-sliding")) {
      from = 0;
      return;
    }
    if (touches > 0) {
      return;
    }
    const stop = getStop();
    if (!hasCrossed(from, window.scrollY, stop)) {
      return;
    }
    from = 0;
    // iOS keeps a fling's momentum through `scrollTo`; briefly locking the
    // scroll is what ends it.
    root.style.overflow = "hidden";
    window.scrollTo(0, stop);
    releaseId = window.requestAnimationFrame(() => {
      releaseId = window.requestAnimationFrame(() => {
        releaseId = null;
        root.style.removeProperty("overflow");
      });
    });
  };

  const touchEvents = ["touchstart", "touchend", "touchcancel"] as const;
  touchEvents.forEach((type) =>
    window.addEventListener(type, onTouch, { passive: true }),
  );
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    touchEvents.forEach((type) => window.removeEventListener(type, onTouch));
    window.removeEventListener("scroll", onScroll);
    if (releaseId !== null) {
      window.cancelAnimationFrame(releaseId);
      root.style.removeProperty("overflow");
    }
  };
}
