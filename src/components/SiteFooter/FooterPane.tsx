"use client";

import { type PointerEvent, type ReactNode, useEffect, useState } from "react";

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
 * pointer leaves the pane altogether.
 */
export function FooterPane({ className, children }: FooterPaneProps) {
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

  const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
    if (isInTrigger(event.target)) {
      setIsDwelling(true);
    }
  };

  const handlePointerOut = (event: PointerEvent<HTMLDivElement>) => {
    if (isInTrigger(event.target) && !isInTrigger(event.relatedTarget)) {
      setIsDwelling(false);
    }
  };

  const handlePointerLeave = () => {
    setIsDwelling(false);
    setIsEggRevealed(false);
  };

  return (
    <div
      className={className}
      data-egg-revealed={isEggRevealed || undefined}
      onPointerLeave={handlePointerLeave}
      onPointerOut={handlePointerOut}
      onPointerOver={handlePointerOver}
    >
      {children}
    </div>
  );
}
