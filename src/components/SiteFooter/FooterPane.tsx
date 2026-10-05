"use client";

import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

/** Two passes of the logo's flourish (`$logo-pass` in the stylesheet). */
const EGG_DWELL_MS = 6600;
const TRIGGER_SELECTOR = "[data-egg-trigger]";

function isInTrigger(node: EventTarget | null) {
  return node instanceof Element && node.closest(TRIGGER_SELECTOR) !== null;
}

type FooterPaneProps = {
  className: string;
  children: ReactNode;
};

/**
 * Reveals the signature once the pointer has held the `data-egg-trigger`
 * element for the logo's full flourish, then keeps it revealed until the
 * pointer leaves the pane altogether. A touch can't hover, so a tap on the
 * trigger starts the dwell instead, and a tap outside the pane ends it.
 */
export function FooterPane({ className, children }: FooterPaneProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [isDwelling, setIsDwelling] = useState(false);
  const [isEggRevealed, setIsEggRevealed] = useState(false);

  useEffect(() => {
    if (!isDwelling || isEggRevealed) {
      return undefined;
    }
    const timeoutId = window.setTimeout(
      () => setIsEggRevealed(true),
      EGG_DWELL_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [isDwelling, isEggRevealed]);

  useEffect(() => {
    if (!isDwelling && !isEggRevealed) {
      return undefined;
    }
    const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
      if (
        event.pointerType === "touch" &&
        event.target instanceof Node &&
        !paneRef.current?.contains(event.target)
      ) {
        setIsDwelling(false);
        setIsEggRevealed(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isDwelling, isEggRevealed]);

  // A touch reports over/out/leave around every tap, so only mice and pens
  // dwell by hovering.
  const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" && isInTrigger(event.target)) {
      setIsDwelling(true);
    }
  };

  const handlePointerOut = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== "touch" &&
      isInTrigger(event.target) &&
      !isInTrigger(event.relatedTarget)
    ) {
      setIsDwelling(false);
    }
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      setIsDwelling(false);
      setIsEggRevealed(false);
    }
  };

  // Not fired when the touch turns into a scroll, which cancels it instead.
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" && isInTrigger(event.target)) {
      setIsDwelling(true);
    }
  };

  return (
    <div
      ref={paneRef}
      className={className}
      data-egg-dwelling={isDwelling || undefined}
      data-egg-revealed={isEggRevealed || undefined}
      onPointerLeave={handlePointerLeave}
      onPointerOut={handlePointerOut}
      onPointerOver={handlePointerOver}
      onPointerUp={handlePointerUp}
    >
      {children}
    </div>
  );
}
