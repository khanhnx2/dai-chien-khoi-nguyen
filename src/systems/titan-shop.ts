// Façade mỏng cho hệ Titan (Capibara/Totoro): CHỈ mở khoá (không nâng cấp), dùng chung
// kho xu/level của meta-upgrades. Tách khỏi hero-shop (registry & scene riêng).

import { Side, TitanDef, titanForSide } from '../config/game-config';
import { buyUpgrade, getLevel } from './meta-upgrades';

/** Titan đã mở khoá chưa (mua 1 lần vĩnh viễn). */
export function isTitanUnlocked(titan: TitanDef): boolean {
  return getLevel(titan.unlock.id) >= 1;
}

/** Mua mở khoá titan (trừ xu). Trả false nếu thiếu xu hoặc đã mở. */
export function unlockTitan(titan: TitanDef): boolean {
  return buyUpgrade(titan.unlock);
}

/** Titan của phe đang chơi NẾU đã mở khoá — dùng để gate nút đẻ trong trận. */
export function usableTitan(side: Side): TitanDef | null {
  const titan = titanForSide(side);
  return titan && isTitanUnlocked(titan) ? titan : null;
}
