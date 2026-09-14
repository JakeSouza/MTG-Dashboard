import { db, authReady, collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from "./firebase-init.js";
import { PLAYERS } from "./players.js";
import { fetchDeckMetadata } from "./moxfield.js";
import { fetchCommanderArt } from "./scryfall.js";
import { colorPairFor, pipsHtml } from "./colors.js";

const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
let fetchedMeta = null;
let currentDecks = [];
let editingDeckId = null;

function renderOwnerOptions() {
  document.getElementById("owner-select").innerHTML =
    PLAYERS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
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

async function renderDeckList() {
  const snap = await getDocs(query(collection(db, "decks"), orderBy("createdAt", "desc")));
  currentDecks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const el = document.getElementById("deck-list");
  if (currentDecks.length === 0) {
    el.innerHTML = `<p class="hint">No decks logged yet.</p>`;
    return;
  }
  el.innerHTML = currentDecks.map((d) => {
    const owner = playerById[d.ownerId];
    const pair = colorPairFor(d.colorIdentity);
    const retiredTag = d.active === false ? `<span class="bracket-badge">Retired</span>` : "";
    return `
      <div class="deckcard" style="--c:${pair.background}">
        ${artHtml(d)}
        <div class="info">
          <div class="commander">${d.commander || d.name}</div>
          <div class="owner">${owner ? owner.name : "Unknown"}${d.link ? ` &middot; <a href="${d.link}" target="_blank" rel="noopener">list</a>` : ""}${d.bracket ? `<span class="bracket-badge">Bracket ${d.bracket}</span>` : ""}${retiredTag}</div>
          <div class="pips">${pipsHtml(d.colorIdentity)}</div>
        </div>
        <button type="button" class="secondary edit-btn" data-id="${d.id}" style="padding:6px 14px;font-size:13px;">Edit</button>
      </div>`;
  }).join("");
  fillMissingArt();
}

function startEdit(deckId) {
  const deck = currentDecks.find((d) => d.id === deckId);
  if (!deck) return;
  editingDeckId = deckId;

  const form = document.getElementById("deck-form");
  form.owner.value = deck.ownerId;
  form.link.value = deck.link || "";
  form.commander.value = deck.commander || "";
  form["deck-name"].value = deck.name || "";
  form.bracket.value = deck.bracket || "";
  ["W", "U", "B", "R", "G"].forEach((c) => {
    document.getElementById(`color-${c}`).checked = (deck.colorIdentity || []).includes(c);
  });
  document.getElementById("active").checked = deck.active !== false;
  document.getElementById("active-field").style.display = "block";

  document.getElementById("form-title").textContent = `Editing: ${deck.commander || deck.name}`;
  document.getElementById("submit-btn").textContent = "Save changes";
  document.getElementById("cancel-edit").style.display = "inline-block";
  document.getElementById("save-status").textContent = "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopEdit() {
  editingDeckId = null;
  const form = document.getElementById("deck-form");
  form.reset();
  document.getElementById("active-field").style.display = "none";
  document.getElementById("form-title").textContent = "Add a deck";
  document.getElementById("submit-btn").textContent = "Add deck";
  document.getElementById("cancel-edit").style.display = "none";
  document.getElementById("save-status").textContent = "";
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

  const commander = form.commander.value.trim();
  if (!commander) {
    statusEl.textContent = "Add a commander name -- auto-fetch it or type it in.";
    statusEl.className = "status error";
    return;
  }

  const deck = {
    ownerId: form.owner.value,
    name: form["deck-name"].value.trim() || commander,
    commander,
    colorIdentity,
    bracket: form.bracket.value || null,
    link: form.link.value.trim(),
  };

  if (editingDeckId) {
    deck.active = document.getElementById("active").checked;
  } else {
    deck.active = true;
    deck.createdAt = serverTimestamp();
  }

  deck.artUrls = await fetchCommanderArt(commander);

  try {
    await authReady;
    if (editingDeckId) {
      await updateDoc(doc(db, "decks", editingDeckId), deck);
      stopEdit();
      statusEl.textContent = "Deck updated.";
    } else {
      await addDoc(collection(db, "decks"), deck);
      stopEdit();
      statusEl.textContent = "Deck added.";
    }
    statusEl.className = "status success";
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
  document.getElementById("cancel-edit").addEventListener("click", stopEdit);
  document.getElementById("deck-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-btn");
    if (btn) startEdit(btn.dataset.id);
  });
}

init();