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

// Deck cards only: a thin gradient blending straight through every color in
// the identity (mono-color decks just get their one color, no gradient
// needed). Used for a slim top-edge strip, not a full-card fill, and for the
// soft glow behind the deck's art thumbnail.
export function identityGradient(colorIdentity) {
  const present = ["W", "U", "B", "R", "G"].filter((c) => colorIdentity && colorIdentity.includes(c));
  if (present.length === 0) return GOLD;
  if (present.length === 1) return DOT_HEX[present[0]];
  return `linear-gradient(90deg, ${present.map((c) => DOT_HEX[c]).join(", ")})`;
}