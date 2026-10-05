"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useAnimatedImage } from "@/lib/useAnimatedImage";
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
  // The still paints first, so the page's largest paint isn't waiting on the
  // far heavier animation, which is laid over it once it can play. Laid over
  // rather than swapped in, so the still's `src` (what Lighthouse times)
  // never changes.
  const isAnimated = useAnimatedImage(LOGO.animated);

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
      className={[
        styles.root,
        isAnimated && styles.isAnimated,
        !isInView && styles.isPaused,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--logo-animated": `url(${LOGO.animated})` } as CSSProperties}
    >
      <picture className={styles.logo}>
        <img
          alt=""
          className={styles.image}
          decoding="async"
          draggable={false}
          fetchPriority="high"
          height={LOGO.height}
          src={LOGO.still}
          width={LOGO.width}
        />
      </picture>
    </div>
  );
}
