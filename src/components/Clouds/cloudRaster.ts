export type Circle = {
  x: number;
  y: number;
  r: number;
};

export type CloudPalette = {
  outline: string;
  fill: string;
  shade: string;
};

type Tone = keyof CloudPalette;

export type Raster = {
  width: number;
  height: number;
  paths: Record<Tone, string>;
};

const SHADE_DEPTH = 2;
const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Rasterizes a union of circles into an outlined pixel cloud, shaded along
 * its underside. Returns one SVG path per tone, merged into horizontal runs.
 */
export function rasterizeCloud(circles: Circle[]): Raster {
  const minX = Math.floor(Math.min(...circles.map(({ x, r }) => x - r))) - 1;
  const minY = Math.floor(Math.min(...circles.map(({ y, r }) => y - r))) - 1;
  const maxX = Math.ceil(Math.max(...circles.map(({ x, r }) => x + r))) + 1;
  const maxY = Math.ceil(Math.max(...circles.map(({ y, r }) => y + r))) + 1;
  const width = maxX - minX;
  const height = maxY - minY;

  const inside = (x: number, y: number): boolean => {
    const pixelX = x + minX + 0.5;
    const pixelY = y + minY + 0.5;
    return circles.some(
      (circle) =>
        (pixelX - circle.x) ** 2 + (pixelY - circle.y) ** 2 <=
        circle.r * circle.r,
    );
  };

  const toneAt = (x: number, y: number): Tone | null => {
    if (inside(x, y)) {
      return inside(x, y + SHADE_DEPTH) ? "fill" : "shade";
    }
    return NEIGHBORS.some(([dx, dy]) => inside(x + dx, y + dy))
      ? "outline"
      : null;
  };

  const paths: Record<Tone, string> = { outline: "", fill: "", shade: "" };

  for (let y = 0; y < height; y += 1) {
    let runStart = 0;
    let runTone = toneAt(0, y);

    for (let x = 1; x <= width; x += 1) {
      const tone = x < width ? toneAt(x, y) : null;
      if (tone !== runTone) {
        if (runTone) {
          paths[runTone] +=
            `M${runStart} ${y}h${x - runStart}v1h${runStart - x}z`;
        }
        runStart = x;
        runTone = tone;
      }
    }
  }

  return { width, height, paths };
}
