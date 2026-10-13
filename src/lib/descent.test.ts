import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampUnit, spanProgress } from "./descent.ts";

describe("clampUnit", () => {
  it("keeps values within 0 to 1", () => {
    assert.equal(clampUnit(-0.2), 0);
    assert.equal(clampUnit(0.4), 0.4);
    assert.equal(clampUnit(1.3), 1);
  });
});

describe("spanProgress", () => {
  const pan = { start: 1650, length: 1000 };

  it("holds at 0 until the span starts", () => {
    assert.equal(spanProgress(0, pan), 0);
    assert.equal(spanProgress(1650, pan), 0);
  });

  it("runs linearly across the span", () => {
    assert.equal(spanProgress(1900, pan), 0.25);
    assert.equal(spanProgress(2150, pan), 0.5);
  });

  it("holds at 1 once the span ends", () => {
    assert.equal(spanProgress(2650, pan), 1);
    assert.equal(spanProgress(9000, pan), 1);
  });

  it("treats a span with no length as finished", () => {
    assert.equal(spanProgress(0, { start: 0, length: 0 }), 1);
  });
});
