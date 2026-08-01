import {
  ALL_HERO_UPGRADES,
  ALL_TITAN_UPGRADES,
  CANNON_UPGRADES,
  META_UPGRADES,
  MetaUpgradeDef,
  SideMods,
  UnitType,
  metaFactor,
  metaUpgradeCost,
  uniformSideMods,
} from '../config/game-config';

// Nâng cấp vĩnh viễn của người chơi: lưu cấp mỗi nâng cấp + kho "xu" trong localStorage.

const LEVELS_KEY = 'dckn-meta';
const COINS_KEY = 'dckn-coins';

const memLevels: Record<string, number> = {};
let memCoins = 0;

function loadLevels(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') return memLevels;
    const raw = localStorage.getItem(LEVELS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return memLevels;
  }
}

function saveLevels(map: Record<string, number>): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LEVELS_KEY, JSON.stringify(map));
  } catch {
    /* bỏ qua */
  }
}

export function getCoins(): number {
  try {
    if (typeof localStorage === 'undefined') return memCoins;
    return Number(localStorage.getItem(COINS_KEY) ?? 0) || 0;
  } catch {
    return memCoins;
  }
}

export function addCoins(amount: number): number {
  const total = Math.max(0, Math.floor(getCoins() + amount));
  memCoins = total;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(COINS_KEY, String(total));
  } catch {
    /* bỏ qua */
  }
  return total;
}

/** Xóa toàn bộ xu + cấp nâng cấp — dùng cho "Chơi lại từ đầu". */
export function resetMetaProgress(): void {
  memCoins = 0;
  for (const k of Object.keys(memLevels)) delete memLevels[k];
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(COINS_KEY);
    localStorage.removeItem(LEVELS_KEY);
  } catch {
    /* bỏ qua */
  }
}

export function getLevel(id: string): number {
  return loadLevels()[id] ?? 0;
}

export function nextCost(def: MetaUpgradeDef): number {
  return metaUpgradeCost(def, getLevel(def.id));
}

export function isMaxed(def: MetaUpgradeDef): boolean {
  return getLevel(def.id) >= def.maxLevel;
}

/** Mua 1 cấp nếu đủ xu & chưa tối đa. Trả về true nếu thành công. */
export function buyUpgrade(def: MetaUpgradeDef): boolean {
  if (isMaxed(def)) return false;
  const cost = nextCost(def);
  if (getCoins() < cost) return false;
  addCoins(-cost);
  const map = loadLevels();
  map[def.id] = (map[def.id] ?? 0) + 1;
  memLevels[def.id] = map[def.id];
  saveLevels(map);
  return true;
}

/**
 * SideMods của người chơi tính từ các cấp nâng cấp đã mua.
 * Gồm cả nâng cấp thường (META_UPGRADES) lẫn nâng cấp hero (HERO_UPGRADES — ×2 hệ số,
 * chỉ chạm chỉ số của Sumo).
 */
export function computePlayerMods(): SideMods {
  const mods = uniformSideMods(1); // khởi đầu tất cả ×1
  const apply = (def: MetaUpgradeDef) => {
    const level = getLevel(def.id);
    if (level <= 0) return;
    const factor = metaFactor(def, level);
    switch (def.target) {
      case 'baseHp': mods.baseHp *= factor; break;
      case 'roofDmg': mods.roofDmg *= factor; break;
      case 'roofCd': mods.roofCd *= factor; break;
      case 'cannonDmg': mods.cannonDmg *= factor; break;
      case 'cannonCd': mods.cannonCd *= factor; break;
      case 'income': mods.income *= factor; break;
      case 'unitHp': mods.unitHp[def.unitType as UnitType] *= factor; break;
      case 'unitDmg': mods.unitDmg[def.unitType as UnitType] *= factor; break;
      case 'unitCost': mods.unitCost[def.unitType as UnitType] *= factor; break;
      case 'unitSpawnCd': mods.unitSpawnCd[def.unitType as UnitType] *= factor; break;
    }
  };
  for (const def of META_UPGRADES) apply(def);
  for (const def of ALL_HERO_UPGRADES) apply(def);
  for (const def of ALL_TITAN_UPGRADES) apply(def);
  for (const def of CANNON_UPGRADES) apply(def);
  return mods;
}
