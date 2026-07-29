import type Phaser from 'phaser';
import {
  BASE,
  KHOI_BASE_X,
  NGUYEN_BASE_X,
  POPULATION_CAP,
  SideMods,
  Side,
  TITAN_SPAWN_COOLDOWN_MS,
  UNITS,
  UnitType,
  titanSpawnX,
  uniformSideMods,
} from '../config/game-config';
import { Unit } from '../entities/unit';
import type { Economy } from './economy';

/** Chi phí thực tế (đã áp giảm giá) để đẻ 1 lính. */
export function unitCost(mods: Record<Side, SideMods>, side: Side, type: UnitType): number {
  return Math.max(1, Math.round(UNITS[type].cost * mods[side].unitCost[type]));
}

/** Điểm lính xuất hiện: ngay trước cửa thành của phe mình. */
function spawnX(side: Side): number {
  return side === Side.Khoi ? KHOI_BASE_X + BASE.width / 2 + 20 : NGUYEN_BASE_X - BASE.width / 2 - 20;
}

/** Lý do không đẻ được (để HUD/AI biết) — hoặc null nếu thành công. */
export type SpawnResult = { unit: Unit } | { reason: 'cooldown' | 'gold' | 'cap' };

/** Quản lý đẻ lính: trừ vàng, hồi chiêu mỗi loại, giới hạn quân. */
export class SpawnManager {
  private readonly scene: Phaser.Scene;
  private readonly mods: Record<Side, SideMods>;
  /** key `${side}:${type}` → thời điểm ms có thể đẻ tiếp. */
  private readyAt = new Map<string, number>();

  constructor(scene: Phaser.Scene, mods?: Record<Side, SideMods>) {
    this.scene = scene;
    this.mods = mods ?? { [Side.Khoi]: uniformSideMods(1), [Side.Nguyen]: uniformSideMods(1) };
  }

  private countSide(units: Unit[], side: Side): number {
    let n = 0;
    for (const u of units) if (u.side === side) n++;
    return n;
  }

  trySpawn(
    side: Side,
    type: UnitType,
    economy: Economy,
    units: Unit[],
    now: number,
  ): SpawnResult {
    const key = `${side}:${type}`;
    if (now < (this.readyAt.get(key) ?? 0)) return { reason: 'cooldown' };
    if (this.countSide(units, side) >= POPULATION_CAP) return { reason: 'cap' };
    if (!economy.spend(side, unitCost(this.mods, side, type))) return { reason: 'gold' };

    const m = this.mods[side];
    const unit = new Unit(this.scene, side, type, spawnX(side), m.unitHp[type], m.unitDmg[type]);
    units.push(unit);
    this.readyAt.set(key, now + UNITS[type].spawnCooldownMs * m.unitSpawnCd[type]);
    return { unit };
  }

  /** Đẻ titan: trừ vàng + hồi chiêu (ĐÃ áp nâng cấp giảm giá/giảm hồi chiêu) + cap; rơi tại 1/3 sân. */
  trySpawnTitan(side: Side, type: UnitType, economy: Economy, units: Unit[], now: number): SpawnResult {
    const key = `${side}:${type}`;
    if (now < (this.readyAt.get(key) ?? 0)) return { reason: 'cooldown' };
    if (this.countSide(units, side) >= POPULATION_CAP) return { reason: 'cap' };
    // Giá theo mods (khớp giá HUD hiển thị) — base = UNITS[titan].cost (TITAN_SPAWN_COST).
    if (!economy.spend(side, unitCost(this.mods, side, type))) return { reason: 'gold' };

    const m = this.mods[side];
    const unit = new Unit(this.scene, side, type, titanSpawnX(side), m.unitHp[type], m.unitDmg[type], true);
    units.push(unit);
    this.readyAt.set(key, now + TITAN_SPAWN_COOLDOWN_MS * m.unitSpawnCd[type]);
    return { unit };
  }

  /** Đẻ 1 lính bỏ qua vàng/cap/hồi chiêu (dùng cho quân tiếp viện). xOffset lệch nhẹ tránh chồng khít. */
  forceSpawn(side: Side, type: UnitType, units: Unit[], xOffset = 0): Unit {
    const m = this.mods[side];
    const unit = new Unit(this.scene, side, type, spawnX(side) + xOffset, m.unitHp[type], m.unitDmg[type]);
    units.push(unit);
    return unit;
  }

  /** ms còn lại tới lượt đẻ tiếp của (side,type); 0 nếu sẵn sàng. */
  cooldownLeft(side: Side, type: UnitType, now: number): number {
    return Math.max(0, (this.readyAt.get(`${side}:${type}`) ?? 0) - now);
  }
}
