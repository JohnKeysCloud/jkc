"use client";

import {
  type CSSProperties,
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import quotes from "@/content/quotes.json";
import styles from "./Epigraph.module.scss";

const HOLD_MS = 9000;
const HOLD_TICK_MS = 250;
const FADE_MS = 400;
// Letters draw in for a beat before bursting outward…
const SCATTER = {
  duration: 1000,
  stagger: 300,
  easing: "cubic-bezier(0.36, 0, 0.66, -0.56)",
};
// …then sail past their spot on the way back and spring into place.
const GATHER = {
  duration: 1600,
  stagger: 600,
  easing: "cubic-bezier(0.3, 1.7, 0.5, 1)",
};
/** How far each letter flies from its spot, in px, and how much it tumbles. */
const DRIFT = {
  minTravel: 60,
  travelSpread: 140,
  jitter: 24,
  maxSpin: 240,
  minScale: 0.4,
  scaleSpread: 0.8,
};

const SPARKLE = "✨";
// Non-breaking, so a sparkle never wraps onto a line by itself.
const SPARKLE_GAP = "\u00a0";

const withSparkles = (quote: string) =>
  `${SPARKLE}${SPARKLE_GAP}${quote}${SPARKLE_GAP}${SPARKLE}`;

// Splits by what reads as one character, so emoji stay whole.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const splitLetters = (word: string) =>
  Array.from(graphemes.segment(word), ({ segment }) => segment);

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A transform per letter that sends it outward from the quote's centre. */
function measureScatter(container: HTMLElement, letters: HTMLElement[]) {
  const box = container.getBoundingClientRect();
  const centerX = box.left + box.width / 2;
  const centerY = box.top + box.height / 2;

  return letters.map((letter) => {
    const rect = letter.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - centerX;
    const dy = rect.top + rect.height / 2 - centerY;
    const angle =
      dx === 0 && dy === 0 ? Math.random() * 2 * Math.PI : Math.atan2(dy, dx);
    const travel = DRIFT.minTravel + Math.random() * DRIFT.travelSpread;
    const x =
      Math.cos(angle) * travel + randomBetween(-DRIFT.jitter, DRIFT.jitter);
    const y =
      Math.sin(angle) * travel + randomBetween(-DRIFT.jitter, DRIFT.jitter);
    const spin = randomBetween(-DRIFT.maxSpin, DRIFT.maxSpin);
    const scale = DRIFT.minScale + Math.random() * DRIFT.scaleSpread;

    return `translate(${x}px, ${y}px) rotate(${spin}deg) scale(${scale})`;
  });
}

function animateLetters(container: HTMLElement, direction: "in" | "out") {
  if (prefersReducedMotion()) {
    const fade = [{ opacity: 0 }, { opacity: 1 }];
    return [
      container.animate(direction === "in" ? fade : fade.reverse(), {
        duration: FADE_MS,
        fill: direction === "in" ? "backwards" : "forwards",
      }),
    ];
  }

  const letters = Array.from(
    container.querySelectorAll<HTMLElement>(`.${styles.letter}`),
  );
  const scattered = measureScatter(container, letters);
  const timing = direction === "in" ? GATHER : SCATTER;

  return letters.map((letter, index) => {
    const away = { opacity: 0, transform: scattered[index] };
    const home = { opacity: 1, transform: "none" };

    return letter.animate(direction === "in" ? [away, home] : [home, away], {
      delay: Math.random() * timing.stagger,
      duration: timing.duration,
      easing: timing.easing,
      fill: direction === "in" ? "backwards" : "forwards",
    });
  });
}

/** Fisher–Yates, so every order is equally likely. */
function shuffledIndexes(length: number) {
  const order = Array.from({ length }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Shuffled once per page load. The server snapshot is null, so prerendering
// and hydration show no quote rather than one the browser then swaps out.
let showOrder: number[] | null = null;
const getShowOrder = () => {
  showOrder ??= shuffledIndexes(quotes.length);
  return showOrder;
};
const getServerShowOrder = () => null;
const subscribeToNothing = () => () => {};

type EpigraphProps = {
  className?: string;
};

export function Epigraph({ className }: EpigraphProps) {
  const rootRef = useRef<HTMLQuoteElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);
  const isVisibleRef = useRef(true);
  const shownIndexRef = useRef<number | null>(null);
  const order = useSyncExternalStore(
    subscribeToNothing,
    getShowOrder,
    getServerShowOrder,
  );
  const [position, setPosition] = useState(0);
  const quoteIndex = order?.[position] ?? null;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  // Layout effect, so a new quote's letters are already scattered on the
  // frame they first paint.
  useLayoutEffect(() => {
    const container = lettersRef.current;
    if (!container || quoteIndex === null) {
      return undefined;
    }

    let animations: Animation[] = [];
    let holdId: number | null = null;
    let isCancelled = false;

    const play = (direction: "in" | "out") => {
      animations = animateLetters(container, direction);
      return Promise.all(animations.map((animation) => animation.finished));
    };

    // Only counts down while the quote is on screen, so nobody misses one.
    const hold = () =>
      new Promise<void>((resolve) => {
        let remaining = HOLD_MS;
        holdId = window.setInterval(() => {
          if (isVisibleRef.current && !document.hidden) {
            remaining -= HOLD_TICK_MS;
          }
          if (remaining <= 0 && holdId !== null) {
            window.clearInterval(holdId);
            holdId = null;
            resolve();
          }
        }, HOLD_TICK_MS);
      });

    const cycle = async () => {
      if (shownIndexRef.current !== quoteIndex) {
        await play("in");
        shownIndexRef.current = quoteIndex;
      }
      if (quotes.length < 2) {
        return;
      }
      await hold();
      await play("out");
      if (!isCancelled) {
        setPosition((current) => (current + 1) % quotes.length);
      }
    };

    // Cancelled animations reject `finished`; the cleanup below owns that.
    cycle().catch(() => undefined);

    return () => {
      isCancelled = true;
      if (holdId !== null) {
        window.clearInterval(holdId);
      }
      animations.forEach((animation) => animation.cancel());
    };
  }, [quoteIndex]);

  return (
    <blockquote
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
    >
      {quotes.map((text, index) => (
        <p key={index} className={styles.sizer} aria-hidden="true">
          {withSparkles(text)}
        </p>
      ))}
      <p className={styles.quote}>
        {quoteIndex !== null && (
          <>
            <span className="srOnly">{quotes[quoteIndex]}</span>
            <span key={quoteIndex} ref={lettersRef} aria-hidden="true">
              {withSparkles(quotes[quoteIndex])
                .split(" ")
                .map((word, wordIndex) => (
                  <Fragment key={wordIndex}>
                    {wordIndex > 0 && " "}
                    <span
                      className={styles.word}
                      style={{ "--word-index": wordIndex } as CSSProperties}
                    >
                      {splitLetters(word).map((char, charIndex) => (
                        <span
                          key={charIndex}
                          className={
                            char === SPARKLE
                              ? `${styles.letter} ${styles.sparkle}`
                              : styles.letter
                          }
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  </Fragment>
                ))}
            </span>
          </>
        )}
      </p>
    </blockquote>
  );
}
