import { loadDecksAndGames, fmtDate, ordinal } from "./data.js";
import { PLAYERS } from "./players.js";
import { dotColorFor, identityGradient } from "./colors.js";
import { fetchCommanderArt } from "./scryfall.js";
import { animateCount } from "./animate.js";

const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

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
  const ranked = [...PLAYERS].sort((a, b) => {
    const sa = stats[a.id], sb = stats[b.id];
    if (sb.wins !== sa.wins) return sb.wins - sa.wins;
    const pctA = sa.games ? sa.wins / sa.games : 0;
    const pctB = sb.games ? sb.wins / sb.games : 0;
    return pctB - pctA;
  });

  const cardHtml = (p, isChampion) => {
    const s = stats[p.id];
    const winPct = s.games ? Math.round((s.wins / s.games) * 100) : 0;
    const topDeck = mostPlayedDeck(s, deckById);
    const dot = dotColorFor(topDeck ? topDeck.colorIdentity : null);
    return `
      <a class="${isChampion ? "champion" : "runner-up"}" href="player.html?id=${p.id}">
        ${isChampion ? `<div class="label">Current leader</div>` : ""}
        <div class="name-row"><span class="dot" style="--c:${dot}"></span><span class="name">${p.name}</span></div>
        <div class="deck">${topDeck ? topDeck.commander || topDeck.name : "No decks logged yet"}</div>
        ${isChampion ? `<div class="stat"><div class="wins" id="wins-${p.id}">0</div><div class="record">${s.wins}W &mdash; ${s.games} games &middot; ${winPct}%</div></div>` : `<div class="wins" id="wins-${p.id}">0</div><div class="record">${s.wins}W &mdash; ${s.games} games &middot; ${winPct}%</div>`}
      </a>`;
  };

  const [champion, ...runnerUps] = ranked;
  const el = document.getElementById("standings");
  el.innerHTML = `
    ${cardHtml(champion, true)}
    <div class="runner-ups">${runnerUps.map((p) => cardHtml(p, false)).join("")}</div>
  `;

  ranked.forEach((p, i) => {
    animateCount(document.getElementById(`wins-${p.id}`), stats[p.id].wins, { delay: i * 90 });
  });
}

function renderLedger(games, deckById) {
  const el = document.getElementById("ledger");
  if (games.length === 0) {
    el.innerHTML = `<p class="hint">No games logged yet. <a href="log-game.html">Log your first game</a>.</p>`;
    return;
  }
  el.innerHTML = games.slice(0, 25).map((g) => {
    const winnerName = playerById[g.winnerPlayerId]?.name || "Unknown";
    const chips = (g.entries || []).map((e) => {
      const p = playerById[e.playerId];
      const deck = deckById[e.deckId];
      const isWinner = e.playerId === g.winnerPlayerId;
      const turnTag = e.turnOrder ? `${ordinal(e.turnOrder)} &middot; ` : "";
      return `<span class="pod-chip ${isWinner ? "winner" : ""}">${turnTag}${p ? p.name : "?"} &middot; ${deck ? (deck.commander || deck.name) : "?"}</span>`;
    }).join("");
    return `
      <div class="row">
        <div class="date">${fmtDate(g.date)}${g.matchLengthMinutes ? `<div style="opacity:0.7;">${g.matchLengthMinutes}m</div>` : ""}</div>
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

function renderTopDecks(decks, stats) {
  const el = document.getElementById("deck-strip");
  if (decks.length === 0) {
    el.innerHTML = `<p class="hint">No decks yet. <a href="decks.html">Add one</a>.</p>`;
    return;
  }

  const withCounts = decks.map((d) => {
    const s = stats[d.ownerId];
    const rec = (s && s.deckWins[d.id]) || { wins: 0, games: 0 };
    return { deck: d, wins: rec.wins, games: rec.games };
  });
  withCounts.sort((a, b) => b.games - a.games || b.wins - a.wins);
  const top = withCounts.slice(0, 4);

  el.innerHTML = top.map(({ deck: d, wins, games: gamesPlayed }) => {
    const owner = playerById[d.ownerId];
    const pct = gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0;
    const dot = dotColorFor(d.colorIdentity);
    const identity = identityGradient(d.colorIdentity);
    return `
      <div class="deckcard" style="--identity:${identity};--glow:${dot}66">
        ${artHtml(d)}
        <div class="info">
          <div class="commander"><span class="dot" style="--c:${dot}"></span>${d.commander || d.name}</div>
          <div class="owner">${owner ? owner.name : "Unknown"}${d.link ? ` &middot; <a href="${d.link}" target="_blank" rel="noopener">list</a>` : ""}${d.bracket ? `<span class="bracket-badge">Bracket ${d.bracket}</span>` : ""}</div>
        </div>
        <div class="stat"><b>${pct}%</b>${wins} &ndash; ${gamesPlayed}</div>
      </div>`;
  }).join("");
  fillMissingArt();
}

async function init() {
  const { decks, deckById, games } = await loadDecksAndGames();
  const stats = computeStandings(games);
  renderStandings(stats, deckById);
  renderLedger(games, deckById);
  renderTopDecks(decks, stats);

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