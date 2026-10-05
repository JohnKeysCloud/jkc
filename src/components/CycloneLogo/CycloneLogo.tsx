"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CycloneLogo.module.scss";

const LOGO = {
  animated: "/cloud-main.webp",
  still: "/cloud-main-still.webp",
  width: 323,
  height: 325,
};

export function CycloneLogo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={isInView ? styles.root : `${styles.root} ${styles.isPaused}`}
    >
      <picture className={styles.logo}>
        <source media="(prefers-reduced-motion: reduce)" srcSet={LOGO.still} />
        <img
          alt=""
          className={styles.image}
          decoding="async"
          draggable={false}
          fetchPriority="high"
          height={LOGO.height}
          src={LOGO.animated}
          width={LOGO.width}
        />
      </picture>
    </div>
  );
}
