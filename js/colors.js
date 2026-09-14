export const COLOR_VAR = { W: "--w", U: "--u", B: "--b", R: "--r", G: "--g" };

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

// Picks one accent color for a deck's left-border glow. Multicolor decks use
// their first color (order W,U,B,R,G) -- good enough for a visual accent,
// not meant to be a precise guild-color system.
export function accentVarFor(colorIdentity) {
  if (!colorIdentity || colorIdentity.length === 0) return "--gold";
  for (const c of ["W", "U", "B", "R", "G"]) {
    if (colorIdentity.includes(c)) return COLOR_VAR[c];
  }
  return "--gold";
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