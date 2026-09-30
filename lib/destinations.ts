export type PressureLevel = "LOW" | "MODERATE" | "HIGH";

export type Interest = "Beaches" | "Nature" | "Food" | "Culture" | "Adventure";

export type Destination = {
  slug: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  interests: Interest[];
  highlight: string;
  image: string;
  /** Months (1–12) of peak / shoulder travel season. Feeds the Seasonality factor. */
  peakMonths: number[];
  shoulderMonths: number[];
  /** 0–100: how sensitive the environment is to visitor pressure (small island, reefs, protected area = high). */
  sensitivity: number;
  /**
   * Hand-set 0–100 Density / Popularity factors, used only when there is no Apify data
   * (no cache and Apify unavailable). Scored with the same formula and labelled "baseline data".
   */
  baseline: { density: number; popularity: number };
};

export const INTERESTS: Interest[] = ["Beaches", "Nature", "Food", "Culture", "Adventure"];

/** Score → level thresholds from docs/PLAN.md §9 (0–39 LOW, 40–69 MODERATE, 70–100 HIGH). */
export function pressureLevel(score: number): PressureLevel {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

export const DESTINATIONS: Destination[] = [
  {
    slug: "boracay",
    name: "Boracay",
    region: "Aklan",
    lat: 11.9674,
    lng: 121.9248,
    interests: ["Beaches", "Food", "Adventure"],
    highlight: "Powdery White Beach, sunset sails and a lively beachfront.",
    image: "/images/destinations/boracay.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 85,
    baseline: { density: 92, popularity: 95 },
  },
  {
    slug: "el-nido",
    name: "El Nido",
    region: "Palawan",
    lat: 11.1956,
    lng: 119.4075,
    interests: ["Beaches", "Nature", "Adventure"],
    highlight: "Limestone cliffs, hidden lagoons and island-hopping in Bacuit Bay.",
    image: "/images/destinations/el-nido.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 90,
    baseline: { density: 85, popularity: 88 },
  },
  {
    slug: "coron",
    name: "Coron",
    region: "Palawan",
    lat: 11.9986,
    lng: 120.2043,
    interests: ["Beaches", "Nature", "Adventure"],
    highlight: "Glass-clear lakes, reef snorkeling and WWII wreck dives.",
    image: "/images/destinations/coron.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 85,
    baseline: { density: 80, popularity: 82 },
  },
  {
    slug: "siargao",
    name: "Siargao",
    region: "Surigao del Norte",
    lat: 9.8482,
    lng: 126.0458,
    interests: ["Beaches", "Adventure", "Food"],
    highlight: "Surf breaks, palm-lined roads and tidal rock pools.",
    image: "/images/destinations/siargao.webp",
    peakMonths: [3, 4, 5, 8, 9, 10],
    shoulderMonths: [6, 7],
    sensitivity: 75,
    baseline: { density: 72, popularity: 80 },
  },
  {
    slug: "panglao",
    name: "Panglao",
    region: "Bohol",
    lat: 9.5794,
    lng: 123.7471,
    interests: ["Beaches", "Nature", "Culture"],
    highlight: "Alona Beach sunsets, dive walls and day trips to the Chocolate Hills.",
    image: "/images/destinations/panglao.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 70,
    baseline: { density: 75, popularity: 78 },
  },
  {
    slug: "baguio",
    name: "Baguio",
    region: "Benguet",
    lat: 16.4023,
    lng: 120.596,
    interests: ["Culture", "Food", "Nature"],
    highlight: "Cool pine air, night markets and highland food culture.",
    image: "/images/destinations/baguio.webp",
    peakMonths: [12, 1, 2, 3, 4],
    shoulderMonths: [5, 11],
    sensitivity: 50,
    baseline: { density: 85, popularity: 85 },
  },
  {
    slug: "siquijor",
    name: "Siquijor",
    region: "Siquijor",
    lat: 9.1999,
    lng: 123.595,
    interests: ["Beaches", "Nature", "Culture"],
    highlight: "Waterfalls, healing-village traditions and quiet coves.",
    image: "/images/destinations/siquijor.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 70,
    baseline: { density: 40, popularity: 48 },
  },
  {
    slug: "batanes",
    name: "Batanes",
    region: "Batanes",
    lat: 20.4487,
    lng: 121.9702,
    interests: ["Nature", "Culture", "Adventure"],
    highlight: "Rolling hills, stone houses and wide-open northern seascapes.",
    image: "/images/destinations/batanes.webp",
    peakMonths: [3, 4, 5],
    shoulderMonths: [2, 6],
    sensitivity: 90,
    baseline: { density: 25, popularity: 40 },
  },
  {
    slug: "camiguin",
    name: "Camiguin",
    region: "Camiguin",
    lat: 9.1732,
    lng: 124.7299,
    interests: ["Beaches", "Nature", "Adventure"],
    highlight: "Volcano views, hot springs and the White Island sandbar.",
    image: "/images/destinations/camiguin.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 75,
    baseline: { density: 35, popularity: 45 },
  },
  {
    slug: "port-barton",
    name: "Port Barton",
    region: "Palawan",
    lat: 10.4058,
    lng: 119.1535,
    interests: ["Beaches", "Nature", "Food"],
    highlight: "A slow-paced Palawan bay with island hops and starfish shallows.",
    image: "/images/destinations/port-barton.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 80,
    baseline: { density: 25, popularity: 30 },
  },
  {
    slug: "caramoan",
    name: "Caramoan",
    region: "Camarines Sur",
    lat: 13.7707,
    lng: 123.8631,
    interests: ["Beaches", "Nature", "Adventure"],
    highlight: "Secluded islets, limestone karsts and uncrowded beaches.",
    image: "/images/destinations/caramoan.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 80,
    baseline: { density: 20, popularity: 25 },
  },
  {
    slug: "sagada",
    name: "Sagada",
    region: "Mountain Province",
    lat: 17.0839,
    lng: 120.9007,
    interests: ["Nature", "Culture", "Adventure"],
    highlight: "Rice terraces, cave treks and Igorot heritage.",
    image: "/images/destinations/sagada.webp",
    peakMonths: [12, 1, 2, 3, 4, 5],
    shoulderMonths: [6, 11],
    sensitivity: 75,
    baseline: { density: 35, popularity: 45 },
  },
];

export function getDestination(slug: string) {
  return DESTINATIONS.find((d) => d.slug === slug);
}

export function searchDestinations(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DESTINATIONS.filter(
    (d) => d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q),
  );
}

/** URL-safe slug: "Puerto Galera" → "puerto-galera". */
export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
