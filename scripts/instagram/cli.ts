import { appendFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { site } from "../../src/content/site.ts";
import { createInstagramApi } from "./api.ts";
import { createDownloader } from "./download.ts";
import { describeError } from "./errors.ts";
import { importExport } from "./export.ts";
import { processImage, validateVideo } from "./process.ts";
import { formatReport } from "./report.ts";
import { createStore } from "./store.ts";
import { sync } from "./sync.ts";

const USAGE = `Usage: npm run instagram -- <command>

  sync [--dry-run] [--retry-failed] [--report <file>]
  refresh-token --out <file>
  import-export <export-folder> [--include-missing]

See docs/instagram-sync.md.`;

const SECONDS_PER_DAY = 86_400;

function requireToken(): string {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "INSTAGRAM_ACCESS_TOKEN is not set. See docs/instagram-sync.md.",
    );
  }
  return token;
}

function publishReport(report: string, file: string | undefined) {
  process.stdout.write(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  if (file) {
    writeFileSync(file, report);
  }
}

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean" },
      "include-missing": { type: "boolean" },
      out: { type: "string" },
      report: { type: "string" },
      "retry-failed": { type: "boolean" },
    },
  });
  const [command, argument] = positionals;
  const store = createStore({ rootDir: process.cwd() });

  switch (command) {
    case "sync": {
      const result = await sync(
        {
          api: createInstagramApi({ accessToken: requireToken() }),
          download: createDownloader(),
          processImage,
          validateVideo,
          store,
          log: console.log,
        },
        {
          dryRun: values["dry-run"],
          retryFailed: values["retry-failed"],
        },
      );
      publishReport(formatReport(result), values.report);
      return result.ok ? 0 : 1;
    }

    // The new token goes to a file, never stdout, so CI logs can't leak it.
    case "refresh-token": {
      if (!values.out) {
        throw new Error("refresh-token needs --out <file>");
      }
      const api = createInstagramApi({ accessToken: requireToken() });
      const { accessToken, expiresIn } = await api.refreshToken();
      writeFileSync(values.out, accessToken, { mode: 0o600 });
      console.log(
        `Token refreshed; valid for ${Math.round(expiresIn / SECONDS_PER_DAY)} days.`,
      );
      return 0;
    }

    case "import-export": {
      if (!argument) {
        throw new Error("import-export needs the unzipped export folder");
      }
      const profileUrl = site.socials.find(
        (social) => social.icon === "instagram",
      )?.href;
      if (!profileUrl) {
        throw new Error("No Instagram link in src/content/site.ts");
      }
      const result = await importExport({
        root: argument,
        store,
        processImage,
        validateVideo,
        profileUrl,
        includeMissing: values["include-missing"],
        log: console.log,
      });
      console.log(
        `Imported ${result.added.length}, resolved ${result.resolvedGaps.length} gap(s), skipped ${result.skipped}, failed ${result.failed.length}.`,
      );
      return result.failed.length > 0 ? 1 : 0;
    }

    default:
      console.error(USAGE);
      return 2;
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(describeError(error));
    process.exitCode = 1;
  },
);
