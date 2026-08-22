# PM Status Effects — Owlbear Rodeo Extension

## What's new in this update
- **Fixed a real positioning bug**: badges were slotted by fixed catalog
  order, and an existing badge never got told to move when a new effect
  pushed it over — that's why Burn was landing on top of Haste. Fixed by
  tracking a stable "order" per effect on the token itself, assigned the
  first time it becomes shown and cleared when it fully drops to zero —
  so a slot is claimed once and stays put, new effects append at the end.
- **Icon dimming for pending-only effects**: images can't have opacity
  (confirmed, not available on any builder), so this uses a semi-
  transparent dark rectangle drawn over the icon instead, via Shape's
  `fillOpacity` — a real, confirmed property. This is new and unverified
  in practice — if the overlay looks wrong (wrong position, wrong
  layering, or just not there), tell me exactly what you see.
- **Numbers moved closer to their icons** — was `badgeSize * 0.65` from
  the icon's position, now `0.45`. Tune further if still not right.

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
