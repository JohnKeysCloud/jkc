"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { type SocialIcon, site } from "@/content/site";
import { measureProgress } from "@/lib/descent";
import styles from "./Socials.module.scss";

type Tone = {
  accent: string;
  /** Lifts tiles whose hue would otherwise go near-black once desaturated. */
  restBrightness?: number;
};

const TONES: Record<SocialIcon, Tone> = {
  discord: { accent: "var(--color-binky)", restBrightness: 2.5 },
  github: { accent: "var(--color-inky)" },
  instagram: { accent: "var(--color-pacman)" },
  linkedin: { accent: "var(--color-clyde)" },
  tiktok: { accent: "var(--color-funky)" },
  twitch: { accent: "var(--color-pinky)" },
  twitter: { accent: "var(--color-sue)", restBrightness: 2.5 },
};

export function Socials() {
  const navRef = useRef<HTMLElement>(null);

  // The scroll timeline can't tell which way the page is moving, so whether the
  // icons are unfolding back into view is decided here.
  useEffect(() => {
    const nav = navRef.current;
    const descent = nav?.closest<HTMLElement>("[data-descent]");
    if (!nav || !descent) {
      return undefined;
    }

    let lastScrollY = window.scrollY;
    let isRewinding = false;
    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      const isLeaving = measureProgress(descent, "leave") > 0;
      const { scrollY } = window;
      if (scrollY !== lastScrollY) {
        isRewinding = scrollY < lastScrollY;
        lastScrollY = scrollY;
      }
      // Arriving on the way down, or returning on the way back up.
      nav.toggleAttribute("data-unfolding", isRewinding === isLeaving);
    };

    const request = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <nav ref={navRef} className={styles.root} aria-label="Socials">
      <ul
        className={styles.list}
        style={{ "--social-count": site.socials.length } as CSSProperties}
      >
        {site.socials.map(({ label, href, icon }, index) => {
          const { accent, restBrightness = 1 } = TONES[icon];

          return (
            <li
              key={href}
              className={styles.item}
              style={
                {
                  "--social-accent": accent,
                  "--social-index": index,
                  "--social-rest-brightness": restBrightness,
                } as CSSProperties
              }
            >
              <a
                className={styles.link}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.icon} aria-hidden="true">
                  <span
                    className={styles.tile}
                    style={
                      {
                        "--tile-image": `url(/socials/${icon}.webp)`,
                      } as CSSProperties
                    }
                  >
                    <span className={styles.rest} />
                    <span className={styles.lit} />
                    <span className={styles.unfold}>
                      <span className={styles.flight} />
                    </span>
                  </span>
                </span>
                <span className={styles.label}>{label}</span>
                <span className="srOnly"> (opens in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
