"use client";

import { useEffect, useState } from "react";
import {
  PANNED_AT,
  PART_TAIL,
  measureEnd,
  measureProgress,
} from "@/lib/descent";
import { haptic } from "@/lib/haptics";
import { awardInteraction } from "@/lib/score";
import { slideTo } from "@/lib/slideTo";
import styles from "./MasterKey.module.scss";

const REVEAL_AT = 1 - PART_TAIL;
/** Glide for a tap that turns the key or turns it back. */
const TURN_SLIDE_MS = 2400;

type MasterKeyProps = {
  /** The descent the key waits on; it appears once the clouds have parted. */
  targetId: string;
};

export function MasterKey({ targetId }: MasterKeyProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isEngaged, setIsEngaged] = useState(false);
  const [isTurned, setIsTurned] = useState(false);

  useEffect(() => {
    const descent = document.getElementById(targetId);
    if (!descent) {
      return undefined;
    }

    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      setIsRevealed(measureProgress(descent, "part") >= REVEAL_AT);
      setIsEngaged(measureProgress(descent, "insert") > 0);
      setIsTurned(measureProgress(descent, "pan") >= PANNED_AT);
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
  }, [targetId]);

  // Scroll plays the turn, so a tap just carries the page through it. Turning
  // back stops with the key still in its lock, once the socials are back.
  const toggle = () => {
    const descent = document.getElementById(targetId);
    if (!descent) {
      return;
    }
    haptic();
    awardInteraction("master-key");
    slideTo(measureEnd(descent, isTurned ? "insert" : "pan"), TURN_SLIDE_MS);
  };

  return (
    <div
      className={
        isRevealed ? `${styles.root} ${styles.isRevealed}` : styles.root
      }
    >
      <div className={styles.glow}>
        <div className={styles.band}>
          <button
            aria-label="Master key"
            aria-pressed={isTurned}
            className={
              isEngaged ? `${styles.key} ${styles.isEngaged}` : styles.key
            }
            onClick={toggle}
            type="button"
          >
            <span className={styles.art} data-chase-cover="shape" />
          </button>
        </div>
      </div>
      <span className={styles.keyhole} aria-hidden="true" data-chase-cover />
    </div>
  );
}
