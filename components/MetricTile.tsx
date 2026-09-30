import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon; label: string; value: string; hint?: string; accent?: boolean };

export default function MetricTile({ icon: Icon, label, value, hint, accent = false }: Props) {
  return (
    <div className={`rounded-3xl p-4 ${accent ? "bg-leaf-soft" : "bg-surface shadow-card"}`}>
      <p className={`flex items-center gap-1.5 text-[12px] font-semibold ${accent ? "text-leaf-deep" : "text-ink-muted"}`}>
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl leading-none font-black text-navy tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-ink-muted">{hint}</p>}
    </div>
  );
}
