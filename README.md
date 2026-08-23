# PM Status Effects — Owlbear Rodeo Extension

## What's new in this update
- **Paralysis (and any delayed effect) is now fully correctable.** Every
  Next Turn effect gets a second, smaller row underneath it: `now  - [n] +`
  — a real bidirectional control on the ACTIVE count, not the old
  one-way "now" button that could only add. The main row above it still
  controls pending (next turn) as before.
- **Button text**: "Apply Dmg" → "Dmg", and it now matches the "now"
  row's small font size instead of being noticeably bigger.
- **Full CRT-terminal restyle** — black background, monospace font,
  green terminal palette, sharp bordered icon boxes, no rounded pill
  buttons. Pulled from your reference image's *style* (palette, font,
  border treatment) — not its layout or content.
- **Scrollbar hidden, scrolling still works.** The effects list is its
  own scrollable region now (banner and buttons stay fixed at the top),
  with the scrollbar itself hidden via CSS rather than disabled —
  mouse wheel, trackpad, and touch drag all still scroll it normally.

## Font size — flag this one specifically
I don't have a live view, so the terminal font sizing (13px body, 11px
buttons, 10px for now-row controls) is a first-pass guess at
"readable but compact." If anything's still off after this, tell me
exactly which text and I'll adjust the specific value rather than
rebalancing everything again.

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
  on the MAP badges (separate from the popover's terminal colors, which
  live in style.css)

## Deploying an update
1. Replace the changed file(s) on GitHub, commit to `main`.
2. Cache-bust: `manifest.json?v=N` (bump N), remove/re-add the
   extension in Owlbear, test in incognito.
3. If something's broken with zero console errors, that's almost
   always stale caching, not a real bug — redo step 2 before assuming
   the code is wrong.
