"use client";

import { useEffect, useRef, useState } from "react";
import { ECLIPSE_MS } from "@/lib/eclipse";
import { haptic } from "@/lib/haptics";
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
        <picture className={styles.surface}>
          <source
            media="(prefers-reduced-motion: reduce)"
            srcSet={MOON.still}
          />
          <img
            alt=""
            className={styles.image}
            decoding="async"
            draggable={false}
            height={MOON.height}
            src={MOON.animated}
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
