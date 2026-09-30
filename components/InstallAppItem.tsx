"use client";

import { useSyncExternalStore } from "react";
import { Check, Download } from "lucide-react";

type State = "installed" | "prompt" | "ios" | "manual";

function subscribe(cb: () => void) {
  window.addEventListener("travela:installable", cb);
  window.addEventListener("appinstalled", cb);
  return () => {
    window.removeEventListener("travela:installable", cb);
    window.removeEventListener("appinstalled", cb);
  };
}

function snapshot(): State {
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if (window.__travelaInstallPrompt) return "prompt";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "manual";
}

const COPY: Record<State, string> = {
  installed: "Travela is installed on this device.",
  prompt: "Add to your home screen for an app-like experience.",
  ios: "In Safari, tap Share, then “Add to Home Screen”.",
  manual: "Use your browser menu → “Install app” or “Add to Home screen”.",
};

/** Profile row: install button when the browser offers a prompt, otherwise a short how-to. */
export default function InstallAppItem() {
  const state = useSyncExternalStore(subscribe, snapshot, () => "manual" as State);

  async function install() {
    const e = window.__travelaInstallPrompt;
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => null);
    window.__travelaInstallPrompt = null;
    window.dispatchEvent(new Event("travela:installable"));
  }

  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-3">
      {state === "installed" ? (
        <Check className="size-5 shrink-0 text-leaf" aria-hidden />
      ) : (
        <Download className="size-5 shrink-0 text-ocean" aria-hidden />
      )}
      <div className="flex-1">
        <p className="font-semibold text-navy">Install Travela</p>
        <p className="text-[13px] text-ink-muted">{COPY[state]}</p>
      </div>
      {state === "prompt" && (
        <button type="button" onClick={install} className="h-10 shrink-0 rounded-full bg-navy px-4 text-sm font-semibold text-white">
          Install
        </button>
      )}
    </li>
  );
}
