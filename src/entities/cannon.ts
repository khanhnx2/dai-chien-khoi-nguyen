import type Phaser from 'phaser';
import {
  BASE,
  CANNON_COOLDOWN_MS,
  CANNON_DAMAGE,
  CANNON_PROJECTILE_COLOR,
  CANNON_PROJECTILE_SPEED,
  CANNON_RANGE,
  LANE_Y,
  SIDE_INFO,
  Side,
  baseXOf,
  directionOf,
} from '../config/game-config';
import { Projectile } from './projectile';
import { nearestEnemyInRange } from './targeting';
import { sound } from '../audio/sound-manager';
import type { Unit } from './unit';

const CANNON_OFFSET = 34; // px sau mép thành (phía đối diện lane)

/** Đại bác sau thành người chơi (từ màn ≥40): tự nhắm lính địch gần nhất trong tầm, bắn 1 viên/5s, 1000 dmg đơn mục tiêu. */
export class Cannon {
  private readonly side: Side;
  private readonly scene: Phaser.Scene | null;
  private readonly frontX: number; // điểm đạn xuất phát: mép TRƯỚC thành (như RoofAttacker), tránh đạn xuyên qua khối thành
  private readonly dmgMult: number;
  private readonly cdMult: number;
  private lastFireAt = 0;

  private barrel?: Phaser.GameObjects.Text;
  private barrelBaseY = 0;

  constructor(scene: Phaser.Scene | null, side: Side, dmgMult = 1, cdMult = 1) {
    this.scene = scene;
    this.side = side;
    this.dmgMult = dmgMult;
    this.cdMult = cdMult;
    this.frontX = baseXOf(side) + directionOf(side) * (BASE.width / 2);

    if (scene) this.buildVisual(scene, side);
  }

  private buildVisual(scene: Phaser.Scene, side: Side): void {
    // Vị trí SAU thành = phía đối diện lane (ngược hướng tiến của phe).
    const x = baseXOf(side) - directionOf(side) * (BASE.width / 2 + CANNON_OFFSET);
    scene.add.rectangle(x, LANE_Y - 10, 30, 20, SIDE_INFO[side].color).setOrigin(0.5);
    this.barrelBaseY = LANE_Y - 26;
    this.barrel = scene.add.text(x, this.barrelBaseY, '💣', { fontSize: '20px' }).setOrigin(0.5);
  }

  update(now: number, units: Unit[], projectiles: Projectile[]): void {
    const target = nearestEnemyInRange(units, this.side, this.frontX, CANNON_RANGE);
    if (!target) return;
    if (now - this.lastFireAt < CANNON_COOLDOWN_MS * this.cdMult) return;

    this.lastFireAt = now;
    sound.play('magic');
    const damage = CANNON_DAMAGE * this.dmgMult;
    projectiles.push(
      // startY thấp hơn mặc định (ROOF_Y) — khớp độ cao cannon đặt ở mặt đất sau thành.
      new Projectile(this.scene, this.side, 'straight', this.frontX, target.x, damage, 0, CANNON_PROJECTILE_SPEED, CANNON_PROJECTILE_COLOR, LANE_Y - 16),
    );
    this.animateFire();
  }

  /** Nhún nòng khi bắn. */
  private animateFire(): void {
    if (!this.scene || !this.barrel) return;
    this.scene.tweens.add({ targets: this.barrel, y: this.barrelBaseY - 6, yoyo: true, duration: 140 });
  }
}
