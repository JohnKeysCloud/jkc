/**
 * The arcade score kept across the site. Each scoring moment pays once per
 * tab session, so scrolling back and forth can't farm points. The running
 * score lives in `sessionStorage`; the high score in `localStorage`. Storage
 * can be blocked (some private modes), in which case both live in memory for
 * the page view.
 */

import { SCORING_ENABLED } from "./features.ts";

export type ScoreSnapshot = { score: number; high: number };

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const VERSION = 1;
export const SESSION_KEY = "jkc-score";
export const HIGH_KEY = "jkc-high-score";

/** Points for the page's own moments, beyond the Pac-Man chase. */
export const INTERACTION_POINTS = {
  "press-start": 50,
  moon: 100,
  "master-key": 100,
  music: 50,
  "gallery-post": 100,
  message: 1000,
} as const;

export type Interaction = keyof typeof INTERACTION_POINTS;

const isPoints = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function parse(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The session's score and what has paid, or a fresh start if unreadable. */
export function readSession(raw: string | null): {
  score: number;
  awarded: Set<string>;
} {
  const value = parse(raw);
  if (
    value?.version !== VERSION ||
    !isPoints(value.score) ||
    !Array.isArray(value.awarded) ||
    !value.awarded.every((id) => typeof id === "string")
  ) {
    return { score: 0, awarded: new Set() };
  }
  return { score: value.score, awarded: new Set(value.awarded as string[]) };
}

/** The saved high score, or 0 if missing, malformed, or tampered with. */
export function readHigh(raw: string | null): number {
  const value = parse(raw);
  return value?.version === VERSION && isPoints(value.value) ? value.value : 0;
}

function tryRead(storage: StorageLike | null, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function tryWrite(
  storage: StorageLike | null,
  key: string,
  value: Record<string, unknown>,
) {
  try {
    storage?.setItem(key, JSON.stringify({ version: VERSION, ...value }));
  } catch {
    // Kept in memory for this page view.
  }
}

export function createScore(
  getStorage: () => { session: StorageLike | null; local: StorageLike | null },
) {
  let loaded: {
    score: number;
    awarded: Set<string>;
    high: number;
    snapshot: ScoreSnapshot;
  } | null = null;
  const listeners = new Set<() => void>();

  const load = () => {
    if (!loaded) {
      const { session, local } = getStorage();
      const { score, awarded } = readSession(tryRead(session, SESSION_KEY));
      const high = Math.max(readHigh(tryRead(local, HIGH_KEY)), score);
      loaded = { score, awarded, high, snapshot: { score, high } };
    }
    return loaded;
  };

  const emit = () => listeners.forEach((listener) => listener());

  return {
    getSnapshot(): ScoreSnapshot {
      return load().snapshot;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Pays `points` for `id` unless it already paid this session. */
    award(id: string, points: number): boolean {
      const state = load();
      if (state.awarded.has(id) || !isPoints(points) || points === 0) {
        return false;
      }
      const { session, local } = getStorage();
      state.awarded.add(id);
      state.score += points;
      tryWrite(session, SESSION_KEY, {
        score: state.score,
        awarded: [...state.awarded],
      });
      if (state.score > state.high) {
        state.high = state.score;
        tryWrite(local, HIGH_KEY, { value: state.high });
      }
      state.snapshot = { score: state.score, high: state.high };
      emit();
      return true;
    },

    /** Takes a higher score saved by another tab. */
    syncHigh(raw: string | null) {
      const state = load();
      const high = readHigh(raw);
      if (high > state.high) {
        state.high = high;
        state.snapshot = { score: state.score, high };
        emit();
      }
    },
  };
}

function browserStorage() {
  const tryGet = (get: () => Storage) => {
    try {
      return get();
    } catch {
      return null;
    }
  };
  return {
    session: tryGet(() => window.sessionStorage),
    local: tryGet(() => window.localStorage),
  };
}

const store = createScore(browserStorage);

export const { getSnapshot } = store;
export const getServerSnapshot = (): ScoreSnapshot | null => null;

export function award(id: string, points: number): boolean {
  return SCORING_ENABLED && store.award(id, points);
}

export function awardInteraction(interaction: Interaction): boolean {
  return award(interaction, INTERACTION_POINTS[interaction]);
}

export function subscribe(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === HIGH_KEY) {
      store.syncHigh(event.newValue);
    }
  };
  window.addEventListener("storage", handleStorage);
  const unsubscribe = store.subscribe(listener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    unsubscribe();
  };
}
