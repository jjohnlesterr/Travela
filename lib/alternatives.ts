/** Greener alternative: a similar destination with meaningfully lower estimated pressure (pure, deterministic). */
import { pressureLevel, type Destination, type Interest, type PressureLevel } from "./destinations";

/** Show the alternative section at or above this score; below it, show the positive "nice pick" card. */
export const SHOW_ALTERNATIVE_AT = 55;
const MIN_SCORE_GAP = 15;
const MIN_SIMILARITY = 0.25;

export type Alternative = {
  destination: Destination;
  score: number;
  level: PressureLevel;
  similarity: number;
  reasons: string[];
};

const NOUN: Record<Interest, string> = {
  Beaches: "beach",
  Nature: "nature",
  Food: "food",
  Culture: "culture",
  Adventure: "adventure",
};

export function jaccard<T>(a: T[], b: T[]) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

function joinWords(words: string[]) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

export function pickAlternative(
  selected: { slug: string; score: number; interests: Interest[] },
  candidates: { destination: Destination; score: number }[],
): Alternative | null {
  let best: Alternative | null = null;
  let bestRank = -Infinity;

  for (const c of candidates) {
    if (c.destination.slug === selected.slug) continue;
    if (c.score > selected.score - MIN_SCORE_GAP) continue;
    const similarity = jaccard(selected.interests, c.destination.interests);
    if (similarity < MIN_SIMILARITY) continue;
    const rank = similarity * 0.6 + ((selected.score - c.score) / 100) * 0.4;
    if (rank <= bestRank) continue;
    bestRank = rank;

    const shared = c.destination.interests.filter((i) => selected.interests.includes(i)).map((i) => NOUN[i]);
    best = {
      destination: c.destination,
      score: c.score,
      level: pressureLevel(c.score),
      similarity,
      reasons: [
        `Similar ${joinWords(shared)} experience`,
        `About ${selected.score - c.score} points lower estimated pressure`,
        c.destination.highlight,
      ],
    };
  }

  return best;
}
