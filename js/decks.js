import { db, authReady, collection, getDocs, addDoc, query, orderBy, serverTimestamp } from "./firebase-init.js";
import { PLAYERS } from "./players.js";
import { fetchDeckMetadata } from "./moxfield.js";
import { accentVarFor, pipsHtml } from "./colors.js";

const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
let fetchedMeta = null;

function renderOwnerOptions() {
  document.getElementById("owner-select").innerHTML =
    PLAYERS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
}

async function renderDeckList() {
  const snap = await getDocs(query(collection(db, "decks"), orderBy("createdAt", "desc")));
  const decks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const el = document.getElementById("deck-list");
  if (decks.length === 0) {
    el.innerHTML = `<p class="hint">No decks logged yet.</p>`;
    return;
  }
  el.innerHTML = decks.map((d) => {
    const owner = playerById[d.ownerId];
    return `
      <div class="deckcard" style="border-left:3px solid var(${accentVarFor(d.colorIdentity)})">
        <div class="info">
          <div class="commander">${d.commander || d.name}</div>
          <div class="owner">${owner ? owner.name : "Unknown"}${d.link ? ` &middot; <a href="${d.link}" target="_blank" rel="noopener">list</a>` : ""}</div>
          <div class="pips">${pipsHtml(d.colorIdentity)}</div>
        </div>
      </div>`;
  }).join("");
}

async function handleFetchClick() {
  const link = document.getElementById("link").value.trim();
  const statusEl = document.getElementById("fetch-status");
  if (!link) {
    statusEl.textContent = "Paste a Moxfield or Archidekt link first.";
    statusEl.className = "status error";
    return;
  }
  statusEl.textContent = "Fetching deck info\u2026";
  statusEl.className = "status";
  try {
    fetchedMeta = await fetchDeckMetadata(link);
    document.getElementById("commander").value = fetchedMeta.commander || "";
    document.getElementById("deck-name").value = fetchedMeta.name || "";
    ["W", "U", "B", "R", "G"].forEach((c) => {
      document.getElementById(`color-${c}`).checked = (fetchedMeta.colorIdentity || []).includes(c);
    });
    statusEl.textContent = "Pulled commander and colors -- double check them below.";
    statusEl.className = "status success";
  } catch (err) {
    console.error(err);
    fetchedMeta = null;
    statusEl.textContent = "Couldn't auto-fetch (the link's API may block browser requests). Fill in the commander and colors manually below.";
    statusEl.className = "status error";
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const statusEl = document.getElementById("save-status");
  const colorIdentity = ["W", "U", "B", "R", "G"].filter((c) => document.getElementById(`color-${c}`).checked);

  const deck = {
    ownerId: form.owner.value,
    name: form["deck-name"].value.trim() || form.commander.value.trim(),
    commander: form.commander.value.trim(),
    colorIdentity,
    link: form.link.value.trim(),
    active: true,
    createdAt: serverTimestamp(),
  };

  if (!deck.commander) {
    statusEl.textContent = "Add a commander name -- auto-fetch it or type it in.";
    statusEl.className = "status error";
    return;
  }

  try {
    await authReady;
    await addDoc(collection(db, "decks"), deck);
    statusEl.textContent = "Deck added.";
    statusEl.className = "status success";
    form.reset();
    fetchedMeta = null;
    await renderDeckList();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Couldn't save the deck. Check the console for details.";
    statusEl.className = "status error";
  }
}

async function init() {
  await authReady;
  renderOwnerOptions();
  await renderDeckList();
  document.getElementById("fetch-btn").addEventListener("click", handleFetchClick);
  document.getElementById("deck-form").addEventListener("submit", handleSubmit);
}

init();