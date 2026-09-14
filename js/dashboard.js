import { db, authReady, collection, getDocs, query, orderBy } from "./firebase-init.js";
import { PLAYERS } from "./players.js";
import { colorPairFor, pipsHtml } from "./colors.js";
import { fetchCommanderArt } from "./scryfall.js";

const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

function fmtDate(d) {
  if (!d) return "";
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function loadData() {
  await authReady;

  const decksSnap = await getDocs(query(collection(db, "decks"), orderBy("createdAt", "desc")));
  const decks = decksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const deckById = Object.fromEntries(decks.map((d) => [d.id, d]));

  const gamesSnap = await getDocs(query(collection(db, "games"), orderBy("date", "desc")));
  const games = gamesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return { decks, deckById, games };
}

function computeStandings(games) {
  const stats = {};
  for (const p of PLAYERS) stats[p.id] = { wins: 0, games: 0, deckWins: {} };

  for (const g of games) {
    for (const entry of g.entries || []) {
      const s = stats[entry.playerId];
      if (!s) continue;
      s.games += 1;
      if (entry.deckId === undefined) continue;
      s.deckWins[entry.deckId] = s.deckWins[entry.deckId] || { wins: 0, games: 0 };
      s.deckWins[entry.deckId].games += 1;
      if (g.winnerPlayerId === entry.playerId) {
        s.wins += 1;
        s.deckWins[entry.deckId].wins += 1;
      }
    }
  }
  return stats;
}

function mostPlayedDeck(stats, deckById) {
  let best = null;
  let bestGames = -1;
  for (const [deckId, rec] of Object.entries(stats.deckWins)) {
    if (rec.games > bestGames) {
      best = deckId;
      bestGames = rec.games;
    }
  }
  return best ? deckById[best] : null;
}

function renderStandings(stats, deckById) {
  const el = document.getElementById("standings");
  el.innerHTML = PLAYERS.map((p) => {
    const s = stats[p.id];
    const winPct = s.games ? Math.round((s.wins / s.games) * 100) : 0;
    const topDeck = mostPlayedDeck(s, deckById);
    const pair = colorPairFor(topDeck ? topDeck.colorIdentity : null);
    return `
      <div class="player" style="--c:${pair.background};--ci:var(${pair.ink})">
        <div class="name">${p.name}</div>
        <div class="deck">${topDeck ? topDeck.commander || topDeck.name : "No decks logged yet"}</div>
        <div class="wins">${s.wins}</div>
        <div class="record">${s.wins}W &mdash; ${s.games} games &middot; ${winPct}%</div>
      </div>`;
  }).join("");
}

function renderLedger(games, deckById) {
  const el = document.getElementById("ledger");
  if (games.length === 0) {
    el.innerHTML = `<p class="hint">No games logged yet. <a href="log-game.html">Log your first game</a>.</p>`;
    return;
  }
  el.innerHTML = games.slice(0, 15).map((g) => {
    const winnerName = playerById[g.winnerPlayerId]?.name || "Unknown";
    const winnerEntry = g.entries.find((e) => e.playerId === g.winnerPlayerId);
    const winnerPair = winnerEntry ? colorPairFor(deckById[winnerEntry.deckId]?.colorIdentity) : null;
    const chips = (g.entries || []).map((e) => {
      const p = playerById[e.playerId];
      const deck = deckById[e.deckId];
      const isWinner = e.playerId === g.winnerPlayerId;
      return `<span class="pod-chip ${isWinner ? "winner" : ""}">${p ? p.name : "?"} &middot; ${deck ? (deck.commander || deck.name) : "?"}</span>`;
    }).join("");
    return `
      <div class="row" style="${winnerPair ? `--wc:${winnerPair.background};--wci:var(${winnerPair.ink})` : ""}">
        <div class="date">${fmtDate(g.date)}</div>
        <div class="pods">${chips}</div>
        <div class="winner-tag">${winnerName} wins</div>
      </div>`;
  }).join("");
}

function artHtml(deck) {
  if (deck.artUrls && deck.artUrls.length) {
    return `<div class="deck-art-group">${deck.artUrls.map((u) => `<img class="deck-art" src="${u}" alt="">`).join("")}</div>`;
  }
  return `<div class="deck-art-group" data-commander="${deck.commander || ""}"><div class="deck-art"></div></div>`;
}

async function fillMissingArt() {
  const groups = document.querySelectorAll(".deck-art-group[data-commander]");
  for (const group of groups) {
    const commander = group.dataset.commander;
    if (!commander) continue;
    const arts = await fetchCommanderArt(commander);
    if (arts.length) {
      group.innerHTML = arts.map((u) => `<img class="deck-art" src="${u}" alt="">`).join("");
    }
  }
}

function renderDeckLibrary(decks, stats) {
  const el = document.getElementById("deck-library");
  if (decks.length === 0) {
    el.innerHTML = `<p class="hint">No decks yet. <a href="decks.html">Add one</a>.</p>`;
    return;
  }
  el.innerHTML = decks.map((d) => {
    const owner = playerById[d.ownerId];
    let wins = 0, gamesPlayed = 0;
    const s = stats[d.ownerId];
    if (s && s.deckWins[d.id]) {
      wins = s.deckWins[d.id].wins;
      gamesPlayed = s.deckWins[d.id].games;
    }
    const pct = gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0;
    const pair = colorPairFor(d.colorIdentity);
    return `
      <div class="deckcard" style="--c:${pair.background};--ci:var(${pair.ink})">
        ${artHtml(d)}
        <div class="info">
          <div class="commander">${d.commander || d.name}</div>
          <div class="owner">${owner ? owner.name : "Unknown"}${d.link ? ` &middot; <a href="${d.link}" target="_blank" rel="noopener">list</a>` : ""}${d.bracket ? `<span class="bracket-badge">Bracket ${d.bracket}</span>` : ""}</div>
          <div class="pips">${pipsHtml(d.colorIdentity)}</div>
        </div>
        <div class="stat"><b>${pct}%</b>${wins} &ndash; ${gamesPlayed}</div>
      </div>`;
  }).join("");
  fillMissingArt();
}

async function init() {
  const { decks, deckById, games } = await loadData();
  const stats = computeStandings(games);
  renderStandings(stats, deckById);
  renderLedger(games, deckById);
  renderDeckLibrary(decks, stats);

  if (games[0]) {
    const winner = playerById[games[0].winnerPlayerId];
    document.getElementById("last-game").innerHTML =
      `Last game: <b>${fmtDate(games[0].date)}</b> &mdash; won by <b>${winner ? winner.name : "?"}</b>`;
  }
}

init().catch((err) => {
  console.error(err);
  document.getElementById("standings").innerHTML =
    `<p class="hint">Couldn't load data. Check your Firebase config in js/firebase-init.js.</p>`;
});