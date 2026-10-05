import type { NextConfig } from "next";

const DEV_APP_PORT = (process.env.PORT ?? "3000").trim();

/** Host-only or full-origin entries Next may compare during dev-resource checks. */
function expandDevOrigin(origin: string): string[] {
  const trimmed = origin.trim();
  if (!trimmed) {
    return [];
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return [trimmed];
  }

  const host = trimmed.replace(/\/+$/, "");
  return [host, `http://${host}:${DEV_APP_PORT}`];
}

/**
 * Lets phones on the local network load dev resources (HMR, client chunks).
 * `npm run env:lan` writes `NEXT_ALLOWED_DEV_ORIGINS` and `NEXT_DEV_LAN_HOST`
 * to `.env.local`; without them, a LAN device renders the page but never
 * hydrates.
 */
function buildAllowedDevOrigins(): string[] {
  const origins = [
    ...(process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "").split(","),
    process.env.NEXT_DEV_LAN_HOST ?? "",
  ];

  return Array.from(new Set(origins.flatMap(expandDevOrigin)));
}

const nextConfig: NextConfig = {
  allowedDevOrigins: buildAllowedDevOrigins(),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
