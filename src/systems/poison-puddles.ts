import type Phaser from 'phaser';
import { LANE_Y, Side, ZOMBIE_PUDDLE_DURATION_MS, ZOMBIE_PUDDLE_RADIUS } from '../config/game-config';
import type { Unit } from '../entities/unit';

interface Puddle {
  x: number;
  dps: number;
  expireAt: number;
  visual: Phaser.GameObjects.Arc;
}

/**
 * Vũng độc do Zombie nổ xác khi chết. Mỗi vũng tồn tại `ZOMBIE_PUDDLE_DURATION_MS`.
 * Quân Player chạm 1 lần → nhiễm độc đủ thời lượng đó (không refresh/cộng dồn nếu đang nhiễm).
 */
export class PoisonPuddleManager {
  private puddles: Puddle[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly playerSide: Side,
  ) {}

  /** Nổ xác zombie: rải `count` vũng độc tại X ngẫu nhiên toàn bản đồ, mỗi vũng tổng sát thương = `damage`. */
  spawnBurst(count: number, damage: number, mapWidth: number, now: number): void {
    const dps = damage / (ZOMBIE_PUDDLE_DURATION_MS / 1000);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * mapWidth;
      const visual = this.scene.add.circle(x, LANE_Y, ZOMBIE_PUDDLE_RADIUS, 0x65a30d).setAlpha(0.45);
      this.puddles.push({ x, dps, expireAt: now + ZOMBIE_PUDDLE_DURATION_MS, visual });
    }
  }

  /** Huỷ toàn bộ vũng còn lại (gọi khi kết thúc trận, tránh rò graphics qua trận sau). */
  destroyAll(): void {
    for (const puddle of this.puddles) puddle.visual.destroy();
    this.puddles = [];
  }

  /** Mỗi frame: dọn vũng hết hạn + nhiễm độc quân Player chạm lần đầu. */
  update(units: Unit[], now: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const puddle = this.puddles[i];
      if (now >= puddle.expireAt) {
        puddle.visual.destroy();
        this.puddles.splice(i, 1);
        continue;
      }
      for (const unit of units) {
        if (unit.side !== this.playerSide || unit.isDead()) continue;
        if (unit.poisonUntil > now) continue; // đang nhiễm độc rồi — không refresh/cộng dồn
        if (Math.abs(unit.x - puddle.x) <= ZOMBIE_PUDDLE_RADIUS) {
          unit.poisonUntil = now + ZOMBIE_PUDDLE_DURATION_MS;
          unit.poisonDps = puddle.dps;
        }
      }
    }
  }
}
