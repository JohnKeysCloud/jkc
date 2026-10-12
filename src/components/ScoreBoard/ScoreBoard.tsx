"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { clampUnit, measureProgress } from "@/lib/descent";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/score";
import styles from "./ScoreBoard.module.scss";
import { toneAt } from "./scoreTone";

const DIGITS = 6;

const pad = (points: number) => String(points).padStart(DIGITS, "0");
const spell = (points: number) => points.toLocaleString("en-US");

/**
 * The arcade score, pinned to the bottom-left corner once the first point is
 * scored. Screen readers get one plain sentence; the digits are decoration.
 */
export function ScoreBoard() {
  const panelRef = useRef<HTMLSpanElement>(null);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const isVisible = Boolean(snapshot && snapshot.score > 0);
  // The board outlives page changes; each page has its own descent, or none.
  const pathname = usePathname();

  // Keeps the panel's tone in step with the scene behind the corner.
  useEffect(() => {
    const panel = panelRef.current;
    const descent = document.querySelector<HTMLElement>("[data-descent]");
    if (!isVisible || !panel) {
      return undefined;
    }
    // Without a descent, the night sky is all that's behind it.
    if (!descent) {
      delete panel.dataset.tone;
      return undefined;
    }

    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      const tone = toneAt({
        rise: clampUnit(
          1 - descent.getBoundingClientRect().top / window.innerHeight,
        ),
        part: measureProgress(descent, "part"),
      });
      if (panel.dataset.tone !== tone) {
        panel.dataset.tone = tone;
      }
    };

    const requestUpdate = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    update();

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isVisible, pathname]);

  if (!snapshot || !isVisible) {
    return null;
  }

  const { score, high } = snapshot;

  return (
    <p className={styles.root}>
      <span ref={panelRef} className={styles.panel}>
        <span aria-hidden="true" className={styles.label}>
          1UP
        </span>
        <span key={score} aria-hidden="true" className={styles.score}>
          {pad(score)}
        </span>
        <span aria-hidden="true" className={styles.high}>
          HI {pad(high)}
        </span>
        <span className="srOnly">
          Score {spell(score)}, high score {spell(high)}
        </span>
      </span>
    </p>
  );
}
