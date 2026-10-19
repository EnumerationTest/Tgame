"use strict";

// ============================================================
// NUMBER FORMATTING
// ============================================================

const SUFFIXES = [
  "", "K", "M", "B", "T", "Qd", "Qn", "Sx", "Sp", "Oc",
  "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd",
  "Spd", "Od", "Nd", "Vg"
];

function formatNumber(number) {
  if (number === null || number === undefined || isNaN(number)) return "0.00";
  if (!isFinite(number)) return number < 0 ? "-Infinity" : "Infinity";

  const negative = number < 0;
  const value = Math.abs(number);

  let tier = 0;
  while (tier + 1 < SUFFIXES.length && value >= Math.pow(10, (tier + 1) * 3)) {
    tier++;
  }

  let display = value / Math.pow(10, tier * 3);
  if (negative) display = -display;

  return display.toFixed(2) + SUFFIXES[tier];
}

function formatCash(number) {
  return "$" + formatNumber(number);
}

function multiplierText(value) {
  return value.toFixed(2) + "x";
}

// ============================================================
// ANIMALS - 20 TOTAL
// ============================================================

const ANIMAL_COUNT = 20;

const ANIMAL_NAMES = [
  "Cow", "Goat", "Sheep", "Camel", "Water Buffalo",
  "Dragon", "Unicorn", "Mermaid", "Phoenix", "Nine-Tailed Fox",
  "Griffin", "Kraken", "Leviathan", "Pegasus", "Chimera",
  "Cerberus", "Hydra", "Basilisk", "Behemoth", "Titan"
];

// Milk per click: 1, 10, 100, ... 1e19
const ANIMAL_MPC = Array.from({ length: ANIMAL_COUNT }, (_, i) => Math.pow(10, i));

const STARTING_ANIMAL_COSTS = [
  100, 2000, 30000, 400000, 5000000,
  60000000, 700000000, 8000000000, 90000000000, 1e12,
  1e13, 1e14, 1e15, 1e16, 1e17,
  1e18, 1e19, 1e20, 1e21, 1e22
];

// ============================================================
// GAME STATE
// ============================================================

const state = {
  milk: 0,
  cash: 0,
  milkpc: 1,            // base MPC before Rebirth/Prestige multipliers

  rebirths: 0,
  rebirthCost: 1000000,
  rebirthPower: 1.5,    // doubles every Prestige

  prestiges: 0,
  prestigeCost: 5,      // Rebirths needed; grows with every Prestige
  autoMilkers: false,

  animalOwned: new Array(ANIMAL_COUNT).fill(0),
  animalCost: STARTING_ANIMAL_COSTS.slice()
};

// ============================================================
// PRESTIGE COST SCALING
// First Prestige costs 5 Rebirths, then 7, 9, 11, ...
// Change PRESTIGE_COST_INCREASE to make it harder or easier.
// ============================================================

const PRESTIGE_BASE_COST = 5;
const PRESTIGE_COST_INCREASE = 2;

function getPrestigeCost() {
  return PRESTIGE_BASE_COST + state.prestiges * PRESTIGE_COST_INCREASE;
}

// ============================================================
// HELPERS
// ============================================================

function increaseAnimalCost(cost) {
  return cost * 1.5;
}

function getRebirthCostAfterPrestige() {
  return 1000000 * Math.pow(2, state.prestiges);
}

function getBaseMPC() {
  let total = state.milkpc;
  for (let i = 0; i < ANIMAL_COUNT; i++) {
    if (state.animalOwned[i] > 0) {
      total += ANIMAL_MPC[i] * state.animalOwned[i];
    }
  }
  return total;
}

function getCurrentRebirthMPCMultiplier() {
  if (state.rebirths <= 0) return 1;
  return Math.pow(state.rebirthPower, state.rebirths);
}

function getPrestigeMilkMultiplier() {
  return Math.pow(2, state.prestiges);
}

function getPrestigeMultiplier() {
  return Math.pow(2, state.prestiges);
}

function getFinalMPC() {
  return getBaseMPC() *
         getCurrentRebirthMPCMultiplier() *
         getPrestigeMilkMultiplier();
}

function resetAnimals() {
  state.animalOwned.fill(0);
}

function resetAnimalCosts() {
  state.animalCost = STARTING_ANIMAL_COSTS.slice();
}

function resetEverythingForNewGame() {
  state.milk = 0;
  state.cash = 0;
  state.milkpc = 1;

  state.rebirths = 0;
  state.rebirthCost = 1000000;
  state.rebirthPower = 1.5;

  state.prestiges = 0;
  state.prestigeCost = PRESTIGE_BASE_COST;
  state.autoMilkers = false;

  resetAnimals();
  resetAnimalCosts();
}

// ============================================================
// SAVE / LOAD (localStorage)
// ============================================================

const SAVE_KEY = "MilkIncrementalSave";

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log("Could not save game.", e);
  }
}

function loadGame() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    // storage unavailable
  }

  if (!raw) {
    resetEverythingForNewGame();
    console.log("No save found. Starting new game.");
    return;
  }

  try {
    const d = JSON.parse(raw);

    const nums = ["milk", "cash", "milkpc", "rebirths", "rebirthCost",
                  "rebirthPower", "prestiges", "prestigeCost"];
    for (const k of nums) {
      if (typeof d[k] !== "number" || !isFinite(d[k])) throw new Error("bad " + k);
    }
    if (!Array.isArray(d.animalOwned) || d.animalOwned.length !== ANIMAL_COUNT ||
        !Array.isArray(d.animalCost) || d.animalCost.length !== ANIMAL_COUNT) {
      throw new Error("bad animals");
    }

    state.milk = d.milk;
    state.cash = d.cash;
    state.milkpc = d.milkpc;
    state.rebirths = d.rebirths;
    state.rebirthCost = d.rebirthCost;
    state.rebirthPower = d.rebirthPower;
    state.prestiges = d.prestiges;
    // Recompute so older saves (where the cost was always 5) pick up the new scaling.
    state.prestigeCost = getPrestigeCost();
    state.autoMilkers = !!d.autoMilkers;
    state.animalOwned = d.animalOwned.map(Number);
    state.animalCost = d.animalCost.map(Number);

    console.log("Save loaded.");
  } catch (e) {
    console.log("Save is damaged. Starting new game.");
    resetEverythingForNewGame();
  }
}

// ============================================================
// DOM REFERENCES
// ============================================================

const $ = (id) => document.getElementById(id);

const el = {
  mpc: $("mpc"),
  milk: $("milk"),
  cash: $("cash"),
  milkBtn: $("milkBtn"),
  sellBtn: $("sellBtn"),

  rebirthInfo: $("rebirthInfo"),
  rebirthCurrent: $("rebirthCurrent"),
  rebirths: $("rebirths"),
  rebirthPower: $("rebirthPower"),
  rebirthBtn: $("rebirthBtn"),

  prestigeMilkMult: $("prestigeMilkMult"),
  prestigeMult: $("prestigeMult"),
  prestiges: $("prestiges"),
  prestigeCost: $("prestigeCost"),
  autoMilkLabel: $("autoMilkLabel"),
  autoMilkBtn: $("autoMilkBtn"),
  prestigeBtn: $("prestigeBtn"),

  animalGrid: $("animalGrid")
};

const animalEls = []; // { owned, bonus, button }

// ============================================================
// BUILD ANIMAL PANEL
// ============================================================

function buildAnimalPanel() {
  for (let i = 0; i < ANIMAL_COUNT; i++) {
    const box = document.createElement("div");
    box.className = "animal-box";

    const owned = document.createElement("div");
    owned.className = "owned";

    const bonus = document.createElement("div");
    bonus.className = "bonus";

    const button = document.createElement("button");
    button.className = "buy";
    button.addEventListener("click", () => buyAnimal(i));

    box.append(owned, bonus, button);
    el.animalGrid.appendChild(box);

    animalEls.push({ owned, bonus, button });
  }
}

// ============================================================
// UI UPDATE
// ============================================================

function updateMilkCash() {
  el.milk.textContent = "Milk: " + formatNumber(state.milk);
  el.cash.textContent = "Cash: " + formatCash(state.cash);
}

function updateMPC() {
  el.mpc.textContent = "MPC: " + formatNumber(getFinalMPC());
  el.rebirthCurrent.textContent =
    "Current Rebirth MPC Multiplier: " + multiplierText(getCurrentRebirthMPCMultiplier());
}

function updateAnimalUI() {
  for (let i = 0; i < ANIMAL_COUNT; i++) {
    const a = animalEls[i];
    a.owned.textContent = ANIMAL_NAMES[i] + " Owned: " + state.animalOwned[i];

    const bonus = ANIMAL_MPC[i] * state.animalOwned[i];
    a.bonus.textContent = "+" + formatNumber(bonus) + " Milk per click";

    a.button.textContent = "Buy " + ANIMAL_NAMES[i] + " " + formatCash(state.animalCost[i]);
    a.button.classList.toggle("affordable", state.cash >= state.animalCost[i]);
  }
}

function updateRebirthUI() {
  el.rebirths.textContent = "Rebirths: " + state.rebirths;
  el.rebirthPower.textContent = "Rebirth Power: " + multiplierText(state.rebirthPower);
  el.rebirthInfo.textContent =
    "Each Rebirth multiplies MPC by " + multiplierText(state.rebirthPower);
  el.rebirthBtn.textContent = "Rebirth " + formatCash(state.rebirthCost);
}

function updatePrestigeUI() {
  el.prestiges.textContent = "Prestiges: " + state.prestiges;
  el.prestigeMilkMult.textContent =
    "Prestige Milk Multiplier: " + multiplierText(getPrestigeMilkMultiplier());
  el.prestigeMult.textContent =
    "Prestige Multiplier: " + multiplierText(getPrestigeMultiplier());
  el.prestigeCost.textContent = "Prestige Cost: " + state.prestigeCost + " Rebirths";
  el.prestigeBtn.textContent = "Prestige " + state.prestigeCost + " Rebirths";
}

function updateAutoMilkUI() {
  if (state.autoMilkers) {
    el.autoMilkLabel.textContent = "Auto Milkers: ON";
    el.autoMilkBtn.textContent = "Turn Auto Milkers OFF";
  } else if (state.prestiges > 0) {
    el.autoMilkLabel.textContent = "Auto Milkers: OFF";
    el.autoMilkBtn.textContent = "Turn Auto Milkers ON";
  } else {
    el.autoMilkLabel.textContent = "Auto Milkers: LOCKED";
    el.autoMilkBtn.textContent = "Auto Milkers Locked";
  }
  el.autoMilkBtn.disabled = state.prestiges <= 0;
  el.autoMilkLabel.classList.toggle("locked", state.prestiges <= 0);
}

function updateAll() {
  updateMilkCash();
  updateMPC();
  updateAnimalUI();
  updateRebirthUI();
  updatePrestigeUI();
  updateAutoMilkUI();
}

// ============================================================
// ACTIONS
// ============================================================

function buyAnimal(index) {
  const cost = state.animalCost[index];
  if (state.cash >= cost) {
    state.cash -= cost;
    state.animalOwned[index]++;
    state.animalCost[index] = increaseAnimalCost(cost);

    updateMilkCash();
    updateAnimalUI();
    updateMPC();
    saveGame();
  }
}

el.milkBtn.addEventListener("click", () => {
  state.milk += getFinalMPC();
  updateMilkCash();
});

el.sellBtn.addEventListener("click", () => {
  state.cash += state.milk;
  state.milk = 0;
  updateMilkCash();
  updateAnimalUI();
});

el.rebirthBtn.addEventListener("click", () => {
  if (state.cash >= state.rebirthCost) {
    state.rebirths++;

    // Rebirth resets cash, milk & animals.
    state.cash = 0;
    state.milk = 0;

    // Next Rebirth is 50x more expensive.
    state.rebirthCost *= 50;

    resetAnimals();
    resetAnimalCosts();

    updateAll();
    saveGame();
  }
});

el.prestigeBtn.addEventListener("click", () => {
  if (state.rebirths >= state.prestigeCost) {
    state.prestiges++;

    // Double the Rebirth Power.
    state.rebirthPower *= 2;

    // Unlock (and turn on) Auto Milkers.
    state.autoMilkers = true;

    // Reset Rebirths.
    state.rebirths = 0;

    // Rebirth starting cost doubles every Prestige.
    state.rebirthCost = getRebirthCostAfterPrestige();

    // Next Prestige needs more Rebirths than this one did.
    state.prestigeCost = getPrestigeCost();

    // Reset layer progress.
    state.milk = 0;
    state.cash = 0;
    resetAnimals();
    resetAnimalCosts();

    updateAll();
    saveGame();
  }
});

el.autoMilkBtn.addEventListener("click", () => {
  if (state.prestiges > 0) {
    state.autoMilkers = !state.autoMilkers;
    updateAutoMilkUI();
    saveGame();
  }
});

// ============================================================
// AUTO MILKER
// Rate: 0.001s (one click per millisecond). Browsers can't fire
// timers that fast reliably, so we tick often and add one click's
// worth of milk for every millisecond that has passed.
// ============================================================

let lastTick = performance.now();

setInterval(() => {
  const now = performance.now();
  const elapsedMs = now - lastTick;
  lastTick = now;

  if (state.autoMilkers) {
    state.milk += getFinalMPC() * elapsedMs;
    el.milk.textContent = "Milk: " + formatNumber(state.milk);
  }
}, 20);

// ============================================================
// AUTO SAVE
// ============================================================

setInterval(saveGame, 2000);
window.addEventListener("beforeunload", saveGame);

// ============================================================
// START
// ============================================================

loadGame();
buildAnimalPanel();
updateAll();

// ============================================================
// BACKGROUND MUSIC
// No controls. Browsers block sound until the player interacts
// with the page, so it starts on the first click or key press.
// ============================================================

const bgm = document.getElementById("bgm");
bgm.volume = 0.4; // 0.0 (silent) to 1.0 (full volume)

function startMusic() {
  bgm.play().then(() => {
    document.removeEventListener("click", startMusic);
    document.removeEventListener("keydown", startMusic);
    document.removeEventListener("touchstart", startMusic);
  }).catch(() => {
    // Still blocked or file missing; try again on the next interaction.
  });
}

// If the file can't be loaded, say so in the browser console (F12 > Console).
bgm.addEventListener("error", () => {
  console.warn(
    "Background music failed to load: " + bgm.currentSrc +
    "\nCheck that the file is uploaded next to index.html and that the " +
    "name matches exactly (GitHub is case-sensitive)."
  );
});

// Try right away (works if the browser allows autoplay), then fall back.
startMusic();
document.addEventListener("click", startMusic);
document.addEventListener("keydown", startMusic);
document.addEventListener("touchstart", startMusic);
