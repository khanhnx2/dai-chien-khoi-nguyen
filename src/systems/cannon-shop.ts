// Façade mỏng cho Đại bác: thực thể DUY NHẤT (không phải cặp theo phe như hero/titan),
// dùng chung kho xu/level của meta-upgrades. Chỉ hoạt động khi ĐỦ 2 điều kiện:
// đã mở khoá bằng xu VÀ màn hiện tại ≥ CANNON_MIN_STAGE.

import { CANNON_MIN_STAGE, CANNON_UNLOCK } from '../config/game-config';
import { buyUpgrade, getLevel } from './meta-upgrades';

/** Đại bác đã mở khoá chưa (mua 1 lần vĩnh viễn). */
export function isCannonUnlocked(): boolean {
  return getLevel(CANNON_UNLOCK.id) >= 1;
}

/** Mua mở khoá đại bác (trừ xu). Trả false nếu thiếu xu hoặc đã mở. */
export function unlockCannon(): boolean {
  return buyUpgrade(CANNON_UNLOCK);
}

/** Đại bác dùng được trong trận? Cần đã mở khoá VÀ đạt màn tối thiểu. */
export function usableCannon(stage: number): boolean {
  return isCannonUnlocked() && stage >= CANNON_MIN_STAGE;
}
