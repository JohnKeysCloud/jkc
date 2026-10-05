import { CycloneLogo } from "@/components/CycloneLogo";
import { Moon } from "@/components/Moon";
import { PressStart } from "@/components/PressStart";
import { site } from "@/content/site";
import styles from "./Sky.module.scss";

type SkyProps = {
  targetId: string;
};

export function Sky({ targetId }: SkyProps) {
  return (
    <header className={styles.root}>
      <Moon />
      <div className={styles.content}>
        <CycloneLogo />
        <div className={styles.prompt}>
          <PressStart className={styles.start} targetId={targetId} />
          <p className={styles.hint} aria-hidden="true">
            {"// or scroll"}
          </p>
        </div>
      </div>
      <figure className={styles.epigraph}>
        <blockquote className={styles.epigraphText}>
          <p>{site.epigraph.text}</p>
        </blockquote>
        <figcaption className={styles.epigraphSource}>
          — {site.epigraph.source}
        </figcaption>
      </figure>
    </header>
  );
}
