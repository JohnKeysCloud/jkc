"use client";

import {
  type AnimationEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import styles from "./CycloneCarousel.module.scss";
import type { CycloneCarouselProps } from "./CycloneCarousel.types";

type Direction = "left" | "right";

/**
 * Slides fade in from the side they travel from, the arrows spin when
 * engaged, and each slide's index and caption surface while a control is.
 * Input waits until the leaving slide has finished its exit.
 */
export function CycloneCarousel({
  slides,
  label,
  className,
  style,
  captions = true,
  overlay,
  onChange,
  ref,
}: CycloneCarouselProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const count = slides.length;

  const go = (target: number) => {
    if (leaving !== null || target === index) {
      return;
    }
    rootRef.current
      ?.querySelector<HTMLVideoElement>(`[data-slide="${index}"] video`)
      ?.pause();
    setDirection(target > index ? "right" : "left");
    setLeaving(index);
    setIndex(target);
    onChange?.(target);
  };

  const step = (delta: number) => go((index + delta + count) % count);

  // The host's handle is built once and steps through the latest render.
  const stepRef = useRef(step);
  useLayoutEffect(() => {
    stepRef.current = step;
  });
  useImperativeHandle(
    ref,
    () => ({
      previous: () => stepRef.current(-1),
      next: () => stepRef.current(1),
    }),
    [],
  );

  const handleLeft = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setLeaving(null);
    }
  };

  return (
    <section
      ref={rootRef}
      aria-label={label}
      aria-roledescription="carousel"
      className={
        className ? `${styles.carousel} ${className}` : styles.carousel
      }
      data-direction={direction ?? undefined}
      style={style}
    >
      <div className={styles.container}>
        <button
          aria-label="Previous slide"
          className={styles.arrow}
          onClick={() => step(-1)}
          type="button"
        />

        <div className={styles.slides}>
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.id}
              aria-label={`${slideIndex + 1} of ${count}`}
              aria-roledescription="slide"
              className={`${styles.slide}${
                slideIndex === index ? ` ${styles.active}` : ""
              }${slideIndex === leaving ? ` ${styles.leaving}` : ""}`}
              data-slide={slideIndex}
              onAnimationEnd={slideIndex === leaving ? handleLeft : undefined}
              role="group"
            >
              <figure className={styles.figure}>
                <span aria-hidden="true" className={styles.index}>
                  {slideIndex + 1}/{count}
                </span>
                {slide.kind === "video" && slide.video ? (
                  <video
                    aria-label={slide.alt}
                    className={styles.media}
                    controls
                    playsInline
                    poster={slide.src}
                    preload="none"
                    src={slide.video}
                  />
                ) : (
                  <picture>
                    <img
                      alt={slide.alt}
                      className={`${styles.media} ${styles.still}`}
                      decoding="async"
                      fetchPriority={slideIndex === 0 ? undefined : "low"}
                      height={slide.height}
                      src={slide.src}
                      width={slide.width}
                    />
                  </picture>
                )}
                {captions ? (
                  <figcaption aria-hidden="true" className={styles.caption}>
                    {slide.alt}
                  </figcaption>
                ) : null}
              </figure>
            </div>
          ))}
        </div>

        {overlay}

        <button
          aria-label="Next slide"
          className={`${styles.arrow} ${styles.next}`}
          onClick={() => step(1)}
          type="button"
        />
      </div>

      <div className={styles.navigation}>
        <div className={styles.dots}>
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              aria-current={slideIndex === index || undefined}
              aria-label={`Go to slide ${slideIndex + 1}`}
              className={styles.dot}
              onClick={() => go(slideIndex)}
              type="button"
            />
          ))}
        </div>
      </div>

      <p aria-live="polite" className="srOnly">
        Slide {index + 1} of {count}
      </p>
    </section>
  );
}
