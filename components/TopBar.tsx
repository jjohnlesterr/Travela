"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Props = {
  title?: string;
  /** Float over a photo header instead of sitting on the page background. */
  overlay?: boolean;
};

export default function TopBar({ title, overlay = false }: Props) {
  const router = useRouter();

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div
      className={`${overlay ? "absolute inset-x-0 top-0 z-20" : "sticky top-0 z-20 bg-sand/90 backdrop-blur-md"} flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-2`}
    >
      <button
        type="button"
        onClick={back}
        aria-label="Go back"
        className={`flex size-11 items-center justify-center rounded-full transition-transform active:scale-95 ${
          overlay ? "bg-white/85 text-navy shadow-card backdrop-blur-md" : "text-navy hover:bg-navy-soft"
        }`}
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      {title && <h1 className="truncate font-display text-lg font-extrabold text-navy">{title}</h1>}
    </div>
  );
}
