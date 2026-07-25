import type Phaser from 'phaser';
import {
  BASE,
  GAME_WIDTH,
  ROOF_ATTACK,
  SPECIAL,
  Side,
  baseXOf,
  directionOf,
  enemyOf,
} from '../config/game-config';
import { Projectile } from '../entities/projectile';
import type { Unit } from '../entities/unit';

const NGUYEN_BLAST_REACH = 340;

/** Kỹ năng bấm tay 2 phe: Khôi mưa trứng (nhiều đạn AoE), Nguyên xịt nước (dải + đẩy lùi). */
export class SpecialAbility {
  private readyAt: Record<Side, number> = { [Side.Khoi]: 0, [Side.Nguyen]: 0 };
  private readonly statMods: Record<Side, number>;

  constructor(statMods?: Record<Side, number>) {
    this.statMods = statMods ?? { [Side.Khoi]: 1, [Side.Nguyen]: 1 };
  }

  isReady(side: Side, now: number): boolean {
    return now >= this.readyAt[side];
  }

  cooldownLeft(side: Side, now: number): number {
    return Math.max(0, this.readyAt[side] - now);
  }

  /** Kích hoạt kỹ năng; trả false nếu còn hồi chiêu. */
  trigger(
    side: Side,
    now: number,
    scene: Phaser.Scene | null,
    units: Unit[],
    projectiles: Projectile[],
  ): boolean {
    if (!this.isReady(side, now)) return false;
    this.readyAt[side] = now + SPECIAL[side].cooldownMs;

    if (side === Side.Khoi) this.eggRain(scene, projectiles);
    else this.waterBlast(units);
    return true;
  }

  /** Khôi: rải nhiều quả trứng arc xuống nửa sân địch (tái dùng đạn AoE). */
  private eggRain(scene: Phaser.Scene | null, projectiles: Projectile[]): void {
    const cfg = SPECIAL[Side.Khoi];
    const damage = cfg.damage * this.statMods[Side.Khoi];
    const front = baseXOf(Side.Khoi) + BASE.width / 2;
    const enemyFront = baseXOf(Side.Nguyen) - BASE.width / 2;
    for (let i = 0; i < cfg.eggCount; i++) {
      const t = cfg.eggCount === 1 ? 1 : i / (cfg.eggCount - 1);
      const targetX = GAME_WIDTH * 0.5 + t * (enemyFront - GAME_WIDTH * 0.5);
      projectiles.push(
        new Projectile(scene, Side.Khoi, 'arc', front, targetX, damage, cfg.aoeRadius, ROOF_ATTACK[Side.Khoi].projectileSpeed, ROOF_ATTACK[Side.Khoi].color),
      );
    }
  }

  /** Nguyên: xịt nước tức thời trúng dải lính địch trong tầm + đẩy lùi về phía thành chúng. */
  private waterBlast(units: Unit[]): void {
    const cfg = SPECIAL[Side.Nguyen];
    const damage = cfg.damage * this.statMods[Side.Nguyen];
    const front = baseXOf(Side.Nguyen) - BASE.width / 2;
    const target = enemyOf(Side.Nguyen);
    const pushBack = -directionOf(target) * cfg.knockback; // đẩy về thành của địch
    for (const u of units) {
      if (u.side !== target || u.isDead()) continue;
      if (Math.abs(u.x - front) <= NGUYEN_BLAST_REACH) {
        u.takeDamage(damage);
        if (!u.isDead()) u.moveBy(pushBack);
      }
    }
  }
}
