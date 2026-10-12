"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { haptic } from "@/lib/haptics";
import { getSnapshot, subscribe } from "@/lib/panProgress";
import { awardInteraction } from "@/lib/score";
import styles from "./SoundToggle.module.scss";
import {
  MUTED,
  PACMAN,
  type Pixel,
  SPEAKER,
  WAVE_FAR,
  WAVE_NEAR,
  assignSources,
  toCells,
} from "./sprites";

// AAC with an edit list that trims the encoder priming, so the loop has no
// gap in Chromium or Safari.
const TRACK = "/cloudy.m4a";
const VOLUME = 0.5;
const STORAGE_KEY = "jkc-sound";
const RESUME_EVENTS = ["click", "keydown"] as const;
// Pac-Man stops chomping this long after the pan stops moving.
const SETTLE_MS = 120;

const PLAYING_CELLS = toCells([...SPEAKER, ...WAVE_NEAR, ...WAVE_FAR]);
const MUTED_CELLS = toCells([...SPEAKER, ...MUTED]);

function setFlag(name: string, value: string | null) {
  const root = document.documentElement;
  if (root.getAttribute(name) === value) {
    return;
  }
  if (value === null) {
    root.removeAttribute(name);
  } else {
    root.setAttribute(name, value);
  }
}

// Created on the first opt-in, so the track never weighs on the first load.
let track: HTMLAudioElement | null = null;

function getTrack() {
  if (!track) {
    track = new Audio(TRACK);
    track.loop = true;
    // iOS ignores this and plays at the system volume.
    track.volume = VOLUME;
  }
  return track;
}

// Storage can be unavailable (blocked cookies, some private modes); the toggle
// still works, it just isn't remembered.
function readOptIn() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function writeOptIn(isOn: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, isOn ? "on" : "off");
  } catch {
    // Not remembered; see `readOptIn`.
  }
}

function Pixels({
  className,
  pixels,
}: {
  className?: string;
  pixels: readonly Pixel[];
}) {
  return (
    <g className={className}>
      {pixels.map(([x, y, width, height]) => (
        <rect key={`${x}-${y}`} height={height} width={width} x={x} y={y} />
      ))}
    </g>
  );
}

/**
 * Plays the site's theme on request. Browsers only start audio from a click,
 * tap, or key press, so it starts off; a returning visitor who left it on gets
 * it back on their first interaction anywhere on the page.
 */
export function SoundToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOn, setIsOn] = useState(false);

  const play = useCallback(() => {
    setIsOn(true);
    return getTrack()
      .play()
      .then(
        () => true,
        () => {
          setIsOn(false);
          return false;
        },
      );
  }, []);

  useEffect(() => {
    if (!readOptIn()) {
      return undefined;
    }

    const stopListening = () =>
      RESUME_EVENTS.forEach((type) =>
        window.removeEventListener(type, resume, true),
      );

    function resume(event: Event) {
      // The toggle handles its own presses.
      if (buttonRef.current?.contains(event.target as Node)) {
        return;
      }
      if (!readOptIn()) {
        stopListening();
        return;
      }
      // Not every key press counts as a gesture (Escape doesn't), so keep
      // listening until playback actually starts.
      play().then((isPlaying) => {
        if (isPlaying) {
          stopListening();
        }
      });
    }

    RESUME_EVENTS.forEach((type) =>
      window.addEventListener(type, resume, true),
    );

    return stopListening;
  }, [play]);

  useEffect(() => {
    if (!isOn) {
      return undefined;
    }

    const audio = getTrack();

    const handleVisibility = () => {
      if (document.hidden) {
        audio.pause();
      } else {
        audio.play().catch(() => setIsOn(false));
      }
    };

    // Catches pauses from outside the page, like a phone call or unplugged
    // headphones, so the icon doesn't claim the music is still on.
    const handlePause = () => {
      if (!document.hidden) {
        setIsOn(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    audio.addEventListener("pause", handlePause);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      audio.removeEventListener("pause", handlePause);
    };
  }, [isOn]);

  // While the pan carries the toggle across as Pac-Man, he chomps only while
  // moving and faces the way he's going.
  useEffect(() => {
    let last = getSnapshot();
    let settleId: number | null = null;

    const settle = () => {
      settleId = null;
      setFlag("data-moving", null);
    };

    const stopSettling = () => {
      if (settleId !== null) {
        window.clearTimeout(settleId);
        settleId = null;
      }
    };

    const unsubscribe = subscribe(() => {
      const next = getSnapshot();
      if (next > 0 && next < 1) {
        setFlag("data-heading", next < last ? "left" : "right");
        setFlag("data-moving", "");
        stopSettling();
        settleId = window.setTimeout(settle, SETTLE_MS);
      } else {
        stopSettling();
        setFlag("data-heading", null);
        setFlag("data-moving", null);
      }
      last = next;
    });

    return () => {
      unsubscribe();
      stopSettling();
      setFlag("data-heading", null);
      setFlag("data-moving", null);
    };
  }, []);

  const morph = useMemo(
    () => assignSources(PACMAN, isOn ? PLAYING_CELLS : MUTED_CELLS),
    [isOn],
  );

  const toggle = () => {
    haptic();
    writeOptIn(!isOn);
    if (isOn) {
      getTrack().pause();
      setIsOn(false);
    } else {
      play().then((isPlaying) => {
        if (isPlaying) {
          awardInteraction("music");
        }
      });
    }
  };

  return (
    <button
      ref={buttonRef}
      aria-label="Music"
      aria-pressed={isOn}
      className={styles.root}
      onClick={toggle}
      type="button"
    >
      <span className={styles.icon}>
        <span className={styles.facing}>
          <svg
            aria-hidden="true"
            className={styles.glyph}
            shapeRendering="crispEdges"
            viewBox="0 0 12 10"
          >
            <Pixels pixels={SPEAKER} />
            {isOn ? (
              <>
                <Pixels className={styles.wave} pixels={WAVE_NEAR} />
                <Pixels className={styles.wave} pixels={WAVE_FAR} />
              </>
            ) : (
              <Pixels pixels={MUTED} />
            )}
          </svg>
          <svg
            aria-hidden="true"
            className={styles.sprite}
            shapeRendering="crispEdges"
            viewBox="0 0 12 10"
          >
            {morph.map(({ x, y, fromX, fromY, delay, isMouth }) => (
              <rect
                key={`${x}-${y}`}
                className={isMouth ? styles.mouth : undefined}
                height={1}
                style={
                  {
                    "--delay": delay,
                    "--from-x": fromX,
                    "--from-y": fromY,
                  } as CSSProperties
                }
                width={1}
                x={x}
                y={y}
              />
            ))}
          </svg>
        </span>
      </span>
    </button>
  );
}
