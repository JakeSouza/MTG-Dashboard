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

// Neither Moxfield nor Archidekt send CORS headers for browser requests, so a
// direct fetch() from a static site is blocked by the browser before it even
// reaches their server. Route through a public CORS proxy instead. This adds
// a dependency on a third-party service staying up -- if it ever goes down,
// swap the PROXY constant for another "raw passthrough" CORS proxy.
const PROXY = "https://api.allorigins.win/raw?url=";

async function proxiedFetch(url) {
  try {
    const direct = await fetch(url);
    if (direct.ok) return direct;
  } catch (_) {
    // expected: browser blocks this before a response ever comes back
  }
  return fetch(PROXY + encodeURIComponent(url));
}

async function fetchMoxfield(publicId) {
  const res = await proxiedFetch(`https://api2.moxfield.com/v3/decks/all/${publicId}`);
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
  const res = await proxiedFetch(`https://archidekt.com/api/decks/${deckId}/`);
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