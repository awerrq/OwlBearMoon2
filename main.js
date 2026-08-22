// Loaded straight from a CDN so there's no npm/build step required.
import OBR, { buildImage, buildText, isImage } from "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";

const ID = "com.danielpm.statuseffects";
const METADATA_KEY = `${ID}/effects`;
const BADGE_FLAG = `${ID}/badge`;

// ---------------------------------------------------------------------
// EDIT THIS LIST to add, remove, or change effects.
// timing: "immediate" applies the moment you click it (like Burn).
//         "delayed" queues as pending and only activates on End Turn.
// decay:  what happens to the ACTIVE amount every time End Turn is
//         pressed. "halve" rounds down, "clear" zeroes it, "none"
//         leaves it untouched.
// ---------------------------------------------------------------------
const EFFECTS = [
  { id: "burn", name: "Burn", icon: "icons/burn.svg", max: 99, timing: "immediate", decay: "halve" },
  { id: "haste", name: "Haste", icon: "icons/haste.svg", max: 99, timing: "delayed", decay: "clear" },
  { id: "power_down", name: "Power Down", icon: "icons/power_down.svg", max: 99, timing: "delayed", decay: "clear" },
  { id: "fragile", name: "Fragile", icon: "icons/fragile.svg", max: 99, timing: "delayed", decay: "clear" },
];

const BADGE_SCALE = 0.14;
const BADGE_GAP_SCALE = 0.8; // horizontal space BETWEEN separate effects
const ROW_HEIGHT_SCALE = 0.2;
const ICON_PX = 80; // MUST match your actual icon file dimensions
const FLUSH_DELAY_MS = 250; // how long clicking has to pause before we sync

const COUNT_FONT_COLOR = "#ffffff"; // active
const PENDING_FONT_COLOR = "#8a8f9c"; // pending-only — muted instead of translucent

let selectedTokenIds = []; // a list, not a single id — multi-select
let gridDpi = 150;
let authoritative = {}; // { effectId: {active, pending} } — only meaningful for a single selection
let pendingDeltas = {}; // un-sent click deltas since the last flush, keyed "effectId:field"
let flushTimer = null;

let reconcileBusy = false;
let reconcileQueued = false;

// Wrapper that guarantees only one reconcileBadges run is ever in flight.
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
  document.getElementById("reset-btn").addEventListener("click", handleReset);
  document.getElementById("end-turn-btn").addEventListener("click", handleEndTurn);
  document.getElementById("debug-btn").addEventListener("click", handleDebugPrint);
  await loadSelection();

  OBR.player.onChange(async () => {
    await flushNow();
    await loadSelection();
  });

  OBR.scene.items.onChange(async (items) => {
    scheduleReconcile(items);
    if (selectedTokenIds.length === 1) {
      const token = items.find((i) => i.id === selectedTokenIds[0]);
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
    const hint = effect.timing === "delayed" ? ` <span class="next-turn">(next turn)</span>` : "";
    row.innerHTML = `
      <img class="effect-icon" src="${effect.icon}" alt="" />
      <span class="effect-name">${effect.name}${hint}</span>
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

async function loadSelection() {
  const selection = await OBR.player.getSelection();
  selectedTokenIds = selection || [];

  const banner = document.getElementById("banner");
  const panel = document.getElementById("effects");
  const resetBtn = document.getElementById("reset-btn");

  if (selectedTokenIds.length === 0) {
    banner.textContent = "Select one or more tokens";
    panel.classList.add("disabled");
    resetBtn.disabled = true;
    authoritative = {};
    pendingDeltas = {};
    updateCountDisplays();
    return;
  }

  panel.classList.remove("disabled");
  resetBtn.disabled = false;

  if (selectedTokenIds.length === 1) {
    const [token] = await OBR.scene.items.getItems(selectedTokenIds);
    banner.textContent = (token && token.name) || "Selected token";
    authoritative = (token && token.metadata[METADATA_KEY]) || {};
  } else {
    banner.textContent = `${selectedTokenIds.length} tokens selected`;
    authoritative = {};
  }
  pendingDeltas = {};
  updateCountDisplays();
}

// Each effect edits ONE field depending on its timing: immediate effects
// edit "active" directly, delayed effects always edit "pending".
function fieldFor(effect) {
  return effect.timing === "delayed" ? "pending" : "active";
}

function updateCountDisplays() {
  const isMulti = selectedTokenIds.length > 1;
  document.getElementById("effects").classList.toggle("multi-select", isMulti);
  if (isMulti) return; // no single shared number to show

  for (const effect of EFFECTS) {
    const field = fieldFor(effect);
    const base = (authoritative[effect.id] || {})[field] || 0;
    const delta = pendingDeltas[`${effect.id}:${field}`] || 0;
    const el = document.getElementById(`count-${effect.id}`);
    if (el) el.textContent = clampCount(effect, base + delta);
  }
}

function clampCount(effect, value) {
  return Math.max(0, Math.min(effect.max, value));
}

// Assigns a stable "order" to any effect that just became shown (active
// or pending > 0) and doesn't have one yet, so it appends after whatever
// is already there instead of jumping to a fixed catalog position.
// Effects that drop back to fully zero lose their order, so if they
// return later they re-append at the end rather than reusing a stale slot.
function reconcileOrder(next) {
  let maxOrder = -1;
  for (const effect of EFFECTS) {
    const s = next[effect.id];
    const shown = s && ((s.active || 0) > 0 || (s.pending || 0) > 0);
    if (shown && typeof s.order === "number") maxOrder = Math.max(maxOrder, s.order);
  }
  let nextOrder = maxOrder + 1;
  for (const effect of EFFECTS) {
    const s = next[effect.id];
    if (!s) continue;
    const shown = (s.active || 0) > 0 || (s.pending || 0) > 0;
    if (shown && typeof s.order !== "number") s.order = nextOrder++;
    else if (!shown) delete s.order;
  }
}

function handleClick(effectId, delta) {
  if (selectedTokenIds.length === 0) return;
  const effect = EFFECTS.find((e) => e.id === effectId);
  const key = `${effectId}:${fieldFor(effect)}`;
  pendingDeltas[key] = (pendingDeltas[key] || 0) + delta;
  updateCountDisplays();

  clearTimeout(flushTimer);
  flushTimer = setTimeout(flushNow, FLUSH_DELAY_MS);
}

async function flushNow() {
  clearTimeout(flushTimer);
  if (selectedTokenIds.length === 0 || Object.keys(pendingDeltas).length === 0) return;

  const deltas = { ...pendingDeltas };
  pendingDeltas = {};

  await OBR.scene.items.updateItems(selectedTokenIds, (items) => {
    for (const item of items) {
      const current = item.metadata[METADATA_KEY] || {};
      const next = {};
      for (const effect of EFFECTS) {
        const cur = current[effect.id] || {};
        next[effect.id] = { active: cur.active || 0, pending: cur.pending || 0, order: cur.order };
      }
      for (const [key, delta] of Object.entries(deltas)) {
        const [effectId, field] = key.split(":");
        const effect = EFFECTS.find((e) => e.id === effectId);
        next[effectId][field] = clampCount(effect, next[effectId][field] + delta);
      }
      reconcileOrder(next);
      item.metadata[METADATA_KEY] = next;
    }
  });
}

// TEMPORARY — remove once the HP integration is built and confirmed.
// Prints every metadata key on the selected token(s) to the console so
// we can find exactly what another extension (e.g. Bubbles) is storing.
async function handleDebugPrint() {
  if (selectedTokenIds.length === 0) {
    console.log("[debug] no token selected");
    return;
  }
  const items = await OBR.scene.items.getItems(selectedTokenIds);
  for (const item of items) {
    console.log(`[debug] "${item.name}" (${item.id}) metadata:`, item.metadata);
  }
}

async function handleReset() {
  if (selectedTokenIds.length === 0) return;
  clearTimeout(flushTimer);
  pendingDeltas = {};

  await OBR.scene.items.updateItems(selectedTokenIds, (items) => {
    for (const item of items) {
      item.metadata[METADATA_KEY] = {};
    }
  });

  if (selectedTokenIds.length === 1) authoritative = {};
  updateCountDisplays();
}

// Global — affects EVERY character token on the map, not just selected.
// Order matters: decay whatever was already active FIRST, then promote
// pending into active. That way an effect that just got promoted this
// press survives until at least the NEXT End Turn, instead of being
// wiped by the same click that activated it.
async function handleEndTurn() {
  const tokens = await OBR.scene.items.getItems(
    (item) => item.layer === "CHARACTER" && isImage(item)
  );
  if (tokens.length === 0) return;
  const ids = tokens.map((t) => t.id);

  await OBR.scene.items.updateItems(ids, (items) => {
    for (const item of items) {
      const current = item.metadata[METADATA_KEY] || {};
      const next = {};
      for (const effect of EFFECTS) {
        const cur = current[effect.id] || {};
        let active = cur.active || 0;
        let pend = cur.pending || 0;

        if (effect.decay === "halve") active = Math.floor(active / 2);
        else if (effect.decay === "clear") active = 0;

        if (pend > 0) {
          active = clampCount(effect, active + pend);
          pend = 0;
        }

        next[effect.id] = { active, pending: pend, order: cur.order };
      }
      reconcileOrder(next);
      item.metadata[METADATA_KEY] = next;
    }
  });
}

// ---------------------------------------------------------------------
// Rebuilds the badges above each token. One slot per EFFECT, not per
// active/pending state — an effect with both gets a solid main number
// plus a smaller translucent "+N" next to it, instead of two icons.
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
    const shown = EFFECTS.filter((e) => {
      const s = state[e.id] || {};
      return (s.active || 0) > 0 || (s.pending || 0) > 0;
    }).sort((a, b) => {
      const oa = (state[a.id] || {}).order ?? 999;
      const ob = (state[b.id] || {}).order ?? 999;
      return oa - ob;
    });
    const existingForToken = ourBadges.filter((b) => b.attachedTo === token.id);

    shown.forEach((effect, index) => {
      const s = state[effect.id] || {};
      const active = s.active || 0;
      const pend = s.pending || 0;
      const showSecondary = active > 0 && pend > 0;
      const expectedParts = 2 + (showSecondary ? 1 : 0);

      const parts = existingForToken.filter(
        (b) => b.metadata[BADGE_FLAG].effectId === effect.id
      );
      const upToDate =
        parts.length === expectedParts &&
        parts.every(
          (p) =>
            p.metadata[BADGE_FLAG].active === active &&
            p.metadata[BADGE_FLAG].pending === pend &&
            p.metadata[BADGE_FLAG].index === index
        );
      if (upToDate) return;

      toDelete.push(...parts.map((p) => p.id));
      toAdd.push(...buildBadgeGroup(token, effect, { active, pending: pend }, index));
    });

    for (const badge of existingForToken) {
      const stillWanted = shown.some((e) => e.id === badge.metadata[BADGE_FLAG].effectId);
      if (!stillWanted) toDelete.push(badge.id);
    }
  }

  if (toDelete.length) await OBR.scene.items.deleteItems([...new Set(toDelete)]);
  if (toAdd.length) await OBR.scene.items.addItems(toAdd);
}

function buildBadgeGroup(token, effect, state, index) {
  const { active, pending } = state;
  const badgeSize = gridDpi * BADGE_SCALE;
  const gap = badgeSize * BADGE_GAP_SCALE;
  const tokenWidth = token.width ?? gridDpi;
  const tokenHeight = token.height ?? gridDpi;

  const x = token.position.x - tokenWidth / 2 + index * (badgeSize + gap) + badgeSize / 2;
  const y = token.position.y - tokenHeight / 2 - badgeSize / 2 - badgeSize * ROW_HEIGHT_SCALE;

  const hasActive = active > 0;
  const mainCount = hasActive ? active : pending; // pending-only shows in muted color
  const showSecondary = hasActive && pending > 0;

  const items = [];

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
    .metadata({ [BADGE_FLAG]: { effectId: effect.id, active, pending, index, part: "icon" } })
    .build();
  items.push(icon);

  const textBoxSize = badgeSize * 1.4;
  const mainLabel = buildText()
    .richText([{ type: "paragraph", children: [{ text: String(mainCount) }] }])
    .width(textBoxSize)
    .height(textBoxSize)
    .textAlign("CENTER")
    .textAlignVertical("MIDDLE")
    .attachedTo(token.id)
    .position({ x: x + badgeSize * 0.45, y })
    .fontSize(gridDpi * 0.09)
    .fillColor(hasActive ? COUNT_FONT_COLOR : PENDING_FONT_COLOR)
    .locked(true)
    .disableHit(true)
    .metadata({ [BADGE_FLAG]: { effectId: effect.id, active, pending, index, part: "count" } })
    .build();
  items.push(mainLabel);

  if (showSecondary) {
    const secondary = buildText()
      .richText([{ type: "paragraph", children: [{ text: `+${pending}` }] }])
      .width(textBoxSize * 0.7)
      .height(textBoxSize * 0.7)
      .textAlign("CENTER")
      .textAlignVertical("MIDDLE")
      .attachedTo(token.id)
      .position({ x: x + badgeSize * 0.95, y: y + badgeSize * 0.35 })
      .fontSize(gridDpi * 0.06)
      .fillColor(PENDING_FONT_COLOR)
      .locked(true)
      .disableHit(true)
      .metadata({ [BADGE_FLAG]: { effectId: effect.id, active, pending, index, part: "pendingCount" } })
      .build();
    items.push(secondary);
  }

  return items;
}
