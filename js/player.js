import { loadDecksAndGames, fmtDate, ordinal } from "./data.js";
import { PLAYERS } from "./players.js";
import { dotColorFor } from "./colors.js";
import { fetchCommanderArt } from "./scryfall.js";
import { animateCount } from "./animate.js";

const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

function mostPlayedDeck(deckWins, deckById) {
  let best = null;
  let bestGames = -1;
  for (const [deckId, rec] of Object.entries(deckWins)) {
    if (rec.games > bestGames) {
      best = deckId;
      bestGames = rec.games;
    }
  }
  return best ? deckById[best] : null;
}

function computePlayerStats(playerId, games) {
  let wins = 0, gamesPlayed = 0;
  const deckWins = {};
  for (const g of games) {
    const entry = (g.entries || []).find((e) => e.playerId === playerId);
    if (!entry) continue;
    gamesPlayed += 1;
    deckWins[entry.deckId] = deckWins[entry.deckId] || { wins: 0, games: 0 };
    deckWins[entry.deckId].games += 1;
    if (g.winnerPlayerId === playerId) {
      wins += 1;
      deckWins[entry.deckId].wins += 1;
    }
  }
  return { wins, games: gamesPlayed, deckWins };
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

function renderHero(player, stats, deckById) {
  const winPct = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0;
  const topDeck = mostPlayedDeck(stats.deckWins, deckById);
  const dot = dotColorFor(topDeck ? topDeck.colorIdentity : null);
  document.getElementById("player-hero").innerHTML = `
    <div class="champion" style="margin-bottom:0;">
      <div>
        <div class="label">Career record</div>
        <div class="name-row"><span class="dot" style="--c:${dot}"></span><span class="name">${player.name}</span></div>
        <div class="deck">${topDeck ? topDeck.commander || topDeck.name : "No decks logged yet"}</div>
      </div>
      <div class="stat">
        <div class="wins" id="hero-wins">0</div>
        <div class="record">${stats.wins}W &mdash; ${stats.games} games &middot; ${winPct}%</div>
      </div>
    </div>`;
  animateCount(document.getElementById("hero-wins"), stats.wins, { duration: 900 });
  return topDeck;
}

function renderPlayerDecks(playerId, decks, stats) {
  const owned = decks.filter((d) => d.ownerId === playerId);
  const el = document.getElementById("player-decks");
  if (owned.length === 0) {
    el.innerHTML = `<p class="hint">No decks logged yet. <a href="decks.html">Add one</a>.</p>`;
    return;
  }
  el.innerHTML = owned.map((d) => {
    const rec = stats.deckWins[d.id] || { wins: 0, games: 0 };
    const pct = rec.games ? Math.round((rec.wins / rec.games) * 100) : 0;
    const dot = dotColorFor(d.colorIdentity);
    const retiredTag = d.active === false ? `<span class="bracket-badge">Retired</span>` : "";
    return `
      <div class="deckcard">
        ${artHtml(d)}
        <div class="info">
          <div class="commander"><span class="dot" style="--c:${dot}"></span>${d.commander || d.name}</div>
          <div class="owner">${d.link ? `<a href="${d.link}" target="_blank" rel="noopener">list</a>` : ""}${d.bracket ? `<span class="bracket-badge">Bracket ${d.bracket}</span>` : ""}${retiredTag}</div>
        </div>
        <div class="stat"><b>${pct}%</b>${rec.wins} &ndash; ${rec.games}</div>
      </div>`;
  }).join("");
  fillMissingArt();
}

function renderPlayerLedger(playerId, games, deckById) {
  const el = document.getElementById("player-ledger");
  const relevant = games.filter((g) => (g.entries || []).some((e) => e.playerId === playerId));
  if (relevant.length === 0) {
    el.innerHTML = `<p class="hint">No games logged yet. <a href="log-game.html">Log the first one</a>.</p>`;
    return;
  }
  el.innerHTML = relevant.slice(0, 25).map((g) => {
    const isWin = g.winnerPlayerId === playerId;
    const myEntry = g.entries.find((e) => e.playerId === playerId);
    const myDeck = deckById[myEntry.deckId];
    const others = g.entries.filter((e) => e.playerId !== playerId);
    const chips = others.map((e) => {
      const p = playerById[e.playerId];
      const deck = deckById[e.deckId];
      const isWinner = e.playerId === g.winnerPlayerId;
      return `<span class="pod-chip ${isWinner ? "winner" : ""}">${p ? p.name : "?"} &middot; ${deck ? (deck.commander || deck.name) : "?"}</span>`;
    }).join("");
    const turnTag = myEntry.turnOrder ? `${ordinal(myEntry.turnOrder)} turn &middot; ` : "";
    return `
      <div class="row">
        <div class="date">${fmtDate(g.date)}${g.matchLengthMinutes ? `<div style="opacity:0.7;">${g.matchLengthMinutes}m</div>` : ""}</div>
        <div class="pods">
          <span class="pod-chip ${isWin ? "winner" : ""}">${turnTag}${myDeck ? (myDeck.commander || myDeck.name) : "?"}</span>
          ${chips}
        </div>
        <div class="winner-tag" style="color:${isWin ? "var(--success)" : "var(--text-muted)"}">${isWin ? "Won" : "Lost"}</div>
      </div>`;
  }).join("");
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");
  const player = playerById[playerId];

  if (!player) {
    document.getElementById("player-name").textContent = "Player not found";
    document.getElementById("player-tagline").innerHTML = `Check the link, or go back to <a href="index.html">standings</a>.`;
    return;
  }

  document.getElementById("player-name").textContent = player.name;
  document.getElementById("player-tagline").textContent = "Player record";

  const { decks, deckById, games } = await loadDecksAndGames();
  const stats = computePlayerStats(playerId, games);
  renderHero(player, stats, deckById);
  renderPlayerDecks(playerId, decks, stats);
  renderPlayerLedger(playerId, games, deckById);
}

init().catch((err) => {
  console.error(err);
  document.getElementById("player-tagline").textContent = "Couldn't load data. Check your Firebase config.";
});