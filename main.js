// Loaded straight from a CDN so there's no npm/build step required.
// If this ever breaks, swap to the official npm package + a Vite build instead.
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

let selectedTokenId = null;

OBR.onReady(async () => {
  renderEffectRows();
  await refreshSelection();

  OBR.player.onChange(async () => {
    await refreshSelection();
  });

  // Any time ANY token's effect data changes, re-draw every badge.
  // Simple approach: wipe our badges and rebuild from scratch each time.
  // Fine for the token counts a homebrew game actually has on screen.
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
// Rebuilds the little icon badges that sit on top of each token.
// ---------------------------------------------------------------------
async function reconcileBadges(items) {
  const tokens = items.filter((item) => item.layer === "CHARACTER" && isImage(item));
  if (tokens.length === 0) return;

  const attachments = await OBR.scene.items.getItemAttachments(tokens.map((t) => t.id));
  const ourBadges = attachments.filter((a) => a.metadata && a.metadata[BADGE_FLAG]);

  const toDelete = ourBadges.map((b) => b.id);
  const toAdd = [];

  for (const token of tokens) {
    const state = token.metadata[METADATA_KEY] || {};
    const active = EFFECTS.filter((e) => (state[e.id] || 0) > 0);

    active.forEach((effect, index) => {
      const count = state[effect.id];
      const badge = buildImage(
        {
          width: 28,
          height: 28,
          url: new URL(effect.icon, window.location.href).href,
          mime: "image/svg+xml",
        },
        { dpi: 28, offset: { x: 14, y: 14 } }
      )
        .attachedTo(token.id)
        .position({
          x: token.position.x - (token.width ?? 150) / 2 + index * 22,
          y: token.position.y - (token.height ?? 150) / 2,
        })
        .plainText(String(count))
        .locked(true)
        .metadata({ [BADGE_FLAG]: true })
        .build();
      toAdd.push(badge);
    });
  }

  if (toDelete.length) await OBR.scene.items.deleteItems(toDelete);
  if (toAdd.length) await OBR.scene.items.addItems(toAdd);
}
