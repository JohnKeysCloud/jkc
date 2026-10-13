"use client";

import { type ReactNode, useEffect, useRef } from "react";
import {
  PANNED_AT,
  PART_HOLD,
  PART_TAIL,
  clampUnit,
  measureEnd,
  measureProgress,
} from "@/lib/descent";
import { easeInOutSine } from "@/lib/easing";
import { holdFlingsAt } from "@/lib/flingStop";
import { publish } from "@/lib/panProgress";
import styles from "./Descent.module.scss";

// Too small to see, but a real change to every range that folds it in.
const TIMELINE_NUDGE = "0.01px";

type DescentProps = {
  id: string;
  /** Painted on the pinned stage behind both panels. */
  backdrop?: ReactNode;
  overlay: ReactNode;
  /** Rides the seam between the card and the aside, above both. */
  lock?: ReactNode;
  /** Pans in from the right once the key has turned. */
  aside: ReactNode;
  /** Fragment that lands on the aside, mid-descent. */
  asideId: string;
  children: ReactNode;
};

export function Descent({
  id,
  backdrop,
  overlay,
  lock,
  aside,
  asideId,
  children,
}: DescentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    const asidePanel = asideRef.current;
    const track = trackRef.current;
    if (!root || !card || !asidePanel || !track) {
      return undefined;
    }

    // Scroll-driven CSS animations handle the motion where supported; the
    // loop writes the same progress as custom properties everywhere else.
    const fallback = !CSS.supports("animation-timeline: view()");
    let frameId: number | null = null;

    // Reads all layout before writing any style, so a frame lays out once.
    const update = () => {
      frameId = null;
      const pan = measureProgress(root, "pan");
      const inside = fallback
        ? {
            part: measureProgress(root, "part"),
            socials: measureProgress(root, "socials"),
            insert: measureProgress(root, "insert"),
            leave: measureProgress(root, "leave"),
          }
        : null;
      // The page's last dock band of scroll, as the footer docks. The track's
      // end padding is that band, resolved to pixels.
      let dock = 0;
      if (fallback) {
        const dockBand = parseFloat(getComputedStyle(track).paddingBlockEnd);
        const toEnd =
          document.documentElement.scrollHeight -
          window.innerHeight -
          window.scrollY;
        dock = dockBand > 0 ? clampUnit(1 - toEnd / dockBand) : 0;
      }

      // Whichever panel is off screen stays out of the tab order.
      card.inert = pan >= PANNED_AT;
      asidePanel.inert = pan < PANNED_AT;
      // Lets the fixed sound toggle turn into Pac-Man while it crosses.
      document.documentElement.toggleAttribute(
        "data-panning",
        pan > 0 && pan < 1,
      );
      publish(pan);

      if (inside) {
        const part = easeInOutSine(
          clampUnit((inside.part - PART_HOLD) / (1 - PART_HOLD - PART_TAIL)),
        );
        root.style.setProperty("--cloud-part", part.toFixed(4));
        root.style.setProperty("--socials", inside.socials.toFixed(4));
        root.style.setProperty("--insert", inside.insert.toFixed(4));
        root.style.setProperty("--leave", inside.leave.toFixed(4));
      }
      if (fallback) {
        document.documentElement.style.setProperty(
          "--pan",
          easeInOutSine(pan).toFixed(4),
        );
        document.documentElement.style.setProperty("--dock", dock.toFixed(4));
      }
    };

    const requestUpdate = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    // The aside's place in the document isn't where it shows on screen.
    const followHash = () => {
      if (window.location.hash === `#${asideId}`) {
        window.scrollTo(0, measureEnd(root, "pan"));
      }
    };

    const stopListening = () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate);
      } else {
        stopListening();
      }
      requestUpdate();
    });

    // Where the descent's ranges sit on the page's scroll timeline, as
    // document offsets: its top, and the pan's ends read off the same spacers
    // that pin the stage. Anything that moves or resizes the descent resizes
    // the body too. Each pass also nudges every range, so iOS re-reads the
    // scroll its animations run on.
    let synced = false;
    const placeTimelines = () => {
      const { style } = document.documentElement;
      style.setProperty(
        "--descent-top",
        `${root.getBoundingClientRect().top + window.scrollY}px`,
      );
      style.setProperty("--pan-scroll-start", `${measureEnd(root, "leave")}px`);
      style.setProperty("--pan-scroll-end", `${measureEnd(root, "pan")}px`);
      synced = !synced;
      style.setProperty("--timeline-sync", synced ? TIMELINE_NUDGE : "0px");
    };
    const timelineObserver = new ResizeObserver(placeTimelines);

    observer.observe(root);
    timelineObserver.observe(document.body);
    window.addEventListener("resize", placeTimelines);
    window.addEventListener("hashchange", followHash);
    // A fling stops at the gallery's top, from either side, rather than
    // carrying straight through Pac-Man's crossing.
    const releaseFlings = holdFlingsAt(() => measureEnd(root, "pan"));
    placeTimelines();
    followHash();
    update();

    return () => {
      observer.disconnect();
      timelineObserver.disconnect();
      stopListening();
      releaseFlings();
      window.removeEventListener("resize", placeTimelines);
      window.removeEventListener("hashchange", followHash);
      document.documentElement.style.removeProperty("--pan");
      document.documentElement.style.removeProperty("--dock");
      document.documentElement.style.removeProperty("--descent-top");
      document.documentElement.style.removeProperty("--pan-scroll-start");
      document.documentElement.style.removeProperty("--pan-scroll-end");
      document.documentElement.style.removeProperty("--timeline-sync");
      document.documentElement.removeAttribute("data-panning");
      publish(0);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [asideId]);

  return (
    <div ref={rootRef} id={id} className={styles.root} data-descent>
      <div className={styles.stage}>
        <div className={styles.glow} />
        <div className={`${styles.track} ${styles.below}`}>
          <div aria-hidden="true" />
          <div ref={asideRef} id={asideId} className={styles.aside}>
            {aside}
          </div>
        </div>
        {backdrop}
        <div ref={trackRef} className={`${styles.track} ${styles.above}`}>
          <div ref={cardRef} className={styles.frame}>
            <div className={styles.scene}>{children}</div>
            {overlay}
          </div>
          <div aria-hidden="true" />
          {lock}
        </div>
      </div>
      <div className={styles.partTravel} data-travel="part" />
      <div className={styles.socialsTravel} data-travel="socials" />
      <div className={styles.insertTravel} data-travel="insert" />
      <div className={styles.leaveTravel} data-travel="leave" />
      <div className={styles.panTravel} data-travel="pan" />
    </div>
  );
}
