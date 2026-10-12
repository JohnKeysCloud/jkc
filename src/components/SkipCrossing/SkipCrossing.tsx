"use client";

import { type MouseEvent, useEffect, useRef } from "react";
import { PANNED_AT, measureEnd } from "@/lib/descent";
import { haptic } from "@/lib/haptics";
import { getSnapshot, subscribe } from "@/lib/panProgress";
import { slideTo } from "@/lib/slideTo";
import styles from "./SkipCrossing.module.scss";

/** Brisk enough to feel like a skip, long enough to see him finish. */
const SKIP_MS = 1100;

type SkipCrossingProps = {
  /** The descent whose crossing this jumps to the end of. */
  targetId: string;
  /** Where focus lands once the crossing ends and the button hides. */
  galleryId: string;
};

export function SkipCrossing({ targetId, galleryId }: SkipCrossingProps) {
  const stopWaitingRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopWaitingRef.current?.(), []);

  const skip = (event: MouseEvent<HTMLButtonElement>) => {
    const descent = document.getElementById(targetId);
    if (!descent) {
      return;
    }
    haptic();
    stopWaitingRef.current?.();
    const button = event.currentTarget;
    // The gallery is inert until it's the panel in front.
    if (document.activeElement === button) {
      const stopWaiting = subscribe(() => {
        if (getSnapshot() < PANNED_AT) {
          return;
        }
        stopWaiting();
        stopWaitingRef.current = null;
        const { activeElement } = document;
        if (activeElement === button || activeElement === document.body) {
          document
            .getElementById(galleryId)
            ?.querySelector<HTMLElement>("li button")
            ?.focus({ preventScroll: true });
        }
      });
      stopWaitingRef.current = stopWaiting;
    }
    slideTo(measureEnd(descent, "pan"), SKIP_MS);
  };

  return (
    <button
      aria-label="Skip the crossing"
      className={styles.root}
      onClick={skip}
      type="button"
    >
      Skip
    </button>
  );
}
