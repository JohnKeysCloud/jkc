import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HIGH_KEY,
  INTERACTION_POINTS,
  SESSION_KEY,
  createScore,
  readHigh,
  readSession,
} from "./score.ts";

function memoryStorage(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    items,
  };
}

const blocked = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("readSession", () => {
  it("reads a saved session", () => {
    const { score, awarded } = readSession(
      JSON.stringify({ version: 1, score: 60, awarded: ["chase:dot-0"] }),
    );
    assert.equal(score, 60);
    assert.deepEqual([...awarded], ["chase:dot-0"]);
  });

  it("starts fresh on missing, malformed, or tampered data", () => {
    [
      null,
      "not json",
      JSON.stringify({ version: 2, score: 60, awarded: [] }),
      JSON.stringify({ version: 1, score: -5, awarded: [] }),
      JSON.stringify({ version: 1, score: 1.5, awarded: [] }),
      JSON.stringify({ version: 1, score: 60, awarded: [7] }),
    ].forEach((raw) => assert.equal(readSession(raw).score, 0));
  });
});

describe("INTERACTION_POINTS", () => {
  it("pays whole, positive points for each moment", () => {
    Object.values(INTERACTION_POINTS).forEach((points) =>
      assert.ok(Number.isSafeInteger(points) && points > 0),
    );
  });
});

describe("readHigh", () => {
  it("accepts only whole, non-negative points", () => {
    assert.equal(readHigh(JSON.stringify({ version: 1, value: 4560 })), 4560);
    assert.equal(readHigh(JSON.stringify({ version: 1, value: "4560" })), 0);
    assert.equal(readHigh(JSON.stringify({ version: 1, value: 1e300 })), 0);
    assert.equal(readHigh("[]"), 0);
  });
});

describe("createScore", () => {
  it("pays each id once per session", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    const score = createScore(() => ({ session, local }));

    assert.equal(score.award("press-start", 50), true);
    assert.equal(score.award("press-start", 50), false);
    assert.deepEqual(score.getSnapshot(), { score: 50, high: 50 });
    assert.deepEqual(
      readSession(session.items.get(SESSION_KEY) ?? null).awarded,
      new Set(["press-start"]),
    );
  });

  it("keeps the session's awards across reloads", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    createScore(() => ({ session, local })).award("moon", 100);

    const reloaded = createScore(() => ({ session, local }));
    assert.equal(reloaded.award("moon", 100), false);
    assert.equal(reloaded.getSnapshot().score, 100);
  });

  it("raises the saved high score only when beaten", () => {
    const session = memoryStorage();
    const local = memoryStorage({
      [HIGH_KEY]: JSON.stringify({ version: 1, value: 120 }),
    });
    const score = createScore(() => ({ session, local }));

    score.award("moon", 100);
    assert.equal(readHigh(local.items.get(HIGH_KEY) ?? null), 120);
    score.award("press-start", 50);
    assert.equal(readHigh(local.items.get(HIGH_KEY) ?? null), 150);
    assert.deepEqual(score.getSnapshot(), { score: 150, high: 150 });
  });

  it("returns the same snapshot until something changes", () => {
    const score = createScore(() => ({ session: null, local: null }));
    const before = score.getSnapshot();
    assert.equal(score.getSnapshot(), before);
    score.award("moon", 100);
    assert.notEqual(score.getSnapshot(), before);
  });

  it("notifies subscribers on each payout", () => {
    const score = createScore(() => ({ session: null, local: null }));
    let calls = 0;
    const unsubscribe = score.subscribe(() => {
      calls += 1;
    });
    score.award("moon", 100);
    score.award("moon", 100);
    unsubscribe();
    score.award("press-start", 50);
    assert.equal(calls, 1);
  });

  it("falls back to memory when storage is blocked", () => {
    const score = createScore(() => ({ session: blocked, local: blocked }));
    assert.equal(score.award("moon", 100), true);
    assert.equal(score.award("moon", 100), false);
    assert.deepEqual(score.getSnapshot(), { score: 100, high: 100 });
  });

  it("ignores invalid points", () => {
    const score = createScore(() => ({ session: null, local: null }));
    assert.equal(score.award("bad", -10), false);
    assert.equal(score.award("bad", 0.5), false);
    assert.equal(score.getSnapshot().score, 0);
  });

  it("takes a higher score from another tab", () => {
    const score = createScore(() => ({ session: null, local: null }));
    score.syncHigh(JSON.stringify({ version: 1, value: 9000 }));
    assert.equal(score.getSnapshot().high, 9000);
    score.syncHigh(JSON.stringify({ version: 1, value: 10 }));
    assert.equal(score.getSnapshot().high, 9000);
  });
});
