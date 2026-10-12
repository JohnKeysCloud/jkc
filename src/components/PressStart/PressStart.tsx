"use client";

import type { MouseEvent } from "react";
import { measureEnd } from "@/lib/descent";
import { haptic } from "@/lib/haptics";
import { isPlainClick } from "@/lib/plainClick";
import { awardInteraction } from "@/lib/score";
import { slideTo } from "@/lib/slideTo";

// Long enough that the social icons still spin in one by one as the slide
// eases to a stop.
const PRESS_START_MS = 4400;

type PressStartProps = {
  className?: string;
  targetId: string;
};

export function PressStart({ className, targetId }: PressStartProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target || !isPlainClick(event)) {
      return;
    }

    event.preventDefault();
    haptic("press");
    awardInteraction("press-start");
    slideTo(measureEnd(target, "socials"), PRESS_START_MS);
  };

  return (
    <a className={className} href={`#${targetId}`} onClick={handleClick}>
      PRESS START
    </a>
  );
}
