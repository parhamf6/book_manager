"use client";

import { useEffect } from "react";

/** Registers the service worker for offline support. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("service worker registration failed:", err);
      });
    }
  }, []);
  return null;
}
