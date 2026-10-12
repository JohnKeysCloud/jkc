import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPlainClick } from "./plainClick.ts";

const PLAIN = {
  altKey: false,
  button: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};

describe("isPlainClick", () => {
  it("takes a bare primary click", () => {
    assert.equal(isPlainClick(PLAIN), true);
  });

  it("leaves other buttons to the browser", () => {
    assert.equal(isPlainClick({ ...PLAIN, button: 1 }), false);
  });

  it("leaves modified clicks to the browser", () => {
    assert.equal(isPlainClick({ ...PLAIN, altKey: true }), false);
    assert.equal(isPlainClick({ ...PLAIN, ctrlKey: true }), false);
    assert.equal(isPlainClick({ ...PLAIN, metaKey: true }), false);
    assert.equal(isPlainClick({ ...PLAIN, shiftKey: true }), false);
  });
});
