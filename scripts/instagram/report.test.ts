import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatReport } from "./report.ts";
import type { SyncResult } from "./sync.ts";

function result(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    ok: true,
    listingComplete: true,
    listed: 0,
    added: [],
    updated: [],
    removed: [],
    skipped: [],
    failures: [],
    gaps: [],
    lastSuccessAt: null,
    ...overrides,
  };
}

describe("formatReport", () => {
  it("names the posts a routine run added", () => {
    const report = formatReport(result({ added: ["p1", "p2"] }));
    assert.match(report, /- Added: 2 \(p1, p2\)/);
  });

  it("only counts the posts a first import added", () => {
    const added = Array.from({ length: 206 }, (_, index) => `p${index}`);
    const report = formatReport(result({ added }));
    assert.match(report, /- Added: 206\n/);
    assert.doesNotMatch(report, /p205/);
  });

  it("flags posts waiting on --retry-failed", () => {
    const report = formatReport(
      result({
        ok: false,
        skipped: ["p1"],
        failures: [
          {
            id: "p1",
            permalink: "https://www.instagram.com/p/p1/",
            attempts: 5,
            lastError: "responded 403",
            lastAttemptAt: "2026-10-09T09:17:00.000Z",
          },
        ],
      }),
    );
    assert.match(report, /## Instagram sync failed/);
    assert.match(report, /attempt 5 \(waiting on `--retry-failed`\)/);
  });
});
