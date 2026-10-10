import type { InstagramPostType } from "@/lib/instagram";

type Pixel = readonly [x: number, y: number, width: number, height: number];

// Drawn on the same pixel grid as the sound toggle.
const ICONS: Partial<Record<InstagramPostType, readonly Pixel[]>> = {
  carousel: [
    [3, 0, 7, 1],
    [9, 1, 1, 6],
    [0, 3, 7, 7],
  ],
  video: [
    [2, 1, 2, 8],
    [4, 2, 2, 6],
    [6, 3, 2, 4],
    [8, 4, 1, 2],
  ],
};

/** Marks carousels and videos in the grid's corner, as Instagram does. */
export function GalleryBadge({
  className,
  type,
}: {
  className?: string;
  type: InstagramPostType;
}) {
  const pixels = ICONS[type];
  if (!pixels) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      shapeRendering="crispEdges"
      viewBox="0 0 10 10"
    >
      {pixels.map(([x, y, width, height]) => (
        <rect key={`${x}-${y}`} height={height} width={width} x={x} y={y} />
      ))}
    </svg>
  );
}
