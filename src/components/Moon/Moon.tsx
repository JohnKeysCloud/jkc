"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ECLIPSE_MS } from "@/lib/eclipse";
import { haptic } from "@/lib/haptics";
import { useAnimatedImage } from "@/lib/useAnimatedImage";
import styles from "./Moon.module.scss";

const MOON = {
  animated: "/cyclone-moon.webp",
  still: "/cyclone-moon-still.webp",
  width: 350,
  height: 350,
};

export function Moon() {
  const [isEclipsing, setIsEclipsing] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  // The still paints first so the heavy animation stays off the critical path.
  const isAnimated = useAnimatedImage(MOON.animated);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const startEclipse = () => {
    if (isEclipsing) {
      return;
    }

    haptic("press");
    setIsEclipsing(true);
    timeoutRef.current = window.setTimeout(() => {
      setIsEclipsing(false);
      timeoutRef.current = null;
    }, ECLIPSE_MS);
  };

  return (
    <div className={styles.root} data-eclipsing={isEclipsing || undefined}>
      <div className={styles.shade} aria-hidden="true" />
      <button
        aria-label="Eclipse the moon"
        className={styles.moon}
        onClick={startEclipse}
        type="button"
      >
        <picture
          className={[styles.surface, isAnimated && styles.isAnimated]
            .filter(Boolean)
            .join(" ")}
          style={
            { "--moon-animated": `url(${MOON.animated})` } as CSSProperties
          }
        >
          <img
            alt=""
            className={styles.image}
            decoding="async"
            draggable={false}
            height={MOON.height}
            src={MOON.still}
            width={MOON.width}
          />
        </picture>
        <span className={styles.disc} aria-hidden="true">
          <span className={styles.occluder} />
        </span>
        <span className={styles.corona} aria-hidden="true" />
      </button>
    </div>
  );
}
