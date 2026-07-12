// Loaded straight from a CDN so there's no npm/build step required.
import OBR, { buildImage, isImage } from "https://esm.sh/@owlbear-rodeo/sdk@2";

const ID = "com.danielpm.statuseffects";
const METADATA_KEY = `${ID}/effects`;
const BADGE_FLAG = `${ID}/badge`;

// ---------------------------------------------------------------------
// EDIT THIS LIST to add, remove, or change effects. That's the only
// place you should need to touch for normal balance/content changes.
// "max" is the highest stack count the + button will allow.
// ---------------------------------------------------------------------
const EFFECTS = [
  { id: "burn", name: "Burn", icon: "icons/burn.svg", max: 5 },
  { id: "haste", name: "Haste", icon: "icons/haste.svg", max: 3 },
  { id: "power_down", name: "Power Down", icon: "icons/power_down.svg", max: 3 },
  { id: "fragile", name: "Fragile", icon: "icons/fragile.svg", max: 3 },
];

// How big a badge is, as a fraction of one grid cell. 0.28 = a little
// over a quarter of the token's width. Bump this up/down to taste.
const BADGE_SCALE = 0.28;
const ICON_PX = 28; // raw pixel size of the source SVGs, don't need to change this

let selectedTokenId = null;
let gridDpi = 150; // sensible fallback, gets replaced with the real value below

OBR.onReady(async () => {
  gridDpi = await OBR.scene.grid.getDpi();

  renderEffectRows();
  await refreshSelection();

  OBR.player.onChange(async () => {
    await refreshSelection();
  });

  OBR.scene.items.onChange(reconcileBadges);
  reconcileBadges(await OBR.scene.items.getItems());
});

function renderEffectRows() {
  const root = document.getElementById("effects");
  root.innerHTML = "";
  for (const effect of EFFECTS) {
    const row = document.createElement("div");
    row.className = "effect-row";
    row.innerHTML = `
      <img class="effect-icon" src="${effect.icon}" alt="" />
      <span class="effect-name">${effect.name}</span>
      <button data-id="${effect.id}" data-delta="-1">-</button>
      <span class="effect-count" id="count-${effect.id}">0</span>
      <button data-id="${effect.id}" data-delta="1">+</button>
    `;
    root.appendChild(row);
  }
  root.addEventListener("click", async (e) => {
    if (e.target.tagName !== "BUTTON") return;
    await changeEffect(e.target.dataset.id, parseInt(e.target.dataset.delta, 10));
  });
}

async function refreshSelection() {
  const selection = await OBR.player.getSelection();
  selectedTokenId = selection && selection.length === 1 ? selection[0] : null;

  const banner = document.getElementById("banner");
  const panel = document.getElementById("effects");

  if (!selectedTokenId) {
    banner.textContent = "Select exactly one token";
    panel.classList.add("disabled");
    return;
  }

  const [token] = await OBR.scene.items.getItems([selectedTokenId]);
  if (!token) return;

  panel.classList.remove("disabled");
  banner.textContent = token.name || "Selected token";

  const current = token.metadata[METADATA_KEY] || {};
  for (const effect of EFFECTS) {
    const el = document.getElementById(`count-${effect.id}`);
    if (el) el.textContent = current[effect.id] || 0;
  }
}

async function changeEffect(effectId, delta) {
  if (!selectedTokenId) return;
  const def = EFFECTS.find((e) => e.id === effectId);

  await OBR.scene.items.updateItems([selectedTokenId], (items) => {
    for (const item of items) {
      const current = item.metadata[METADATA_KEY] || {};
      const next = Math.max(0, Math.min(def.max, (current[effectId] || 0) + delta));
      item.metadata[METADATA_KEY] = { ...current, [effectId]: next };
    }
  });

  await refreshSelection();
}

// ---------------------------------------------------------------------
// Rebuilds the little icon badges that sit above each token.
// This only touches badges that actually need to change (added, removed,
// or count updated) instead of wiping everything every time — that's
// what was causing the infinite loop / disappearing effects before.
// ---------------------------------------------------------------------
async function reconcileBadges(items) {
  const tokens = items.filter((item) => item.layer === "CHARACTER" && isImage(item));
  if (tokens.length === 0) return;

  const attachments = await OBR.scene.items.getItemAttachments(tokens.map((t) => t.id));
  const ourBadges = attachments.filter((a) => a.metadata && a.metadata[BADGE_FLAG]);

  const toDelete = [];
  const toAdd = [];

  for (const token of tokens) {
    const state = token.metadata[METADATA_KEY] || {};
    const active = EFFECTS.filter((e) => (state[e.id] || 0) > 0);
    const existingForToken = ourBadges.filter((b) => b.attachedTo === token.id);

    active.forEach((effect, index) => {
      const count = state[effect.id];
      const match = existingForToken.find(
        (b) => b.metadata[BADGE_FLAG].effectId === effect.id
      );

      if (match && match.metadata[BADGE_FLAG].count === count) {
        return; // already correct on the map, don't touch it
      }
      if (match) {
        toDelete.push(match.id); // stale count, will recreate below
      }
      toAdd.push(buildBadge(token, effect, count, index));
    });

    // remove badges for effects that dropped to zero
    for (const badge of existingForToken) {
      const stillWanted = active.some(
        (e) => e.id === badge.metadata[BADGE_FLAG].effectId
      );
      if (!stillWanted) toDelete.push(badge.id);
    }
  }

  if (toDelete.length) await OBR.scene.items.deleteItems([...new Set(toDelete)]);
  if (toAdd.length) await OBR.scene.items.addItems(toAdd);
}

function buildBadge(token, effect, count, index) {
  const badgeSize = gridDpi * BADGE_SCALE;
  const gap = badgeSize * 0.15;
  const tokenWidth = token.width ?? gridDpi;
  const tokenHeight = token.height ?? gridDpi;

  return buildImage(
    {
      width: ICON_PX,
      height: ICON_PX,
      url: new URL(effect.icon, window.location.href).href,
      mime: "image/svg+xml",
    },
    { dpi: ICON_PX / BADGE_SCALE, offset: { x: ICON_PX / 2, y: ICON_PX / 2 } }
  )
    .attachedTo(token.id)
    .position({
      x: token.position.x - tokenWidth / 2 + index * (badgeSize + gap) + badgeSize / 2,
      y: token.position.y - tokenHeight / 2 - badgeSize / 2 - gap,
    })
    .plainText(String(count))
    .locked(true)
    .metadata({ [BADGE_FLAG]: { effectId: effect.id, count } })
    .build();
}
