import { ContactDialog } from "@/components/ContactDialog";
import { PlayerPortrait } from "@/components/PlayerPortrait";
import { Socials } from "@/components/Socials";
import { site } from "@/content/site";
import styles from "./CallingCard.module.scss";

export function CallingCard() {
  return (
    <main className={styles.root}>
      <PlayerPortrait />
      <p className={styles.greeting}>
        <span className={styles.greetingText}>{site.greeting}</span>
        <span className={styles.wave} aria-hidden="true">
          👋🏽
        </span>
      </p>
      <h1 className={styles.handle}>{site.handle}</h1>
      <p className={styles.role}>
        {site.role}
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
        <a
          className={styles.studio}
          href={site.studio.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {site.studio.name}
          <span className="srOnly"> (opens in a new tab)</span>
        </a>
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
        <span className={styles.locationName}>{site.location.name}</span>
        <abbr className={styles.locationShort} title={site.location.name}>
          {site.location.short}
        </abbr>
      </p>
      <p className={styles.statement}>{site.statement}</p>
      <ContactDialog />
      <Socials />
    </main>
  );
}
