import type { LatLng } from "@/lib/route";

const W = 320;
const H = 200;
const PAD = 26;

/**
 * Lightweight SVG route sketch: stops projected onto a box (equirectangular, longitude scaled by
 * cos(latitude)), numbered in visiting order. Fallback for when the Leaflet map can't load.
 */
export default function RouteSketch({ stops, origin, label }: { stops: (LatLng & { name: string })[]; origin: LatLng | null; label: string }) {
  const all = origin ? [origin, ...stops] : stops;
  if (!stops.length) return null;

  const k = Math.cos((all.reduce((s, p) => s + p.lat, 0) / all.length) * (Math.PI / 180));
  const xs = all.map((p) => p.lng * k);
  const ys = all.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1e-4);
  const scale = Math.min((W - PAD * 2) / Math.max(maxX - minX, span * 0.2), (H - PAD * 2) / Math.max(maxY - minY, span * 0.2));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const project = (p: LatLng) => ({ x: W / 2 + (p.lng * k - cx) * scale, y: H / 2 - (p.lat - cy) * scale });

  const pts = stops.map(project);
  const o = origin ? project(origin) : null;
  const line = [...(o ? [o] : []), ...pts].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-3xl bg-sky/10" role="img" aria-label={label}>
      <defs>
        <linearGradient id="route-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--color-ocean)" />
          <stop offset="1" stopColor="var(--color-leaf)" />
        </linearGradient>
        <pattern id="route-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--color-line)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#route-grid)" opacity="0.7" />
      <polyline points={line} fill="none" stroke="url(#route-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {o && (
        <g>
          <circle cx={o.x} cy={o.y} r="9" fill="var(--color-surface)" stroke="var(--color-ocean)" strokeWidth="3" />
          <circle cx={o.x} cy={o.y} r="3.5" fill="var(--color-ocean)" />
        </g>
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="11" fill={i === 0 && !o ? "var(--color-leaf-deep)" : "var(--color-navy)"} stroke="white" strokeWidth="2.5" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
