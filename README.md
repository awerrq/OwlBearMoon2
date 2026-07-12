# PM Status Effects — Owlbear Rodeo Extension

Tracks stacking status effects (Burn 3, Haste 2, etc.) with custom icons that
appear directly on a token. Select a token, use +/- to set each effect's
count, and small icon badges with the number on them appear on the token
automatically — synced live to everyone in the room, because Owlbear itself
handles that part.

## What's in here
- `manifest.json` — tells Owlbear Rodeo how to load the extension.
- `index.html` / `style.css` / `main.js` — the popover you open to edit a
  token's effects.
- `icons/*.svg` — placeholder icons for Burn, Haste, Power Down, Fragile.
  **Replace these with your own art** — just keep the filenames the same,
  or update the `icon` path in the `EFFECTS` list in `main.js`.

## To add / change / remove an effect
Open `main.js`, find the `EFFECTS` array near the top, and edit it. That's
the only file you should need to touch for normal content changes:

```js
{ id: "bleed", name: "Bleed", icon: "icons/bleed.svg", max: 4 },
```

## Hosting it (pick one, both are free)
1. **GitHub Pages** — push this folder to a GitHub repo, enable Pages in
   the repo settings, point it at the root. You'll get a URL like
   `https://yourname.github.io/repo-name/`.
2. **Netlify (drag-and-drop)** — go to app.netlify.com/drop, drag this
   whole folder in. You'll get a URL instantly, no account strictly
   required for a one-off deploy.

Either way, your manifest URL will be:
`https://<your-hosted-url>/manifest.json`

## Installing it in Owlbear Rodeo
1. Click your profile icon (bottom left) → **Add Extension**.
2. Paste the manifest URL from above.
3. Open a room → the "Status Effects" icon appears in the top-left action bar.

## Known rough edges — check these first if something's broken
I wrote this against Owlbear's documented SDK patterns, but I can't run it
in a live browser myself, so treat this as a first draft that needs one
real test pass, not finished code:

- `.locked(true)` and `.metadata({...})` on the image builder — I'm
  confident these exist as builder methods (other builders in the SDK
  follow this pattern) but haven't confirmed the exact chain order works
  on `buildImage` specifically.
- Badge positioning (`token.position.x - width/2 + index*22`) is a rough
  guess at "top-left corner, spaced out." Very likely needs manual
  tweaking once you see it against your actual token size/grid.
- The CDN import (`esm.sh`) needs an internet connection to load the SDK
  — fine for normal use, but if it ever fails to load, that's the first
  thing to check.
- Right now it only edits **one selected token at a time** — multi-select
  isn't handled.

If any of these misbehave when you test it, paste me the exact error from
the browser console (right-click → Inspect → Console tab in the popover)
and I'll fix it.
