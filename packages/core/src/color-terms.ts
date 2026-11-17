/**
 * The imported catalog names colours in English ("Black", "Jade White"). German
 * searches map onto the English word as well, so "PLA Schwarz" finds "Black".
 */
const GERMAN_COLOR_TERMS: Record<string, string> = {
  schwarz: "black",
  weiss: "white",
  weiß: "white",
  grau: "gray",
  silber: "silver",
  rot: "red",
  orange: "orange",
  gelb: "yellow",
  gruen: "green",
  grün: "green",
  blau: "blue",
  hellblau: "light blue",
  dunkelblau: "dark blue",
  türkis: "turquoise",
  tuerkis: "turquoise",
  lila: "purple",
  violett: "violet",
  pink: "pink",
  rosa: "pink",
  braun: "brown",
  beige: "beige",
  gold: "gold",
  bronze: "bronze",
  kupfer: "copper",
  transparent: "clear",
  durchsichtig: "clear",
  natur: "natural",
};

/** Search alternatives for one term: the term itself plus an English colour word, if any. */
export function colorSearchTerms(term: string): string[] {
  const english = GERMAN_COLOR_TERMS[term.trim().toLowerCase()];
  return english && english !== term.trim().toLowerCase() ? [term, english] : [term];
}
