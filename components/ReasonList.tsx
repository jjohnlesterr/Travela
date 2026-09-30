import { CircleDot } from "lucide-react";

export default function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {reasons.map((r) => (
        <li key={r} className="flex gap-2.5 text-[15px] leading-snug text-navy/90">
          <CircleDot className="mt-0.5 size-4 shrink-0 text-ocean" aria-hidden />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}
