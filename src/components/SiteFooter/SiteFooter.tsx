import { site } from "@/content/site";
import { CurrentYear } from "./CurrentYear";
import { FooterPane } from "./FooterPane";
import styles from "./SiteFooter.module.scss";

export function SiteFooter() {
  return (
    <footer className={styles.root}>
      <FooterPane className={styles.pane}>
        <div className={styles.poweredBy} data-egg-trigger>
          <p className={styles.poweredByLabel}>powered by:</p>
          <span
            className={styles.logo}
            role="img"
            aria-label={site.studio.name}
          />
        </div>
        <div className={styles.credits}>
          <p className={styles.copyright}>
            © <CurrentYear fallback={new Date().getFullYear()} />{" "}
            {`${site.studio.name}™ All Rights Reserved`}
          </p>
        </div>
        <a
          className={styles.signature}
          href={site.signature.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {site.signature.text} <span aria-hidden="true">💭</span>
          <span className="srOnly"> (opens in a new tab)</span>
        </a>
      </FooterPane>
    </footer>
  );
}
