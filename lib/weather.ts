/** Open-Meteo forecast (no API key). Display-only: weather never feeds the pressure score. */

export type Weather = {
  temperature: number;
  code: number;
  label: string;
  icon: "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "storm";
  rainChance: number | null;
};

const TIMEOUT_MS = 6000;

function describe(code: number): Pick<Weather, "label" | "icon"> {
  if (code === 0) return { label: "Clear sky", icon: "sun" };
  if (code <= 2) return { label: "Partly cloudy", icon: "cloud-sun" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Foggy", icon: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Rain showers", icon: "rain" };
  if (code >= 95) return { label: "Thunderstorms", icon: "storm" };
  return { label: "Cloudy", icon: "cloud" };
}

export async function getWeather(lat: number, lng: number): Promise<Weather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const json = await res.json();
    const temperature = json?.current?.temperature_2m;
    const code = json?.current?.weather_code;
    if (typeof temperature !== "number" || typeof code !== "number") return null;
    const rain = json?.daily?.precipitation_probability_max?.[0];
    return { temperature: Math.round(temperature), code, ...describe(code), rainChance: typeof rain === "number" ? rain : null };
  } catch (err) {
    console.warn("[weather] forecast failed:", (err as Error).message);
    return null;
  }
}
