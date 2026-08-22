# PM Status Effects — Owlbear Rodeo Extension

## What's new in this update
- **HP integration with Bubbles is live.** On End Turn, Burn deals
  damage equal to its stack count (before halving) directly into
  Bubbles' own HP fields — temp HP absorbs first, remainder spills into
  HP. Confirmed metadata key from your actual live setup:
  `com.owlbear-rodeo-bubbles-extension/metadata`, fields `health`,
  `temporary health` (note the literal spaces in the names).
- Only touches tokens that already have Bubbles data set up — won't
  invent HP fields for a token the GM never configured.
- HP is clamped at 0, not allowed to go negative. If you'd rather see
  negative HP (e.g. for death-save tracking), that's a one-line change
  in `handleEndTurn` — say so and I'll flip it.
- **Fragile risk to know about**: this depends on Bubbles' internal
  metadata format staying the same. If Seamus changes it in a future
  Bubbles update, our write will silently stop working (or write to a
  stale shape) until someone notices and we re-check it with the debug
  button below.

## Debug button
Still present — `handleDebugPrint` in main.js, wired to the button in
the panel. Useful for re-verifying the Bubbles schema if HP ever stops
updating after a Bubbles update. Remove it once you're confident this
is stable, or just leave it — it's harmless either way.

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
