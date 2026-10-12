import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MUTED,
  PACMAN,
  SPEAKER,
  WAVE_FAR,
  WAVE_NEAR,
  assignSources,
  toCells,
} from "./sprites.ts";

const key = ({ x, y }: { x: number; y: number }) => `${x},${y}`;

describe("toCells", () => {
  it("splits each rectangle into its pixels", () => {
    assert.deepEqual(toCells([[2, 3, 2, 2]]), [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ]);
  });

  it("counts the speaker's pixels", () => {
    assert.equal(toCells(SPEAKER).length, 36);
    assert.equal(toCells(MUTED).length, 8);
    assert.equal(toCells([...WAVE_NEAR, ...WAVE_FAR]).length, 12);
  });
});

describe("PACMAN", () => {
  it("fits the toggle's 12 by 10 grid", () => {
    assert.ok(PACMAN.every(({ x, y }) => x >= 0 && x < 12 && y >= 0 && y < 10));
  });

  it("is symmetric top to bottom, mouth and all", () => {
    const cells = new Set(PACMAN.map((cell) => `${key(cell)},${cell.isMouth}`));
    assert.ok(
      PACMAN.every((cell) =>
        cells.has(`${cell.x},${9 - cell.y},${cell.isMouth}`),
      ),
    );
  });
});

describe("assignSources", () => {
  for (const [name, art] of [
    ["muted", [...SPEAKER, ...MUTED]],
    ["playing", [...SPEAKER, ...WAVE_NEAR, ...WAVE_FAR]],
  ] as const) {
    const sources = toCells(art);
    const morph = assignSources(PACMAN, sources);

    it(`gives every Pac-Man pixel a ${name} speaker pixel`, () => {
      assert.equal(morph.length, PACMAN.length);
      const sourceKeys = new Set(sources.map(key));
      assert.ok(
        morph.every((cell) =>
          sourceKeys.has(
            key({ x: cell.x + cell.fromX, y: cell.y + cell.fromY }),
          ),
        ),
      );
    });

    it(`covers every ${name} speaker pixel without the mouth`, () => {
      const covered = new Set(
        morph
          .filter((cell) => !cell.isMouth)
          .map((cell) =>
            key({ x: cell.x + cell.fromX, y: cell.y + cell.fromY }),
          ),
      );
      assert.equal(covered.size, sources.length);
    });

    it(`staggers the ${name} morph from 0 to 1`, () => {
      const delays = morph.map((cell) => cell.delay);
      assert.equal(Math.min(...delays), 0);
      assert.equal(Math.max(...delays), 1);
    });
  }

  it("is deterministic", () => {
    const sources = toCells(SPEAKER);
    assert.deepEqual(
      assignSources(PACMAN, sources),
      assignSources(PACMAN, sources),
    );
  });
});
