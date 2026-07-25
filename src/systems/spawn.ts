import type Phaser from 'phaser';
import {
  BASE,
  KHOI_BASE_X,
  NGUYEN_BASE_X,
  POPULATION_CAP,
  Side,
  UNITS,
  UnitType,
} from '../config/game-config';
import { Unit } from '../entities/unit';
import type { Economy } from './economy';

/** Điểm lính xuất hiện: ngay trước cửa thành của phe mình. */
function spawnX(side: Side): number {
  return side === Side.Khoi ? KHOI_BASE_X + BASE.width / 2 + 20 : NGUYEN_BASE_X - BASE.width / 2 - 20;
}

/** Lý do không đẻ được (để HUD/AI biết) — hoặc null nếu thành công. */
export type SpawnResult = { unit: Unit } | { reason: 'cooldown' | 'gold' | 'cap' };

/** Quản lý đẻ lính: trừ vàng, hồi chiêu mỗi loại, giới hạn quân. */
export class SpawnManager {
  private readonly scene: Phaser.Scene;
  private readonly statMods: Record<Side, number>;
  /** key `${side}:${type}` → thời điểm ms có thể đẻ tiếp. */
  private readyAt = new Map<string, number>();

  constructor(scene: Phaser.Scene, statMods?: Record<Side, number>) {
    this.scene = scene;
    this.statMods = statMods ?? { [Side.Khoi]: 1, [Side.Nguyen]: 1 };
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
    if (!economy.spend(side, UNITS[type].cost)) return { reason: 'gold' };

    const unit = new Unit(this.scene, side, type, spawnX(side), this.statMods[side]);
    units.push(unit);
    this.readyAt.set(key, now + UNITS[type].spawnCooldownMs);
    return { unit };
  }

  /** ms còn lại tới lượt đẻ tiếp của (side,type); 0 nếu sẵn sàng. */
  cooldownLeft(side: Side, type: UnitType, now: number): number {
    return Math.max(0, (this.readyAt.get(`${side}:${type}`) ?? 0) - now);
  }
}
