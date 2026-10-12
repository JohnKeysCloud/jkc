/** Art-pixel grid the skyline is drawn on; one unit renders as `--sky-pixel`. */
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 44;
/** Column held under the centre of the card, between the midtown icons. */
export const ANCHOR_X = 240;
// Manhattan's span; the streets past it carry on under the gallery.
const MANHATTAN_WIDTH = 480;

export type Block = { x: number; y: number; width: number; height: number };
export type LitBlock = Block & { isLit: boolean };
export type WindowTone = "amber" | "cyan" | "magenta";
export type LitWindow = Block & {
  delay: number;
  duration: number;
  isTwinkling: boolean;
  tone: WindowTone;
};

type Tier = [width: number, height: number, isLit?: boolean];

type Landmark = {
  align?: "center" | "start";
  /** Blinking aircraft warning light on the spire. */
  hasBeacon?: boolean;
  center: number;
  /** Stacked from the street up. */
  tiers: Tier[];
};

// Looking east across the Hudson: uptown on the left, downtown on the right,
// with the midtown icons around `ANCHOR_X` so narrow screens crop to them.
const LANDMARKS: Landmark[] = [
  // Central Park Tower, 111 West 57th, 432 Park Avenue
  {
    center: 108,
    tiers: [
      [7, 26],
      [5, 4],
      [3, 2],
    ],
  },
  {
    center: 121,
    tiers: [
      [4, 22],
      [3, 5],
      [2, 4],
      [1, 2],
    ],
  },
  { center: 133, tiers: [[4, 31]] },
  // 30 Hudson Yards, stepping down to the west
  {
    align: "start",
    center: 166,
    tiers: [
      [9, 14],
      [7, 9],
      [5, 4],
    ],
  },
  // Empire State Building, crown lit
  {
    center: 222,
    hasBeacon: true,
    tiers: [
      [13, 14],
      [9, 7],
      [7, 4],
      [5, 2, true],
      [3, 2, true],
      [1, 5],
    ],
  },
  // Chrysler Building, terraced crown lit
  {
    center: 254,
    tiers: [
      [9, 16],
      [7, 5],
      [5, 2, true],
      [4, 2, true],
      [3, 2, true],
      [2, 2],
      [1, 4],
    ],
  },
  // One World Trade Center, then 3 WTC, 4 WTC and 8 Spruce
  {
    center: 298,
    hasBeacon: true,
    tiers: [
      [11, 8],
      [9, 8],
      [7, 7],
      [5, 6],
      [3, 3],
      [1, 6],
    ],
  },
  { center: 314, tiers: [[7, 24]] },
  { center: 324, tiers: [[6, 19]] },
  {
    center: 338,
    tiers: [
      [5, 20],
      [3, 2],
    ],
  },
];

const WINDOW_TONES: WindowTone[] = ["amber", "amber", "cyan", "magenta"];

type Random = () => number;

/** Park–Miller generator; seeded so server and client draw the same city. */
function createRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function randomInt(random: Random, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function raiseStreet(
  random: Random,
  [from, to]: [number, number],
  [minWidth, maxWidth]: [number, number],
  [minHeight, maxHeight]: [number, number],
  maxGap: number,
): Block[] {
  const blocks: Block[] = [];
  for (let x = from; x < to;) {
    const width = randomInt(random, minWidth, maxWidth);
    const height = randomInt(random, minHeight, maxHeight);
    blocks.push({ height, width, x, y: VIEW_HEIGHT - height });
    x += width + randomInt(random, 0, maxGap);
  }
  return blocks;
}

function streetEnd(blocks: Block[]): number {
  const last = blocks.at(-1);
  return last ? last.x + last.width : 0;
}

function raiseLandmark({ align = "center", center, tiers }: Landmark) {
  const left = center - Math.floor(tiers[0][0] / 2);
  let top = VIEW_HEIGHT;
  return tiers.map(([width, height, isLit = false]): LitBlock => {
    top -= height;
    return {
      height,
      isLit,
      width,
      x: align === "start" ? left : center - Math.floor(width / 2),
      y: top,
    };
  });
}

// Tank on two stubby legs, perched on wider roofs.
function raiseWaterTower({ x, y }: Block): Block[] {
  return [
    { height: 2, width: 3, x: x + 1, y: y - 3 },
    { height: 1, width: 1, x: x + 1, y: y - 1 },
    { height: 1, width: 1, x: x + 3, y: y - 1 },
  ];
}

function lightWindows(random: Random, blocks: Block[]): LitWindow[] {
  return blocks.flatMap((block) => {
    const lit: LitWindow[] = [];
    for (let y = block.y + 2; y < VIEW_HEIGHT - 1; y += 2) {
      for (let x = block.x + 1; x < block.x + block.width - 1; x += 2) {
        if (random() < 0.16) {
          lit.push({
            delay: -randomInt(random, 0, 90) / 10,
            duration: randomInt(random, 40, 90) / 10,
            height: 1,
            isTwinkling: random() < 0.3,
            tone: WINDOW_TONES[randomInt(random, 0, WINDOW_TONES.length - 1)],
            width: 1,
            x,
            y,
          });
        }
      }
    }
    return lit;
  });
}

// Each stretch draws from its own seed, so widening the city never reshuffles
// the stretch already drawn.
function raiseDistrict(
  seed: number,
  [farFrom, nearFrom]: [number, number],
  to: number,
) {
  const random = createRandom(seed);
  const far = raiseStreet(random, [farFrom, to], [3, 7], [10, 24], 0);
  const near = raiseStreet(random, [nearFrom, to], [4, 9], [4, 13], 1);
  const towers = near
    .filter((block) => block.width >= 5 && random() < 0.3)
    .flatMap(raiseWaterTower);
  return { far, near, towers, windows: lightWindows(random, near) };
}

const manhattan = raiseDistrict(1955, [0, 0], MANHATTAN_WIDTH);
const beyond = raiseDistrict(
  2026,
  [streetEnd(manhattan.far), streetEnd(manhattan.near)],
  VIEW_WIDTH,
);

export const farBlocks = [...manhattan.far, ...beyond.far];
export const landmarkBlocks = LANDMARKS.flatMap(raiseLandmark);
export const nearBlocks = [...manhattan.near, ...beyond.near];
export const waterTowers = [...manhattan.towers, ...beyond.towers];
export const windows = [...manhattan.windows, ...beyond.windows];
export const beacons: Block[] = LANDMARKS.filter(
  ({ hasBeacon }) => hasBeacon,
).map(({ center, tiers }) => ({
  height: 1,
  width: 1,
  x: center,
  y: VIEW_HEIGHT - tiers.reduce((sum, [, height]) => sum + height, 0) - 1,
}));
