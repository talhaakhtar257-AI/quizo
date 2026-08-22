"use client";

import { useEffect } from "react";

export function ExitFullscreenOnMount() {
  useEffect(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);
  return null;
}
