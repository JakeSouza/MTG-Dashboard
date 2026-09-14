// Pulls commander name + color identity from a public Moxfield or Archidekt
// deck link. Both APIs are undocumented-for-third-parties, so this is best
// effort: if the fetch fails (CORS, rate limit, private deck), the caller
// should fall back to letting the person type the commander/colors in by hand.

function parseMoxfieldId(url) {
  const m = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function parseArchidektId(url) {
  const m = url.match(/archidekt\.com\/decks\/(\d+)/);
  return m ? m[1] : null;
}

async function fetchMoxfield(publicId) {
  const res = await fetch(`https://api2.moxfield.com/v3/decks/all/${publicId}`);
  if (!res.ok) throw new Error(`Moxfield fetch failed: ${res.status}`);
  const data = await res.json();
  const commanderBoard = data.boards?.commanders?.cards || {};
  const commanders = Object.values(commanderBoard).map((c) => c.card.name);
  return {
    name: data.name,
    commander: commanders.join(" / ") || null,
    colorIdentity: data.colorIdentity || [],
    source: "moxfield",
  };
}

async function fetchArchidekt(deckId) {
  const res = await fetch(`https://archidekt.com/api/decks/${deckId}/`);
  if (!res.ok) throw new Error(`Archidekt fetch failed: ${res.status}`);
  const data = await res.json();
  const commanderCard = (data.cards || []).find((c) =>
    (c.categories || []).includes("Commander")
  );
  return {
    name: data.name,
    commander: commanderCard?.card?.oracleCard?.name || null,
    colorIdentity: data.colorIdentity || [],
    source: "archidekt",
  };
}

// Returns { name, commander, colorIdentity, source } on success, or throws.
export async function fetchDeckMetadata(url) {
  const moxId = parseMoxfieldId(url);
  if (moxId) return fetchMoxfield(moxId);

  const archId = parseArchidektId(url);
  if (archId) return fetchArchidekt(archId);

  throw new Error("Link doesn't look like a Moxfield or Archidekt deck URL");
}