export const COLOR_VAR = { W: "--w", U: "--u", B: "--b", R: "--r", G: "--g" };

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
    return `<span class="pip" style="background:var(--gold)"></span>`;
  }
  return colorIdentity
    .filter((c) => COLOR_VAR[c])
    .map((c) => `<span class="pip" style="background:var(${COLOR_VAR[c]})"></span>`)
    .join("");
}