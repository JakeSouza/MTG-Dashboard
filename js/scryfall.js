// Scryfall's API sends CORS headers for browser requests, unlike Moxfield
// and Archidekt, so this can call it directly. In-memory cache avoids
// re-fetching the same commander repeatedly during a page session.
const cache = new Map();

async function fetchOne(name) {
  if (cache.has(name)) return cache.get(name);
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`Scryfall fetch failed: ${res.status}`);
    const data = await res.json();
    const art =
      data.image_uris?.art_crop ||
      data.card_faces?.[0]?.image_uris?.art_crop ||
      null;
    cache.set(name, art);
    return art;
  } catch (err) {
    console.error(err);
    cache.set(name, null);
    return null;
  }
}

// Commander field may hold partner commanders joined as "Name A / Name B" --
// returns one art_crop URL per name found, skipping any that fail.
export async function fetchCommanderArt(commanderField) {
  if (!commanderField) return [];
  const names = commanderField.split(" / ").map((n) => n.trim()).filter(Boolean);
  const arts = await Promise.all(names.map(fetchOne));
  return arts.filter(Boolean);
}