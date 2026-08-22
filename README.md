# PM Status Effects — Owlbear Rodeo Extension

## What's new in this update
- **Multi-select**: select 2+ tokens and the panel switches to "- +"
  buttons (no number shown, since different tokens can have different
  counts). Each click applies the same +1/-1 to every selected token
  independently.
- **Reset button**: clears all effects on whichever token(s) are
  currently selected. Applies immediately, no debounce.

## Files in this update
Only `index.html`, `style.css`, and `main.js` changed. **Leave
`manifest.json` and your icon files exactly as they are** — nothing
about them needs to change for this update.

## To add / change / remove an effect
Open `main.js`, find the `EFFECTS` array near the top, and edit it:

```js
{ id: "bleed", name: "Bleed", icon: "icons/bleed.svg", max: 4 },
```

If your icon files aren't 128x128 pixels, also update the `ICON_PX`
constant near the top of `main.js` to match.

## Tuning constants (all near the top of main.js)
- `BADGE_SCALE` — icon size, as a fraction of one grid cell
- `BADGE_GAP_SCALE` — horizontal space between effect icons
- `ROW_HEIGHT_SCALE` — how far above the token the whole row sits

## Deploying an update
1. Replace the changed file(s) on GitHub, commit to `main`.
2. GitHub Pages takes a little time to rebuild — if Owlbear or your
   browser shows the old version, that's caching, not a real bug.
3. Cache-bust: use `manifest.json?v=N` (bump N each time) when
   re-adding the extension, and test in an incognito window.
4. Remove the extension from Owlbear's list and re-add it fresh rather
   than just refreshing — Owlbear caches the popover at install time.

## If something breaks with no console error
That's usually caching, not a real code problem — start with the steps
above before assuming the code is wrong.
