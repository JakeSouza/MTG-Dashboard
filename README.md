# Rob Roy's Boys

A Commander/EDH tracker for a fixed 4-player pod: log games, track decks, and
see all-time wins per player, per deck, and per player+deck combo. Static
site (GitHub Pages) backed by Firebase (Firestore).

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
"Fetch commander & colors." If it comes back empty or errors, both APIs are
undocumented for outside use and occasionally block browser requests --
just fill in the commander name and colors by hand; the link is still saved
and clickable.

## How it works

- `players.js` is a hardcoded list -- there's no player management UI since
  the pod is fixed at 4.
- `decks` and `games` live in Firestore and grow over time.
- All standings (win %, per-deck records, etc.) are computed client-side
  from the raw `games` collection on page load -- there's no separate
  "stats" table to keep in sync.
- Each player/deck's accent color on the dashboard is drawn from the
  most-played deck's color identity (falls back to gold if colorless or no
  decks yet).

## Possible next additions

- A "meta" page: win rate by color identity, longest streaks, head-to-head
  records between players.
- Deck history (mark a deck retired, see how a rebuilt version compares).
- Cached commander art pulled from Scryfall by commander name.