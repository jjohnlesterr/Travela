import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Sun } from "lucide-react";
import type { Weather } from "@/lib/weather";

const ICONS = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
} as const;

/** Frosted weather chip for photo headers. Renders nothing when weather is unavailable. */
export default function WeatherStrip({ weather }: { weather: Weather | null }) {
  if (!weather) return null;
  const Icon = ICONS[weather.icon];
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-white/85 py-1.5 pr-3.5 pl-2.5 text-[13px] font-semibold text-navy backdrop-blur-md">
      <Icon className="size-4 text-ocean" aria-hidden />
      <span className="tabular-nums">{weather.temperature}°C</span>
      <span className="font-normal text-ink-muted">{weather.label}</span>
      {weather.rainChance !== null && (
        <span className="flex items-center gap-0.5 font-normal text-ink-muted">
          <Droplets className="size-3.5" aria-hidden />
          <span className="tabular-nums">{weather.rainChance}%</span>
          <span className="sr-only">chance of rain</span>
        </span>
      )}
    </p>
  );
}
