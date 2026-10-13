import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { SCORING_ENABLED } from "../src/lib/features";

// Builds against `e2e/fixtures/instagram`: 24 posts on the first page, 30 in
// all. Images aren't stubbed here; missing ones fall back to placeholders.
const PAGE_SIZE = 24;
const TOTAL = 30;

const gallery = (page: Page) => page.locator("#gallery");
const masterKey = (page: Page) =>
  page.getByRole("button", { name: "Master key" });

/** Mirrors `measureSpan(root, "pan")` from `src/lib/descent.ts`, in page scroll. */
function panSpan(page: Page) {
  return page.evaluate(() => {
    const root = document.getElementById("card");
    const stage = root?.firstElementChild;
    const spacer = root?.querySelector<HTMLElement>(
      ':scope > [data-travel="pan"]',
    );
    if (!root || !(stage instanceof HTMLElement) || !spacer) {
      throw new Error("Descent markup changed");
    }
    const start = root.offsetTop + spacer.offsetTop - stage.offsetHeight;
    return { start, end: start + spacer.offsetHeight };
  });
}

/** Mirrors `measureEnd(root, "pan")` from `src/lib/descent.ts`. */
async function panEnd(page: Page) {
  return (await panSpan(page)).end;
}

/** Scrolls to `y` and waits for the scroll loops to paint it. */
function scrollToSettled(page: Page, y: number) {
  return page.evaluate(
    (top) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, top);
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
    y,
  );
}

/** Scrolls from `from` to `to` in small steps, as a reader would. */
async function scrub(page: Page, from: number, to: number, steps = 24) {
  for (let step = 0; step <= steps; step += 1) {
    await scrollToSettled(page, from + ((to - from) * step) / steps);
  }
}

const SCORE_SENTENCE = /^Score [\d,]+, high score [\d,]+$/;
const scoreBoard = (page: Page) =>
  page.locator("p").filter({ has: page.getByText(SCORE_SENTENCE) });
const spell = (points: number) => points.toLocaleString("en-US");

/** The speaker glyph and the Pac-Man sprite, in that order, by opacity. */
function toggleArt(page: Page) {
  return page
    .getByRole("button", { name: "Music" })
    .evaluate((button) =>
      [...button.querySelectorAll("svg")].map(
        (svg) => getComputedStyle(svg).opacity,
      ),
    );
}

const chaseState = (page: Page, id: string) =>
  page.locator(`[data-id="${id}"]`).getAttribute("data-state");

/** WCAG relative luminance of an sRGB color. */
function luminance([red, green, blue]: number[]) {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * The score panel's lowest contrast: each of its text colors against the
 * worst composited pixel behind the digits, with the text itself hidden.
 */
async function scoreContrast(page: Page) {
  const panel = scoreBoard(page).locator(":scope > span");
  const colors = await panel.evaluate((node) =>
    [node, ...node.children].map((child) =>
      (getComputedStyle(child).color.match(/\d+/g) ?? []).map(Number),
    ),
  );
  const setTextHidden = (isHidden: boolean) =>
    panel.evaluate((node, hide) => {
      [...node.children].forEach((child) => {
        const { style } = child as HTMLElement;
        style.color = hide ? "transparent" : "";
        style.transition = hide ? "none" : "";
      });
    }, isHidden);
  const clip = await panel.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(node).paddingTop);
    return {
      x: box.x + inset,
      y: box.y + inset,
      width: box.width - 2 * inset,
      height: box.height - 2 * inset,
    };
  });
  await setTextHidden(true);
  const { data, info } = await sharp(await page.screenshot({ clip }))
    .raw()
    .toBuffer({ resolveWithObject: true });
  await setTextHidden(false);

  const texts = colors.map(luminance);
  let lowest = Infinity;
  for (let index = 0; index < data.length; index += info.channels) {
    const backdrop = luminance([data[index], data[index + 1], data[index + 2]]);
    texts.forEach((text) => {
      lowest = Math.min(lowest, contrast(text, backdrop));
    });
  }
  return lowest;
}

function galleryBox(page: Page) {
  return gallery(page).evaluate((node) => {
    const { left, top } = node.getBoundingClientRect();
    return { left: Math.round(left), top: Math.round(top) };
  });
}

function soundToggleLeft(page: Page) {
  return page
    .getByRole("button", { name: "Music" })
    .evaluate((node) => Math.round(node.getBoundingClientRect().left));
}

async function isCardInert(page: Page) {
  return page
    .locator("main")
    .evaluate((card) => card.closest("[inert]") !== null);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test("pans the gallery in from the right past the card", async ({ page }) => {
  await page.goto("/");
  await expect(gallery(page)).toHaveAttribute("inert", "");
  expect((await galleryBox(page)).left).toBeGreaterThanOrEqual(1270);
  expect(await soundToggleLeft(page)).toBeLessThan(640);

  await page.evaluate((y) => window.scrollTo(0, y), await panEnd(page));

  await expect.poll(() => galleryBox(page)).toEqual({ left: 0, top: 0 });
  // Crosses to the top-right corner, clear of the turned key.
  await expect.poll(() => soundToggleLeft(page)).toBeGreaterThan(640);
  await expect(gallery(page)).not.toHaveAttribute("inert");
  await expect.poll(() => isCardInert(page)).toBe(true);
  await expect(masterKey(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-published]")).toHaveCount(PAGE_SIZE);
});

test("scrolls on through the gallery, loading older posts", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((y) => window.scrollTo(0, y), await panEnd(page));
  await expect.poll(() => galleryBox(page)).toEqual({ left: 0, top: 0 });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator("[data-published]")).toHaveCount(TOTAL);
  expect((await galleryBox(page)).top).toBeLessThan(0);
});

test("turns the key to reach the gallery and back", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "PRESS START" }).click();
  await expect(masterKey(page)).toHaveAttribute("aria-pressed", "false");

  await masterKey(page).click();
  await expect.poll(() => galleryBox(page)).toEqual({ left: 0, top: 0 });
  await expect(masterKey(page)).toHaveAttribute("aria-pressed", "true");

  await masterKey(page).click();
  await expect(masterKey(page)).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => isCardInert(page)).toBe(false);
  await expect(gallery(page)).toHaveAttribute("inert", "");
});

test("deep links to the gallery", async ({ page }) => {
  await page.goto("/#gallery");
  await expect.poll(() => galleryBox(page)).toEqual({ left: 0, top: 0 });
  await expect(masterKey(page)).toHaveAttribute("aria-pressed", "true");
});

test("pans back to the gallery from the footer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect.poll(() => galleryBox(page)).toEqual({ left: 0, top: 0 });
});

test("opens a post from the home page gallery", async ({ page }) => {
  await page.goto("/#gallery");
  await expect.poll(() => galleryBox(page)).toEqual({ left: 0, top: 0 });

  await page.locator("[data-published]").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("never scrolls sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.evaluate((y) => window.scrollTo(0, y), await panEnd(page));
  await expect.poll(() => galleryBox(page)).toEqual({ left: 0, top: 0 });
  expect(await overflow()).toBeLessThanOrEqual(0);
});

/** Scrubs halfway across the pan; returns how many dots the route laid. */
async function scrubToMidCrossing(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-ready]")).toHaveCount(1);
  const dots = await page.locator('[data-id^="dot-"]').count();
  const { start, end } = await panSpan(page);
  await scrub(page, start, start + (end - start) * 0.5);
  return dots;
}

/**
 * Narrower but as tall, so the scroll lengths, all in viewport heights, hold
 * Pac-Man where he is while the route lays fewer dots.
 */
async function narrowMidCrossing(page: Page, dotsBefore: number) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await page.setViewportSize({ width: 800, height: viewport?.height ?? 0 });
  await expect
    .poll(() => page.locator('[data-id^="dot-"]').count())
    .not.toBe(dotsBefore);
}

test("Pac-Man clears the chase across the pan", async ({ page }) => {
  await page.goto("/");
  // The chase is set up once it has measured its route.
  await expect(page.locator("[data-ready]")).toHaveCount(1);
  const { start, end } = await panSpan(page);
  const dots = await page.locator('[data-id^="dot-"]').count();
  expect(dots).toBeGreaterThan(0);

  await scrollToSettled(page, start);
  await scrub(page, start, start + (end - start) * 0.3);
  await expect(page.locator("html")).toHaveAttribute("data-panning", "");
  await expect.poll(() => toggleArt(page)).toEqual(["0", "1"]);
  expect(await chaseState(page, "power")).toBe("eaten");
  expect(await chaseState(page, "dot-0")).toBe("eaten");
  expect(await chaseState(page, "pinky")).toMatch(/^(frightened|flickering)$/);

  await scrub(page, start + (end - start) * 0.3, end);
  await expect(page.locator('[data-state="eaten"]')).toHaveCount(dots + 6);
  await expect.poll(() => toggleArt(page)).toEqual(["1", "0"]);
});

test("keeps what Pac-Man has eaten through a resize", async ({ page }) => {
  await narrowMidCrossing(page, await scrubToMidCrossing(page));

  const dots = await page.locator('[data-id^="dot-"]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      at: Number((node as HTMLElement).style.getPropertyValue("--at")),
      state: node.getAttribute("data-state"),
    })),
  );
  // Pac-Man sits halfway; his mouth reaches a little either side.
  dots
    .filter(({ at }) => at < 0.45)
    .forEach(({ state }) => expect(state).toBe("eaten"));
  dots
    .filter(({ at }) => at > 0.55)
    .forEach(({ state }) => expect(state).toBe("ready"));
  expect(await chaseState(page, "pinky")).toBe("eaten");
  expect(await chaseState(page, "inky")).toMatch(/^(frightened|flickering)$/);
});

test("keeps the chase out of reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const { start, end } = await panSpan(page);

  await scrub(page, start, start + (end - start) * 0.5, 12);
  await expect(page.locator('[data-id="binky"]')).toBeHidden();
  expect(await toggleArt(page)).toEqual(["1", "0"]);
  await scrub(page, start + (end - start) * 0.5, end, 12);
  await expect(scoreBoard(page)).toHaveCount(0);
});

test.describe("the score", () => {
  test.skip(!SCORING_ENABLED, "Scoring is off in `src/lib/features.ts`.");

  test("pays once for the chase", async ({ page }) => {
    await page.goto("/");
    await expect(scoreBoard(page)).toHaveCount(0);
    await expect(page.locator("[data-ready]")).toHaveCount(1);
    const { start, end } = await panSpan(page);
    const dots = await page.locator('[data-id^="dot-"]').count();
    const total = dots * 10 + 50 + 200 + 400 + 800 + 1600 + 100;
    const sentence = `Score ${spell(total)}, high score ${spell(total)}`;

    await scrollToSettled(page, start);
    await scrub(page, start, end);
    await expect(page.getByText(SCORE_SENTENCE)).toHaveText(sentence);
    // The digits are decoration; screen readers get the sentence.
    await expect(scoreBoard(page)).toMatchAriaSnapshot(
      `- paragraph: ${sentence}`,
    );

    // Back and forth again pays nothing more.
    await scrub(page, end, start);
    await scrub(page, start, end);
    await expect(page.getByText(SCORE_SENTENCE)).toHaveText(sentence);
  });

  test("keeps the score through a resize", async ({ page }) => {
    const dots = await scrubToMidCrossing(page);
    const score = await page.getByText(SCORE_SENTENCE).textContent();
    await narrowMidCrossing(page, dots);
    await expect(page.getByText(SCORE_SENTENCE)).toHaveText(score ?? "");
  });

  test("keeps the score readable over every backdrop", async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem(
        "jkc-score",
        JSON.stringify({ version: 1, score: 50, awarded: ["press-start"] }),
      );
    });

    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(scoreBoard(page)).toBeVisible();
      const { start, end } = await panSpan(page);
      const bottom = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      const stops = [
        // Sky, the cloud bank rising, the clouds parting, the card.
        0,
        viewport.height * 0.4,
        viewport.height,
        start * 0.5,
        start,
        // Mid-pan, the gallery, and the docked footer.
        (start + end) / 2,
        end + viewport.height,
        bottom,
      ];
      for (const y of stops) {
        await scrollToSettled(page, y);
        // Lets the tone's crossfade finish.
        await page.waitForTimeout(400);
        expect(await scoreContrast(page), `at ${y}px`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });
});

test("keeps scoring off behind its flag", async ({ page }) => {
  test.skip(SCORING_ENABLED, "Scoring is on in `src/lib/features.ts`.");
  // Reduced motion lands PRESS START at once, so the scrub isn't fought.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "PRESS START" }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("[data-ready]")).toHaveCount(1);
  const { start, end } = await panSpan(page);

  await scrollToSettled(page, start);
  await scrub(page, start, end);
  expect(await chaseState(page, "cherry")).toBe("eaten");
  await expect(scoreBoard(page)).toHaveCount(0);
  await expect(page.locator("[data-points]")).toHaveCount(0);
  await expect(page.locator('[data-id="cherry"]')).toHaveText("");
  expect(
    await page.evaluate(() => [
      window.sessionStorage.getItem("jkc-score"),
      window.localStorage.getItem("jkc-high-score"),
    ]),
  ).toEqual([null, null]);
});
