// Loaded straight from a CDN so there's no npm/build step required.
import OBR, { buildImage, buildText, isImage } from "https://esm.sh/@owlbear-rodeo/sdk@2";

const ID = "com.danielpm.statuseffects";
const METADATA_KEY = `${ID}/effects`;
const BADGE_FLAG = `${ID}/badge`;

// ---------------------------------------------------------------------
// EDIT THIS LIST to add, remove, or change effects.
// ---------------------------------------------------------------------
const EFFECTS = [
  { id: "burn", name: "Burn", icon: "icons/burn.svg", max: 5 },
  { id: "haste", name: "Haste", icon: "icons/haste.svg", max: 3 },
  { id: "power_down", name: "Power Down", icon: "icons/power_down.svg", max: 3 },
  { id: "fragile", name: "Fragile", icon: "icons/fragile.svg", max: 3 },
];

const BADGE_SCALE = 0.14;
const BADGE_GAP_SCALE = 1.0; // was 0.5 — doubled, gap now equals a full icon width
const ICON_PX = 128; // MUST match your actual icon file dimensions (yours are 128x128)
const FLUSH_DELAY_MS = 250; // how long clicking has to pause before we sync

// Styling for the stack-count number. This is a plain Text item, not a
// Label/image-caption — those two ignore zoom by design, a Text item
// scales with the map like everything else, which is what we want here.
const COUNT_FONT_COLOR = "#ffffff";

let selectedTokenId = null;
let gridDpi = 150;
let authoritative = {}; // last known SYNCED counts for the selected token
let pending = {};       // un-sent click deltas since the last flush
let flushTimer = null;

let reconcileBusy = false;
let reconcileQueued = false;

// Wrapper that guarantees only one reconcileBadges run is ever in flight.
// Without this, a scene update could trigger a second run before the
// first one's add/delete calls had actually finished, causing both runs
// to add duplicate badges — which is what was hammering the rate limit
// and making effects disappear.
async function scheduleReconcile(items) {
  if (reconcileBusy) {
    reconcileQueued = true;
    return;
  }
  reconcileBusy = true;
  try {
    await reconcileBadges(items);
  } finally {
    reconcileBusy = false;
    if (reconcileQueued) {
      reconcileQueued = false;
      scheduleReconcile(await OBR.scene.items.getItems());
    }
  }
}

OBR.onReady(async () => {
  gridDpi = await OBR.scene.grid.getDpi();

  renderEffectRows();
  await loadSelectedToken();

  OBR.player.onChange(async () => {
    await flushNow(); // don't lose clicks if you switch tokens mid-click
    await loadSelectedToken();
  });

  OBR.scene.items.onChange(async (items) => {
    scheduleReconcile(items);
    if (selectedTokenId) {
      const token = items.find((i) => i.id === selectedTokenId);
      if (token) {
        authoritative = token.metadata[METADATA_KEY] || {};
        updateCountDisplays();
      }
    }
  });

  scheduleReconcile(await OBR.scene.items.getItems());
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
  root.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    handleClick(e.target.dataset.id, parseInt(e.target.dataset.delta, 10));
  });
}

async function loadSelectedToken() {
  const selection = await OBR.player.getSelection();
  selectedTokenId = selection && selection.length === 1 ? selection[0] : null;

  const banner = document.getElementById("banner");
  const panel = document.getElementById("effects");

  if (!selectedTokenId) {
    banner.textContent = "Select exactly one token";
    panel.classList.add("disabled");
    authoritative = {};
    pending = {};
    return;
  }

  const [token] = await OBR.scene.items.getItems([selectedTokenId]);
  panel.classList.remove("disabled");
  banner.textContent = (token && token.name) || "Selected token";
  authoritative = (token && token.metadata[METADATA_KEY]) || {};
  pending = {};
  updateCountDisplays();
}

function updateCountDisplays() {
  for (const effect of EFFECTS) {
    const el = document.getElementById(`count-${effect.id}`);
    if (!el) continue;
    el.textContent = clampCount(
      effect,
      (authoritative[effect.id] || 0) + (pending[effect.id] || 0)
    );
  }
}

function clampCount(effect, value) {
  return Math.max(0, Math.min(effect.max, value));
}

// Instant visual feedback on click. Network sync happens separately,
// only once clicking pauses (see flushNow).
function handleClick(effectId, delta) {
  if (!selectedTokenId) return;
  pending[effectId] = (pending[effectId] || 0) + delta;
  updateCountDisplays();

  clearTimeout(flushTimer);
  flushTimer = setTimeout(flushNow, FLUSH_DELAY_MS);
}

async function flushNow() {
  clearTimeout(flushTimer);
  if (!selectedTokenId || Object.keys(pending).length === 0) return;

  const deltas = { ...pending };
  pending = {};

  await OBR.scene.items.updateItems([selectedTokenId], (items) => {
    for (const item of items) {
      const current = item.metadata[METADATA_KEY] || {};
      const next = { ...current };
      for (const [id, delta] of Object.entries(deltas)) {
        const effect = EFFECTS.find((e) => e.id === id);
        next[id] = clampCount(effect, (current[id] || 0) + delta);
      }
      item.metadata[METADATA_KEY] = next;
    }
  });
}

// ---------------------------------------------------------------------
// Rebuilds the icon badges above each token. Only touches badges that
// actually changed, so it can't loop on itself.
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
      // Each active effect is TWO items on the map now: the icon and its
      // count label, so they need to be checked/replaced as a pair.
      const parts = existingForToken.filter(
        (b) => b.metadata[BADGE_FLAG].effectId === effect.id
      );
      const upToDate = parts.length === 2 && parts.every((p) => p.metadata[BADGE_FLAG].count === count);
      if (upToDate) return;
      toDelete.push(...parts.map((p) => p.id));
      toAdd.push(...buildBadgePair(token, effect, count, index));
    });

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

function buildBadgePair(token, effect, count, index) {
  const badgeSize = gridDpi * BADGE_SCALE;
  const gap = badgeSize * BADGE_GAP_SCALE;
  const tokenWidth = token.width ?? gridDpi;
  const tokenHeight = token.height ?? gridDpi;

  const x = token.position.x - tokenWidth / 2 + index * (badgeSize + gap) + badgeSize / 2;
  const y = token.position.y - tokenHeight / 2 - badgeSize / 2 - gap;

  const icon = buildImage(
    {
      width: ICON_PX,
      height: ICON_PX,
      url: new URL(effect.icon, window.location.href).href,
      mime: "image/svg+xml",
    },
    { dpi: ICON_PX / BADGE_SCALE, offset: { x: ICON_PX / 2, y: ICON_PX / 2 } }
  )
    .attachedTo(token.id)
    .position({ x, y })
    .locked(true)
    .disableHit(true)
    .metadata({ [BADGE_FLAG]: { effectId: effect.id, count, part: "icon" } })
    .build();

  // Separate item just for the number, drawn as plain Text (not a
  // Label/image-caption) so it scales with the map instead of staying
  // a fixed screen size as you zoom.
  const label = buildText()
    .plainText(String(count))
    .attachedTo(token.id)
    .position({ x: x + badgeSize * 0.32, y: y + badgeSize * 0.32 })
    .fontSize(gridDpi * 0.09)
    .fillColor(COUNT_FONT_COLOR)
    .locked(true)
    .disableHit(true)
    .metadata({ [BADGE_FLAG]: { effectId: effect.id, count, part: "count" } })
    .build();

  return [icon, label];
}
