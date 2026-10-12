"use client";

import type { MouseEvent } from "react";
import { measureEnd } from "@/lib/descent";
import { isPlainClick } from "@/lib/plainClick";
import { slideTo } from "@/lib/slideTo";

type GalleryLinkProps = {
  className?: string;
  /** The descent whose pan reveals the gallery. */
  descentId: string;
  galleryId: string;
};

export function GalleryLink({
  className,
  descentId,
  galleryId,
}: GalleryLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const descent = document.getElementById(descentId);
    if (!descent || !isPlainClick(event)) {
      return;
    }

    event.preventDefault();
    slideTo(measureEnd(descent, "pan"));
  };

  return (
    <a className={className} href={`#${galleryId}`} onClick={handleClick}>
      Gallery
    </a>
  );
}
