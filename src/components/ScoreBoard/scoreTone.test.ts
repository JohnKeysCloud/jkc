import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLOUD_ENTRY, CLOUD_EXIT, toneAt } from "./scoreTone.ts";

describe("toneAt", () => {
  it("stays light over the sky before the clouds arrive", () => {
    assert.equal(toneAt({ rise: 0, part: 0 }), "light");
    assert.equal(toneAt({ rise: CLOUD_ENTRY, part: 0 }), "light");
  });

  it("turns dark while the cloud bank covers the corner", () => {
    assert.equal(toneAt({ rise: CLOUD_ENTRY + 0.01, part: 0 }), "dark");
    assert.equal(toneAt({ rise: 1, part: 0.5 }), "dark");
  });

  it("returns to light once the clouds have parted", () => {
    assert.equal(toneAt({ rise: 1, part: CLOUD_EXIT }), "light");
    assert.equal(toneAt({ rise: 1, part: 1 }), "light");
  });
});
