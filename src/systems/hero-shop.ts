// Façade mỏng cho hệ Hero (Sumo): mở khoá + nâng cấp riêng, dùng chung kho xu/level
// của meta-upgrades. Tách khỏi shop NÂNG CẤP cũ (HERO_UPGRADES render ở scene riêng).

import { MetaUpgradeDef, SUMO_UNLOCK, Side } from '../config/game-config';
import { buyUpgrade, getLevel } from './meta-upgrades';

/** Sumo đã mở khoá chưa (mua 1 lần vĩnh viễn). */
export function isHeroUnlocked(): boolean {
  return getLevel(SUMO_UNLOCK.id) >= 1;
}

/** Mua mở khoá Sumo (trừ xu). Trả false nếu thiếu xu hoặc đã mở. */
export function unlockHero(): boolean {
  return buyUpgrade(SUMO_UNLOCK);
}

/** Cấp hiện tại của 1 nâng cấp hero. */
export function heroUpgradeLevel(def: MetaUpgradeDef): number {
  return getLevel(def.id);
}

/** Mua 1 cấp nâng cấp hero (trừ xu). */
export function buyHeroUpgrade(def: MetaUpgradeDef): boolean {
  return buyUpgrade(def);
}

/** Dùng được Sumo trong trận? Chỉ phe Khôi + đã mở khoá. */
export function canUseHero(side: Side, unlocked: boolean): boolean {
  return side === Side.Khoi && unlocked;
}
