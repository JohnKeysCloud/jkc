import type { GapReason } from "./store.ts";
import type { SyncResult } from "./sync.ts";

const GAP_REASONS: Record<GapReason, string> = {
  "no-media": "API returned no media; backfill from the account export",
  "video-unavailable":
    "video not downloadable (often licensed audio); poster only",
  "video-too-large": "video over the size cap; poster only",
};

/** Past this, a first import would bury the report under ids. */
const MAX_LISTED_IDS = 10;

function list(ids: string[]): string {
  if (ids.length === 0) {
    return "none";
  }
  return ids.length > MAX_LISTED_IDS
    ? String(ids.length)
    : `${ids.length} (${ids.join(", ")})`;
}

/** Markdown for the workflow summary and the failure issue. */
export function formatReport(result: SyncResult): string {
  const lines = [
    `## Instagram sync ${result.ok ? "succeeded" : "failed"}`,
    "",
    `- Posts listed: ${result.listed}${result.listingComplete ? "" : " (listing incomplete)"}`,
    `- Added: ${list(result.added)}`,
    `- Captions updated: ${list(result.updated)}`,
    `- Removed: ${list(result.removed)}`,
    `- Last successful sync: ${result.lastSuccessAt ?? "never"}`,
  ];

  if (result.fatalError) {
    lines.push("", `**Listing error:** ${result.fatalError}`);
  }

  if (result.failures.length > 0) {
    lines.push("", "### Failed posts", "");
    result.failures.forEach((failure) => {
      const waiting = result.skipped.includes(failure.id)
        ? " (waiting on `--retry-failed`)"
        : "";
      lines.push(
        `- [${failure.id}](${failure.permalink}): ${failure.lastError}, attempt ${failure.attempts}${waiting}`,
      );
    });
  }

  if (result.gaps.length > 0) {
    lines.push("", "### Known gaps", "");
    result.gaps.forEach((gap) =>
      lines.push(
        `- [${gap.id}](${gap.permalink}) from ${gap.publishedAt.slice(0, 10)}: ${GAP_REASONS[gap.reason]}`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
}
