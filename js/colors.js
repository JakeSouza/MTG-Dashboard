// Dark Minimal theme: color identity is signaled by a single small dot next
// to a name, not a full card background or a row of mana symbols. Keeps
// color meaningful without letting it dominate the surface.
const DOT_HEX = { W: "#c7a648", U: "#3d7ab8", B: "#4a4750", R: "#c1503a", G: "#4b8452" };
const GOLD = "#c9a24b";

// Multicolor decks use their first color found in W,U,B,R,G order -- a
// single representative dot, not a blend.
export function dotColorFor(colorIdentity) {
  for (const c of ["W", "U", "B", "R", "G"]) {
    if (colorIdentity && colorIdentity.includes(c)) return DOT_HEX[c];
  }
  return GOLD;
}