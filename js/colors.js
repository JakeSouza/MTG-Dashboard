// Scryfall hosts these SVGs specifically for third-party embedding (the same
// symbols used across the deckbuilding ecosystem), so no need to redraw them.
const SYMBOL_URL = {
  W: "https://svgs.scryfall.io/card-symbols/W.svg",
  U: "https://svgs.scryfall.io/card-symbols/U.svg",
  B: "https://svgs.scryfall.io/card-symbols/B.svg",
  R: "https://svgs.scryfall.io/card-symbols/R.svg",
  G: "https://svgs.scryfall.io/card-symbols/G.svg",
};
const COLORLESS_SYMBOL_URL = "https://svgs.scryfall.io/card-symbols/C.svg";

// Full Art theme: each color identity gets a solid background + matching
// ink (text) pair, mirroring the color-block panels of modern full-art
// card treatments. Multicolor decks use their first color found in
// W,U,B,R,G order -- good enough for a visual accent, not meant to be a
// precise guild-color system. Colorless/no-deck falls back to the gold
// "artifact" pair.
const COLOR_PAIR = {
  W: { bg: "--w", ink: "--w-ink" },
  U: { bg: "--u", ink: "--u-ink" },
  B: { bg: "--b", ink: "--b-ink" },
  R: { bg: "--r", ink: "--r-ink" },
  G: { bg: "--g", ink: "--g-ink" },
};
const GOLD_PAIR = { bg: "--gold", ink: "--gold-ink" };

export function colorPairFor(colorIdentity) {
  if (!colorIdentity || colorIdentity.length === 0) return GOLD_PAIR;
  for (const c of ["W", "U", "B", "R", "G"]) {
    if (colorIdentity.includes(c)) return COLOR_PAIR[c];
  }
  return GOLD_PAIR;
}

export function pipsHtml(colorIdentity) {
  if (!colorIdentity || colorIdentity.length === 0) {
    return `<img class="mana-pip" src="${COLORLESS_SYMBOL_URL}" alt="Colorless">`;
  }
  return colorIdentity
    .filter((c) => SYMBOL_URL[c])
    .map((c) => `<img class="mana-pip" src="${SYMBOL_URL[c]}" alt="${c}">`)
    .join("");
}