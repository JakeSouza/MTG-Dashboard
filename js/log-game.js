import { db, authReady, collection, getDocs, addDoc, serverTimestamp } from "./firebase-init.js";
import { PLAYERS } from "./players.js";

let decksByOwner = {};

async function loadDecks() {
  const snap = await getDocs(collection(db, "decks"));
  decksByOwner = {};
  snap.docs.forEach((docSnap) => {
    const d = { id: docSnap.id, ...docSnap.data() };
    if (d.active === false) return;
    decksByOwner[d.ownerId] = decksByOwner[d.ownerId] || [];
    decksByOwner[d.ownerId].push(d);
  });
}

function buildPodForm() {
  const el = document.getElementById("pod-grid");
  el.innerHTML = PLAYERS.map((p) => {
    const decks = decksByOwner[p.id] || [];
    const options = decks.length
      ? decks.map((d) => `<option value="${d.id}">${d.commander || d.name}</option>`).join("")
      : `<option value="">No decks yet -- add one on the Decks page</option>`;
    return `
      <div class="field">
        <label>${p.name}'s deck</label>
        <select name="deck-${p.id}" required>${options}</select>
      </div>`;
  }).join("");

  const winnerSelect = document.getElementById("winner-select");
  winnerSelect.innerHTML = PLAYERS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function handleSubmit(e) {
  e.preventDefault();
  const statusEl = document.getElementById("status");
  statusEl.textContent = "";
  statusEl.className = "status";

  const form = e.target;
  const date = form.date.value;
  const winnerPlayerId = form.winner.value;
  const notes = form.notes.value.trim();

  const entries = PLAYERS.map((p) => ({
    playerId: p.id,
    deckId: form[`deck-${p.id}`].value,
  }));

  if (entries.some((en) => !en.deckId)) {
    statusEl.textContent = "Every player needs a deck selected -- add decks on the Decks page first.";
    statusEl.className = "status error";
    return;
  }

  try {
    await authReady;
    await addDoc(collection(db, "games"), {
      date,
      entries,
      winnerPlayerId,
      notes,
      createdAt: serverTimestamp(),
    });
    statusEl.textContent = "Game logged.";
    statusEl.className = "status success";
    form.reset();
    form.date.value = todayISO();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Couldn't save the game. Check the console for details.";
    statusEl.className = "status error";
  }
}

async function init() {
  await authReady;
  await loadDecks();
  buildPodForm();
  document.getElementById("date").value = todayISO();
  document.getElementById("game-form").addEventListener("submit", handleSubmit);
}

init();