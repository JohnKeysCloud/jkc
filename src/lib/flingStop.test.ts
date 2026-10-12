import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasCrossed, sideOf } from "./flingStop.ts";

const STOP = 7528.47;

describe("sideOf", () => {
  it("tells above, below, and on the stop apart", () => {
    assert.equal(sideOf(7000, STOP), -1);
    assert.equal(sideOf(8000, STOP), 1);
  });

  it("counts a scroll position rounded onto the stop as on it", () => {
    assert.equal(sideOf(7528, STOP), 0);
  });
});

describe("hasCrossed", () => {
  it("catches a fling down past the stop", () => {
    assert.equal(hasCrossed(-1, 7600, STOP), true);
  });

  it("catches a fling up past the stop", () => {
    assert.equal(hasCrossed(1, 7400, STOP), true);
  });

  it("lets a fling run on its own side", () => {
    assert.equal(hasCrossed(-1, 7400, STOP), false);
    assert.equal(hasCrossed(1, 9000, STOP), false);
  });

  it("lets a fling that set off from the stop run either way", () => {
    assert.equal(hasCrossed(0, 7000, STOP), false);
    assert.equal(hasCrossed(0, 9000, STOP), false);
  });
});
