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

// Full Art theme: each color identity gets a gradient background + matching
// ink (text) pair. Mono-color decks get a tonal (light-to-dark) gradient of
// their own color; multicolor decks blend straight through each color in
// their identity (W,U,B,R,G order) for a genuine guild-color gradient
// rather than picking just one. These hexes mirror the --w/--u/--b/--r/--g
// values in css/style.css -- keep them in sync if that palette changes.
const BASE_HEX = { W: "#e8d9a0", U: "#2f6fb3", B: "#2b2b33", R: "#c4432b", G: "#3f7d45" };
const TONAL_HEX = {
  W: ["#f2ead0", "#cdb26a"],
  U: ["#5b93c9", "#1d4569"],
  B: ["#46454f", "#17171b"],
  R: ["#d97157", "#8a2f1c"],
  G: ["#63a068", "#2a5730"],
};
const GOLD_TONAL = ["#ddc98a", "#9c7a2c"];
const COLOR_INK = { W: "--w-ink", U: "--u-ink", B: "--b-ink", R: "--r-ink", G: "--g-ink" };
const GOLD_PAIR = { background: `linear-gradient(135deg, ${GOLD_TONAL[0]}, ${GOLD_TONAL[1]})`, ink: "--gold-ink" };

export function colorPairFor(colorIdentity) {
  const present = ["W", "U", "B", "R", "G"].filter((c) => colorIdentity && colorIdentity.includes(c));
  if (present.length === 0) return GOLD_PAIR;

  if (present.length === 1) {
    const [light, dark] = TONAL_HEX[present[0]];
    return { background: `linear-gradient(135deg, ${light}, ${dark})`, ink: COLOR_INK[present[0]] };
  }

  const stops = present.map((c) => BASE_HEX[c]);
  return { background: `linear-gradient(135deg, ${stops.join(", ")})`, ink: COLOR_INK[present[0]] };
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