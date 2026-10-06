"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import styles from "./SoundToggle.module.scss";

// AAC with an edit list that trims the encoder priming, so the loop has no
// gap in Chromium or Safari.
const TRACK = "/cloudy.m4a";
const VOLUME = 0.5;
const STORAGE_KEY = "jkc-sound";
const RESUME_EVENTS = ["click", "keydown"] as const;

type Pixel = readonly [x: number, y: number, width: number, height: number];

const SPEAKER: readonly Pixel[] = [
  [1, 3, 3, 4],
  [4, 2, 1, 6],
  [5, 1, 1, 8],
  [6, 0, 1, 10],
];
const WAVE_NEAR: readonly Pixel[] = [
  [8, 3, 1, 1],
  [9, 4, 1, 2],
  [8, 6, 1, 1],
];
const WAVE_FAR: readonly Pixel[] = [
  [10, 1, 1, 1],
  [11, 2, 1, 6],
  [10, 8, 1, 1],
];
const MUTED: readonly Pixel[] = [
  [8, 3, 1, 1],
  [9, 4, 1, 1],
  [10, 5, 1, 1],
  [11, 6, 1, 1],
  [11, 3, 1, 1],
  [10, 4, 1, 1],
  [9, 5, 1, 1],
  [8, 6, 1, 1],
];

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

  const toggle = () => {
    haptic();
    writeOptIn(!isOn);
    if (isOn) {
      getTrack().pause();
      setIsOn(false);
    } else {
      play();
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
      <svg
        aria-hidden="true"
        className={styles.icon}
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
    </button>
  );
}
