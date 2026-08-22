# PM Status Effects — Owlbear Rodeo Extension

## What's new in this update
- **Timing per effect**: each effect in `EFFECTS` now has `timing:
  "immediate"` (applies the moment you click it — Burn) or `timing:
  "delayed"` (queues as pending, only activates on End Turn — Haste,
  Power Down, Fragile).
- **Per-effect decay**: `decay: "halve"` (rounds down), `"clear"`, or
  `"none"` — controls what happens to the ACTIVE amount every time End
  Turn is pressed.
- **End Turn button**: global — affects every character token on the
  map, not just the selected one(s). On each press: decays active
  effects first, then promotes pending into active. That order matters
  — it's why a freshly-promoted effect survives until the *next* End
  Turn instead of being wiped by the same press that activated it.
- **Badge display**: one slot per effect, not per state. Active shows
  in white. Pending-only shows in muted gray (originally tried true
  transparency via `.opacity()`, but that method doesn't actually exist
  on Owlbear's Image/Text builders — confirmed by checking every
  builder reference — which is why nothing was rendering at all before
  this fix). If an effect has both active and pending, you get a solid
  white main number plus a smaller gray "+N" next to it.

## Not done yet
HP/damage integration with a health-bar extension (e.g. Bubbles) is a
deliberately separate follow-up — not built in this pass. Confirmed
formula: Burn deals damage equal to its CURRENT stack count, THEN the
stack halves (rounded down) — damage uses the pre-halving number.

## Files in this update
`index.html`, `style.css`, and `main.js` all changed this round.
`manifest.json` and your icon files are untouched.

## To add / change / remove an effect
Edit the `EFFECTS` array in `main.js`. Remember the new `timing` and
`decay` fields — every effect needs both now:

```js
{ id: "bleed", name: "Bleed", icon: "icons/bleed.svg", max: 99, timing: "immediate", decay: "halve" },
```

## Tuning constants (all near the top of main.js)
- `BADGE_SCALE`, `BADGE_GAP_SCALE`, `ROW_HEIGHT_SCALE`, `ICON_PX` — same as before
- `PENDING_FONT_COLOR` — the muted color used for pending-only numbers

## Deploying an update
1. Replace the changed file(s) on GitHub, commit to `main`.
2. Cache-bust: `manifest.json?v=N` (bump N), remove/re-add the
   extension in Owlbear, test in incognito.
3. If something's broken with zero console errors, that's almost
   always stale caching, not a real bug — redo step 2 before assuming
   the code is wrong.

## Cleanup note
The previous (crashing) version may have left stray icon/text items on
some tokens if it partially built a badge before erroring out. If you
see a leftover icon or number sitting on a token that doesn't match its
current effects, select it directly and delete it — the new version
won't clean up items it doesn't recognize as its own.
