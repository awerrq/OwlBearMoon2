# PM Status Effects — Owlbear Rodeo Extension

## What's new in this update
- **Fixed the real cause of the stuck "Loading..." on reload.** Console
  showed `MissingDataError: No scene found` — confirmed via Owlbear's
  own docs that `OBR.onReady()` (extension connected) and
  `OBR.scene.onReadyChange()` (an actual scene loaded) are different
  things. Right after a page reload there's a real gap where the first
  is true and the second isn't yet, and the code was calling
  scene-dependent APIs immediately without waiting for the second one.
  Now properly waits for `OBR.scene.onReadyChange`, and re-subscribes
  cleanly if the scene changes or becomes unavailable later.
- **Errors now show up instead of hanging silently.** If scene setup
  fails for any other reason, the banner says "Error loading — check
  console" instead of sitting on "Loading..." forever with no clue why.

## Font size issue — need more info to fix this
Noted, but I don't have enough to act on yet — since the extension's
been fighting you on loading, it's hard to tell if what you saw was a
real styling bug or just the broken-loading state showing stale/partial
content. Once this fix is confirmed working, if something still looks
off size-wise, tell me exactly which text (tooltip? effect names?
badge numbers on the map?) and roughly how it's wrong (too big, too
small, inconsistent between two things that should match) — I'd rather
fix the real thing than guess and add noise.

## Debug button
Still present — useful for re-verifying the Bubbles schema if a future
Bubbles update ever changes its metadata shape. Harmless to leave in.

## To add / change / remove an effect
Edit the `EFFECTS` array in `main.js`. See the comment block directly
above it for what each field does — `timing`, `endTurnDecay`,
`dealsDamage`/`damageDecay` (only if it deals damage), and
`description` (shown as the hover tooltip).

## Tuning constants (all near the top of main.js)
- `BADGE_SCALE`, `BADGE_GAP_SCALE`, `ROW_HEIGHT_SCALE`, `ICON_PX`
- `PENDING_FONT_COLOR` — the muted color used for pending-only numbers

## Deploying an update
1. Replace the changed file(s) on GitHub, commit to `main`.
2. Cache-bust: `manifest.json?v=N` (bump N), remove/re-add the
   extension in Owlbear, test in incognito.
3. If something's broken with zero console errors, that's almost
   always stale caching, not a real bug — redo step 2 before assuming
   the code is wrong.
