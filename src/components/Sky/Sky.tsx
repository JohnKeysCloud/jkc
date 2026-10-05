import type { CSSProperties } from "react";
import { CycloneLogo } from "@/components/CycloneLogo";
import { Epigraph } from "@/components/Epigraph";
import { Moon } from "@/components/Moon";
import { PressStart } from "@/components/PressStart";
import { ECLIPSE_MS } from "@/lib/eclipse";
import styles from "./Sky.module.scss";

type SkyProps = {
  targetId: string;
};

export function Sky({ targetId }: SkyProps) {
  return (
    <header
      className={styles.root}
      style={{ "--eclipse-duration": `${ECLIPSE_MS}ms` } as CSSProperties}
    >
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
      <Epigraph className={styles.epigraph} />
    </header>
  );
}
