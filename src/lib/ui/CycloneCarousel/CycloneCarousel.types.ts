import type { CSSProperties, ReactNode, Ref } from "react";

export type CycloneCarouselSlide = {
  id: string;
  kind: "image" | "video";
  /** The image, or the video's poster. */
  src: string;
  /** Absent for a video that couldn't be stored; its poster shows instead. */
  video?: string;
  alt: string;
  width: number;
  height: number;
};

export type CycloneCarouselHandle = {
  previous: () => void;
  next: () => void;
};

export type CycloneCarouselProps = {
  slides: CycloneCarouselSlide[];
  /** Names the carousel for assistive technology. */
  label: string;
  /**
   * Set `--cyclone-carousel-ratio` (default `16 / 9`),
   * `--cyclone-carousel-inline-size` (default `min(100vw, 45rem)`),
   * `--cyclone-carousel-navigation-block-size` (default `3rem`), and
   * `--cyclone-carousel-radius` (default square below 45rem, `1rem` from
   * there) here, through `style`, or on an ancestor to fit a host.
   */
  className?: string;
  style?: CSSProperties;
  /**
   * Shows each slide's `alt` along its bottom edge while a control is
   * engaged. Turn off when `overlay` already captions the slides.
   * @default true
   */
  captions?: boolean;
  /**
   * Pinned over the slides, above their motion. Position it absolutely;
   * the slide frame is its containing block.
   */
  overlay?: ReactNode;
  onChange?: (index: number) => void;
  /** Steps the carousel from outside, e.g. from a host's arrow keys. */
  ref?: Ref<CycloneCarouselHandle>;
};
