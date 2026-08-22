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
- **Badge display**: one slot per effect, not per state. Solid = active.
  Translucent = pending-only. If an effect has both, you get a solid
  main number plus a smaller translucent "+N" next to it.

## Not done yet
HP/damage integration with a health-bar extension (e.g. Bubbles) is a
deliberately separate follow-up — not built in this pass.

## Files in this update
`index.html`, `style.css`, and `main.js` all changed this round.
`manifest.json` and your icon files are untouched.

## One thing to verify — genuinely uncertain this time
The badge code calls `.opacity(...)` on the icon and text builders to
make pending effects look translucent. This is *not* explicitly
confirmed in Owlbear's docs the way `.locked()`/`.disableHit()` were —
it's a reasonable bet based on those being shared base-item properties,
but untested. If pending effects show up at full opacity instead of
faded, or if the console shows an error naming `.opacity`, that's the
first thing to fix — tell me and I'll adjust.

## To add / change / remove an effect
Edit the `EFFECTS` array in `main.js`. Remember the new `timing` and
`decay` fields — every effect needs both now:

```js
{ id: "bleed", name: "Bleed", icon: "icons/bleed.svg", max: 99, timing: "immediate", decay: "halve" },
```

## Tuning constants (all near the top of main.js)
- `BADGE_SCALE`, `BADGE_GAP_SCALE`, `ROW_HEIGHT_SCALE`, `ICON_PX` — same as before
- `PENDING_OPACITY` — how faded a pending-only badge looks (0–1)

## Deploying an update
1. Replace the changed file(s) on GitHub, commit to `main`.
2. Cache-bust: `manifest.json?v=N` (bump N), remove/re-add the
   extension in Owlbear, test in incognito.
3. If something's broken with zero console errors, that's almost
   always stale caching, not a real bug — redo step 2 before assuming
   the code is wrong.
