"use client";

import { useSyncExternalStore } from "react";

type CurrentYearProps = {
  /** Year rendered on the server; the page is prerendered at build time. */
  fallback: number;
};

const subscribe = () => () => {};
const getYear = () => new Date().getFullYear();

export function CurrentYear({ fallback }: CurrentYearProps) {
  return useSyncExternalStore(subscribe, getYear, () => fallback);
}
