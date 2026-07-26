// Façade mỏng cho hệ Hero (Sumo/Labubu): mở khoá + nâng cấp riêng, dùng chung kho
// xu/level của meta-upgrades. Tách khỏi shop NÂNG CẤP cũ (mỗi hero render ở scene riêng).

import { HeroDef, MetaUpgradeDef, Side, heroForSide } from '../config/game-config';
import { buyUpgrade, getLevel } from './meta-upgrades';

/** Hero đã mở khoá chưa (mua 1 lần vĩnh viễn). */
export function isHeroUnlocked(hero: HeroDef): boolean {
  return getLevel(hero.unlock.id) >= 1;
}

/** Mua mở khoá hero (trừ xu). Trả false nếu thiếu xu hoặc đã mở. */
export function unlockHero(hero: HeroDef): boolean {
  return buyUpgrade(hero.unlock);
}

/** Cấp hiện tại của 1 nâng cấp hero. */
export function heroUpgradeLevel(def: MetaUpgradeDef): number {
  return getLevel(def.id);
}

/** Mua 1 cấp nâng cấp hero (trừ xu). */
export function buyHeroUpgrade(def: MetaUpgradeDef): boolean {
  return buyUpgrade(def);
}

/** Hero của phe đang chơi NẾU đã mở khoá — dùng để gate nút đẻ trong trận. */
export function usableHero(side: Side): HeroDef | null {
  const hero = heroForSide(side);
  return hero && isHeroUnlocked(hero) ? hero : null;
}
