"use client";

import { type ReactNode, useEffect, useRef } from "react";
import {
  PART_HOLD,
  PART_TAIL,
  clampUnit,
  measureDescentProgress,
} from "@/lib/descent";
import { easeInOutSine } from "@/lib/easing";
import styles from "./Descent.module.scss";

type DescentProps = {
  id: string;
  /** Painted on the pinned stage behind the scene, down into the dock band. */
  backdrop?: ReactNode;
  overlay: ReactNode;
  children: ReactNode;
};

export function Descent({ id, backdrop, overlay, children }: DescentProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    // Scroll-driven CSS animations handle the parting where supported.
    if (!root || CSS.supports("animation-timeline: view()")) {
      return undefined;
    }

    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      const progress = measureDescentProgress(root);
      const part = easeInOutSine(
        clampUnit((progress - PART_HOLD) / (1 - PART_HOLD - PART_TAIL)),
      );
      root.style.setProperty("--cloud-part", part.toFixed(4));
    };

    const requestUpdate = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    const stopListening = () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate);
      } else {
        stopListening();
      }
      requestUpdate();
    });

    observer.observe(root);
    update();

    return () => {
      observer.disconnect();
      stopListening();
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div ref={rootRef} id={id} className={styles.root}>
      <div className={styles.stage}>
        {backdrop}
        <div className={styles.frame}>
          <div className={styles.scene}>{children}</div>
          {overlay}
        </div>
      </div>
    </div>
  );
}
