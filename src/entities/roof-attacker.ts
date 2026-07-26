import type Phaser from 'phaser';
import { BASE, FACE_KEY, LANE_Y, ROOF_ATTACK, SIDE_INFO, Side, baseXOf, directionOf } from '../config/game-config';
import { Projectile } from './projectile';
import { sound } from '../audio/sound-manager';
import type { Unit } from './unit';
import type { Upgrades } from '../systems/upgrades';

/** Nhân vật nóc thành: khuôn mặt thật + thân, tự nhắm lính địch trong tầm & bắn theo nhịp. */
export class RoofAttacker {
  readonly side: Side;
  private readonly scene: Phaser.Scene | null;
  private readonly frontX: number;
  private readonly dmgMult: number;
  private readonly cdMult: number;
  private lastFireAt = 0;

  private head?: Phaser.GameObjects.Image;
  private headBaseY = 0;

  constructor(scene: Phaser.Scene | null, side: Side, dmgMult = 1, cdMult = 1) {
    this.scene = scene;
    this.side = side;
    this.dmgMult = dmgMult;
    this.cdMult = cdMult;
    this.frontX = baseXOf(side) + directionOf(side) * (BASE.width / 2);

    if (scene) this.buildVisual(scene, side);
  }

  private buildVisual(scene: Phaser.Scene, side: Side): void {
    const x = baseXOf(side);
    const roofY = LANE_Y - BASE.height;
    // Thân (tạp dề màu phe) trên nóc.
    scene.add.rectangle(x, roofY - 8, 30, 26, SIDE_INFO[side].color).setOrigin(0.5);
    // Đầu = ảnh mặt thật đã tách nền.
    this.headBaseY = roofY - 30;
    this.head = scene.add.image(x, this.headBaseY, FACE_KEY[side]).setDisplaySize(50, 50);
  }

  update(now: number, units: Unit[], projectiles: Projectile[], upgrades: Upgrades): void {
    const cfg = ROOF_ATTACK[this.side];
    const target = this.nearestEnemyInRange(units, cfg.range);
    if (!target) return;
    if (now - this.lastFireAt < cfg.cooldownMs * this.cdMult) return;

    this.lastFireAt = now;
    sound.play(this.side === Side.Khoi ? 'egg' : 'water'); // ném trứng / bắn nước
    const damage = cfg.damage * upgrades.roofDamageMultiplier(this.side) * this.dmgMult;
    projectiles.push(
      new Projectile(this.scene, this.side, cfg.kind, this.frontX, target.x, damage, cfg.aoeRadius, cfg.projectileSpeed, cfg.color),
    );
    this.animateFire();
  }

  /** Nhún nhẹ khi bắn (ném trứng / xịt nước). */
  private animateFire(): void {
    if (!this.scene || !this.head) return;
    this.scene.tweens.add({ targets: this.head, y: this.headBaseY - 6, yoyo: true, duration: 110 });
  }

  private nearestEnemyInRange(units: Unit[], range: number): Unit | null {
    let best: Unit | null = null;
    let bestD = range;
    for (const u of units) {
      if (u.side === this.side || u.isDead() || !u.isTargetable()) continue;
      const d = Math.abs(u.x - this.frontX);
      if (d <= bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }
}
