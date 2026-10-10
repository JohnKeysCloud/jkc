import { test as base, expect, type Page } from "@playwright/test";
import sharp from "sharp";

// `e2e/fixtures/instagram/posts.json`: 30 posts, one a day back from
// 2026-09-30, stored out of order. Post 1 is a carousel of three, post 4 a
// video, and post 3's image is made to fail below.
const NEWEST = "2026-09-30T18:00:00.000Z";
const CAROUSEL = "2026-09-29T18:00:00.000Z";
const BROKEN_POST = "179000000000003";
const BROKEN_PUBLISHED = "2026-09-27T18:00:00.000Z";
const VIDEO = "2026-09-26T18:00:00.000Z";
const PAGE_SIZE = 24;
const TOTAL = 30;

const tileImage = sharp({
  create: { width: 640, height: 800, channels: 3, background: "#7fff00" },
})
  .webp()
  .toBuffer();

/** Serves stand-in media for every post and records uncaught page errors. */
const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const body = await tileImage;
      await page.route("**/instagram/**", (route) => {
        const { pathname } = new URL(route.request().url());
        if (
          pathname.includes(`/${BROKEN_POST}/`) ||
          pathname.endsWith(".mp4")
        ) {
          return route.fulfill({ status: 404 });
        }
        return route.fulfill({ body, contentType: "image/webp" });
      });
      await use(errors);
    },
    { auto: true },
  ],
});

const tiles = (page: Page) => page.locator("[data-published]");

async function publishedOrder(page: Page) {
  return tiles(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-published") ?? ""),
  );
}

async function columnCount(page: Page) {
  return page
    .locator("main ul")
    .evaluate(
      (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    );
}

test("shows three columns on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/gallery");

  expect(await columnCount(page)).toBe(3);
  const firstRow = await tiles(page).evaluateAll((nodes) =>
    nodes.slice(0, 4).map((node) => node.getBoundingClientRect().top),
  );
  expect(new Set(firstRow.slice(0, 3)).size).toBe(1);
  expect(firstRow[3]).toBeGreaterThan(firstRow[0]);
});

test("keeps three columns on a phone without overflowing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/gallery");

  expect(await columnCount(page)).toBe(3);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("orders posts newest first", async ({ page }) => {
  await page.goto("/gallery");

  const order = await publishedOrder(page);
  expect(order).toHaveLength(PAGE_SIZE);
  expect(order[0]).toBe(NEWEST);
  expect(order).toEqual([...order].sort().reverse());
});

test("loads older posts as the reader scrolls, still in order", async ({
  page,
}) => {
  await page.goto("/gallery");
  await expect(tiles(page)).toHaveCount(PAGE_SIZE);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(tiles(page)).toHaveCount(TOTAL);

  const order = await publishedOrder(page);
  expect(order).toEqual([...order].sort().reverse());
  expect(new Set(order).size).toBe(TOTAL);
});

test("offers a retry when a page of posts fails to load", async ({ page }) => {
  let failNext = true;
  await page.route("**/gallery/posts/2", (route) => {
    if (failNext) {
      failNext = false;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/gallery");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(tiles(page)).toHaveCount(TOTAL);
});

test("steps through a carousel's items in order", async ({ page }) => {
  await page.goto("/gallery");
  await page.locator(`[data-published="${CAROUSEL}"]`).click();

  const dialog = page.getByRole("dialog");
  const media = dialog.locator("img");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 / 3")).toBeVisible();
  await expect(media).toHaveAttribute("src", /\/0-1440\.webp$/);

  await dialog.getByRole("button", { name: "Next item" }).click();
  await expect(dialog.getByText("2 / 3")).toBeVisible();
  await expect(media).toHaveAttribute("src", /\/1-1440\.webp$/);

  await page.keyboard.press("ArrowRight");
  await expect(media).toHaveAttribute("src", /\/2-1440\.webp$/);
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("1 / 3")).toBeVisible();

  await expect(
    dialog.getByRole("link", { name: /View on Instagram/ }),
  ).toHaveAttribute("href", "https://www.instagram.com/p/fixture1/");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("plays videos from the stored file with a poster", async ({ page }) => {
  await page.goto("/gallery");
  await page.locator(`[data-published="${VIDEO}"]`).click();

  const video = page.getByRole("dialog").locator("video");
  await expect(video).toHaveAttribute("poster", /\/0-1440\.webp$/);
  await expect(video).toHaveAttribute("src", /\/0\.mp4$/);
  await expect(video).toHaveAttribute("preload", "none");
});

test("shows a placeholder for a missing image without breaking the page", async ({
  page,
  pageErrors,
}) => {
  await page.goto("/gallery");

  const broken = page.locator(`[data-published="${BROKEN_PUBLISHED}"]`);
  await expect(broken).toContainText("Image unavailable");
  await expect(tiles(page).first().locator("img")).toBeVisible();
  await expect(tiles(page)).toHaveCount(PAGE_SIZE);
  expect(pageErrors).toEqual([]);
});

test("is reachable from the home page footer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible();
});
