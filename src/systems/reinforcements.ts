import {
  REINFORCE_HP_FRAC,
  REINFORCE_TITAN_MIN_STAGE,
  Side,
  UnitType,
  directionOf,
  heroForSide,
  reinforcementCount,
  titanForSide,
} from '../config/game-config';
import type { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import type { SpawnManager } from './spawn';

/** Khoảng lệch X giữa 2 lính tiếp viện (tránh chồng khít khi đẻ dồn 1 đợt). */
const STAGGER_X = 14;
/** Số vị trí X trước khi lặp lại — giữ cả đợt thành cụm gọn SAU thành, không tràn ra sân. */
const STAGGER_BAND = 8;

/**
 * Quân tiếp viện cho Máy: 1 đợt/trận, kích khi máu thành Máy LẦN ĐẦU ≤ REINFORCE_HP_FRAC
 * (chỉ từ màn ≥ REINFORCE_MIN_STAGE). Đẻ `count` mỗi loại: bộ binh, cung thủ, giáp binh,
 * và hero của phe Máy (nếu có); từ màn ≥ REINFORCE_TITAN_MIN_STAGE kèm `count` Titan — bỏ qua vàng/cap/hồi chiêu.
 */
export class ReinforcementManager {
  private sent = false;

  /** Trả true đúng frame kích (để scene bắn toast/SFX). */
  update(
    stage: number,
    aiSide: Side,
    bases: Record<Side, Base>,
    spawn: SpawnManager,
    units: Unit[],
  ): boolean {
    if (this.sent) return false;
    const count = reinforcementCount(stage);
    if (count === 0) return false;
    const base = bases[aiSide];
    if (base.hp / base.maxHp > REINFORCE_HP_FRAC) return false;

    this.sent = true;
    const hero = heroForSide(aiSide)?.unitType;
    const types: UnitType[] = [
      UnitType.BoBinh,
      UnitType.CungThu,
      UnitType.GiapBinh,
      ...(hero ? [hero] : []),
    ];
    const dir = directionOf(aiSide);
    let i = 0;
    for (const type of types) {
      // Lệch NGƯỢC chiều tiến (−dir) → đẻ lùi về phía thành Máy; modulo giữ cụm gọn.
      for (let n = 0; n < count; n++) {
        spawn.forceSpawn(aiSide, type, units, -((i++ % STAGGER_BAND) * STAGGER_X) * dir);
      }
    }
    // Từ màn ≥40: kèm `count` Titan phe Máy (đặt sát thành Máy). Có hào quang → Father phải phá mới xuyên.
    if (stage >= REINFORCE_TITAN_MIN_STAGE) {
      const titan = titanForSide(aiSide)?.unitType;
      if (titan) {
        for (let n = 0; n < count; n++) {
          spawn.forceSpawn(aiSide, titan, units, -((i++ % STAGGER_BAND) * STAGGER_X) * dir);
        }
      }
    }
    return true;
  }
}
