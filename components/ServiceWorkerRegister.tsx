"use client";

import { useEffect } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

declare global {
  interface Window {
    __travelaInstallPrompt?: InstallPromptEvent | null;
  }
}

/**
 * Registers public/sw.js in production only (avoids stale caches during `next dev`), and keeps the
 * browser's install prompt so Profile can offer "Install Travela" later (the event fires only once, early).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      window.__travelaInstallPrompt = e as InstallPromptEvent;
      window.dispatchEvent(new Event("travela:installable"));
    }
    window.addEventListener("beforeinstallprompt", onPrompt);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}
