# PM Status Effects — Owlbear Rodeo Extension

## What's new in this update
- **Full 11-effect catalog**: Burn, Bleed, Paralysis, Fragile,
  Protection, Strength, Feeble, Endurance, Disarm, Haste, Bind.
- **`decay` split into `endTurnDecay` and `damageDecay`** — needed
  because Bleed halves on its own damage button but is completely
  untouched by End Turn, which one shared field couldn't express.
- **Bleed gets its own "Apply Dmg" button**, same mechanism as Burn's,
  built generically — selected tokens only, doesn't touch End Turn.
- **Hover tooltips** on every effect name, showing the exact rules text
  you gave me. Pure CSS, no JavaScript, so this doesn't touch anything
  Owlbear-specific — lowest-risk change in this whole project so far.
- **Paralysis needed zero new code** — it reuses the existing "now"
  button (apply immediately) and the existing "-" button (lose 1 stack
  per use) exactly as-is.

## Icon files you still need to add
These effects don't have artwork yet and will show broken images until
you add matching SVGs to your `icons/` folder:
`bleed.svg`, `paralysis.svg`, `protection.svg`, `strength.svg`,
`endurance.svg`, `disarm.svg`, `bind.svg`

`feeble.svg` can just be a copy of your existing `power_down.svg` if
you want to keep that art — it's a straight rename.

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
