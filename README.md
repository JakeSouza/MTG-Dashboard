# Rob Roy's Boys

A Commander/EDH tracker for a fixed 4-player pod: log games, track decks, and
see all-time wins per player, per deck, and per player+deck combo. Static
site (GitHub Pages) backed by Firebase (Firestore). Visual theme is "Dark
Minimal" -- near-black surfaces, a single warm-gold accent, Archivo for
headlines and numbers, Inter for body text. Color identity is shown as a
small dot next to a name rather than a full-card background, keeping color
meaningful without letting it dominate the page.

## 1. Set your players

Edit `js/players.js` with your 4 real names. The `id` just needs to be a
stable, lowercase key with no spaces.

## 2. Create a Firebase project

1. Go to https://console.firebase.google.com and create a new project.
2. In the project, go to **Build > Firestore Database** and create a
   database (start in production mode).
3. Go to **Build > Authentication > Sign-in method** and enable **Anonymous**.
   (There's no visible login for players -- this just quietly signs the page
   in so Firestore rules can require `request.auth != null` on writes,
   instead of leaving the database wide open to anyone with the URL.)
4. Go to **Project settings > General**, scroll to "Your apps", and add a
   Web app. Copy the `firebaseConfig` object it gives you.
5. Paste those values into `js/firebase-init.js`, replacing the placeholders.

## 3. Set Firestore security rules

In **Firestore Database > Rules**, use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /decks/{deckId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

This lets anyone view the dashboard, but only the anonymously-authenticated
site itself can write games and decks.

## 4. Deploy to GitHub Pages

1. Create a new GitHub repo and push this folder's contents to it.
2. In the repo, go to **Settings > Pages**, set the source to the `main`
   branch (root), and save.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## 5. Add your decks

Go to the **Decks** page, paste a Moxfield or Archidekt link, and hit
"Fetch commander & colors." Both APIs block direct browser requests (no CORS
headers), so `js/moxfield.js` tries a chain of free CORS proxies
(codetabs, allorigins, thingproxy) in turn. These are all donated,
best-effort services with no uptime guarantee, so occasional failures are
expected -- if a fetch fails for any reason, just fill in the commander name
and colors by hand; the link is still saved and clickable.

**For a genuinely reliable fix**, deploy your own tiny CORS proxy on
Cloudflare Workers (free, takes about 2 minutes):

1. Sign up at https://workers.dev and create a new Worker.
2. Paste in this code and deploy it:
   ```js
   export default {
     async fetch(request) {
       const target = new URL(request.url).searchParams.get("url");
       if (!target) return new Response("Missing url param", { status: 400 });
       const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
       const body = await res.arrayBuffer();
       return new Response(body, {
         status: res.status,
         headers: {
           "Access-Control-Allow-Origin": "*",
           "Content-Type": res.headers.get("Content-Type") || "application/json",
         },
       });
     },
   };
   ```
3. Copy the Worker's URL (looks like `https://your-worker.workers.dev`).
4. In `js/moxfield.js`, set `WORKER_PROXY` to `"https://your-worker.workers.dev/?url="`.

With that set, deck fetching no longer depends on any third-party proxy's
uptime.

## How it works

- `players.js` is a hardcoded list -- there's no player management UI since
  the pod is fixed at 4.
- `decks` and `games` live in Firestore and grow over time.
- All standings (win %, per-deck records, etc.) are computed client-side
  from the raw `games` collection on page load -- there's no separate
  "stats" table to keep in sync.
- Each player/deck's dot color on the dashboard is drawn from the
  most-played deck's color identity (falls back to gold if colorless or no
  decks yet) -- multicolor decks show their first color found in W,U,B,R,G
  order, a single representative dot rather than a blend.

- Commander art is pulled from Scryfall (no CORS proxy needed there -- it's
  open to browser requests) and cached as `artUrls` on the deck document
  when you add it. Decks added before this feature will fetch their art live
  on each page load instead (fine at this scale, just slightly slower).
- `bracket` (1-5, per Wizards' Commander Bracket system) is optional and
  set by hand when adding a deck -- neither Moxfield's nor Archidekt's
  public API reliably exposes it, so there's no auto-fetch for this field.
- Decks can be edited after the fact -- hit "Edit" on any deck card to load
  it back into the form, change anything, and save. Unchecking "Active"
  retires a deck without deleting its history; retired decks stop showing up
  as an option on the Log a game page but still count toward past standings.
- Turn order (per player) and match length (in minutes) are both optional
  on the Log a game form -- leave them blank if you don't care to track
  them. When set, turn order shows next to each player in the recent-games
  ledger and match length shows under the date.
- Clicking any player's name on the dashboard opens `player.html?id=<id>` --
  their full record, deck-by-deck breakdown (including retired decks), and
  complete game history from their perspective (Won/Lost, not just who won
  overall). This is a plain query-string route on a static HTML file, so it
  needs no server config beyond what GitHub Pages already does.
- Win totals count up from zero on load (`js/animate.js`) instead of
  appearing instantly, and player and deck cards lift slightly on hover.
- The homepage is built around infrequent-but-intense play (a few sessions
  a year, 10-20 games in a sitting) rather than daily check-ins: the win
  leader gets a large "champion" card with the other three in a compact row
  below, recent games run full-width as the main feed underneath, and the
  deck library shrinks to a "Top decks" strip (by games played) with a link
  to the full library on `decks.html` -- not duplicated in full on the
  homepage.

## Possible next additions

- A "meta" page: win rate by color identity, longest streaks, head-to-head
  records between players.
- Deck history (mark a deck retired, see how a rebuilt version compares).