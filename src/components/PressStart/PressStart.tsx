"use client";

import type { MouseEvent } from "react";
import { measureDescentEnd } from "@/lib/descent";
import { easeInOutSine } from "@/lib/easing";
import { haptic } from "@/lib/haptics";

const SLIDE_DURATION_MS = 3400;
const INTERRUPT_EVENTS = ["wheel", "touchstart", "keydown"] as const;

let cancelActiveSlide: (() => void) | null = null;

function slideTo(destination: number) {
  cancelActiveSlide?.();

  const start = window.scrollY;
  const distance = destination - start;
  const startTime = performance.now();
  let frameId: number | null = null;

  const cancel = () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    INTERRUPT_EVENTS.forEach((type) =>
      window.removeEventListener(type, cancel),
    );
    cancelActiveSlide = null;
  };

  const step = (now: number) => {
    const progress = Math.min((now - startTime) / SLIDE_DURATION_MS, 1);
    window.scrollTo(0, start + distance * easeInOutSine(progress));
    if (progress < 1) {
      frameId = window.requestAnimationFrame(step);
    } else {
      cancel();
    }
  };

  INTERRUPT_EVENTS.forEach((type) =>
    window.addEventListener(type, cancel, { passive: true }),
  );
  cancelActiveSlide = cancel;
  frameId = window.requestAnimationFrame(step);
}

type PressStartProps = {
  className?: string;
  targetId: string;
};

export function PressStart({ className, targetId }: PressStartProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    event.preventDefault();
    haptic("press");
    const destination = measureDescentEnd(target);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, destination);
      return;
    }

    slideTo(destination);
  };

  return (
    <a className={className} href={`#${targetId}`} onClick={handleClick}>
      PRESS START
    </a>
  );
}
