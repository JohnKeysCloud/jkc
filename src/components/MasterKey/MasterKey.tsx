"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { PART_TAIL, measureDescentProgress } from "@/lib/descent";
import { haptic } from "@/lib/haptics";
import styles from "./MasterKey.module.scss";

type KeyState = "resting" | "inserted" | "withdrawing";

type MasterKeyProps = {
  /** The descent the key waits on; it appears once the clouds have parted. */
  targetId: string;
};

/** Matches the `key-insert` / `key-withdraw` duration in the stylesheet. */
const TURN_MS = 800;
const REVEAL_AT = 1 - PART_TAIL;

const STATE_CLASS: Record<KeyState, string> = {
  resting: styles.key,
  inserted: `${styles.key} ${styles.isInserted}`,
  withdrawing: `${styles.key} ${styles.isWithdrawing}`,
};

export function MasterKey({ targetId }: MasterKeyProps) {
  const keyRef = useRef<HTMLButtonElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [keyState, setKeyState] = useState<KeyState>("resting");
  const [offsetMs, setOffsetMs] = useState(0);

  useEffect(() => {
    const descent = document.getElementById(targetId);
    if (!descent) {
      return undefined;
    }

    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      setIsRevealed(measureDescentProgress(descent) >= REVEAL_AT);
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

  const toggle = () => {
    const isEntering = keyState !== "inserted";
    // Both directions report progress along the insert path, so a mid-flight
    // tap picks up from wherever the key currently is.
    const progress =
      keyState === "resting"
        ? 0
        : (keyRef.current?.getAnimations()[0]?.effect?.getComputedTiming()
            .progress ?? (isEntering ? 0 : 1));
    const remaining = isEntering ? progress : 1 - progress;

    haptic();
    setOffsetMs(-remaining * TURN_MS);
    setKeyState(isEntering ? "inserted" : "withdrawing");
  };

  const settle = () => {
    if (keyState === "withdrawing") {
      setKeyState("resting");
    }
  };

  return (
    <div
      className={
        isRevealed ? `${styles.root} ${styles.isRevealed}` : styles.root
      }
    >
      <div className={styles.band}>
        <button
          ref={keyRef}
          aria-label="Master key"
          aria-pressed={keyState === "inserted"}
          className={STATE_CLASS[keyState]}
          onAnimationEnd={settle}
          onClick={toggle}
          style={{ "--key-offset": `${offsetMs}ms` } as CSSProperties}
          type="button"
        />
      </div>
      <span className={styles.keyhole} aria-hidden="true" />
    </div>
  );
}
