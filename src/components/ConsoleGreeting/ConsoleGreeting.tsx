"use client";

import { useEffect } from "react";
import { site } from "@/content/site";

// Module scope, so remounts (and Strict Mode's double effects) greet once.
let hasGreeted = false;

/** A quiet hello for whoever opens DevTools. */
export function ConsoleGreeting() {
  useEffect(() => {
    if (hasGreeted) {
      return;
    }
    hasGreeted = true;

    const palette = getComputedStyle(document.documentElement);
    const color = (name: string) => palette.getPropertyValue(name).trim();

    console.log(
      `%c${site.signature.text.toLowerCase()} 💭`,
      [
        `background: ${color("--color-night")}`,
        `border: 1px solid ${color("--color-funky")}`,
        "border-radius: 999px",
        `color: ${color("--color-funky")}`,
        "font-family: ui-monospace, monospace",
        "font-size: 14px",
        "padding: 6px 14px",
        `text-shadow: 0 0 6px ${color("--color-funky")}`,
      ].join(";"),
    );
  }, []);

  return null;
}
