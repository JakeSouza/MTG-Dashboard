// Shared Firestore loading + formatting used by the dashboard and player pages.
import { db, authReady, collection, getDocs, query, orderBy } from "./firebase-init.js";

export async function loadDecksAndGames() {
  await authReady;

  const decksSnap = await getDocs(query(collection(db, "decks"), orderBy("createdAt", "desc")));
  const decks = decksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const deckById = Object.fromEntries(decks.map((d) => [d.id, d]));

  const gamesSnap = await getDocs(query(collection(db, "games"), orderBy("date", "desc")));
  const games = gamesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return { decks, deckById, games };
}

export function fmtDate(d) {
  if (!d) return "";
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ordinal(n) {
  const suffixes = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
  return suffixes[n] || `${n}th`;
}