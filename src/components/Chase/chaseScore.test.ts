import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GHOST_CHAIN, pointsFor } from "./chaseScore.ts";

describe("pointsFor", () => {
  it("pays arcade values", () => {
    assert.equal(pointsFor("dot"), 10);
    assert.equal(pointsFor("power"), 50);
    assert.equal(pointsFor("cherry"), 100);
  });

  it("doubles each ghost on one power pellet", () => {
    assert.deepEqual(
      [0, 1, 2, 3].map((index) => pointsFor("ghost", index)),
      [200, 400, 800, 1600],
    );
    assert.equal(
      GHOST_CHAIN.reduce((sum, points) => sum + points, 0),
      3000,
    );
  });

  it("caps the chain at 1600", () => {
    assert.equal(pointsFor("ghost", 7), 1600);
  });
});
