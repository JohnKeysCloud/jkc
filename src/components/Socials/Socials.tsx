import type { CSSProperties } from "react";
import { type SocialIcon, site } from "@/content/site";
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
  return (
    <nav className={styles.root} aria-label="Socials">
      <ul className={styles.list}>
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
                    style={{ backgroundImage: `url(/socials/${icon}.webp)` }}
                  />
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
