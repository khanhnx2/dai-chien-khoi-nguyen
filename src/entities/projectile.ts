import type Phaser from 'phaser';
import { LANE_Y, ProjectileKind, Side, directionOf } from '../config/game-config';
import type { Unit } from './unit';

const ROOF_Y = LANE_Y - 120;

/**
 * Đạn: trứng (arc, nổ AoE), nước (straight, đơn mục tiêu), hoặc ma thuật Father
 * (straight + `pierce` = xuyên, trúng mọi lính trên đường, không bị cản).
 */
export class Projectile {
  readonly side: Side;
  readonly kind: ProjectileKind;
  readonly damage: number;
  readonly aoeRadius: number;
  readonly targetX: number;
  readonly pierce: boolean;
  /** Quãng đường bay tối đa (px); vượt quá thì đạn tự biến mất. */
  readonly maxTravel: number;
  /** Lính đã trúng (đạn xuyên chỉ gây sát thương mỗi lính 1 lần). */
  readonly hitUnits = new Set<Unit>();
  hitBase = false;
  x: number;
  private readonly startX: number;
  private readonly baseY: number;
  private readonly vx: number;
  alive = true;

  private readonly sprite?: { x: number; y: number; destroy: () => void };

  constructor(
    scene: Phaser.Scene | null,
    side: Side,
    kind: ProjectileKind,
    startX: number,
    targetX: number,
    damage: number,
    aoeRadius: number,
    speed: number,
    color: number,
    startY: number = ROOF_Y,
    pierce = false,
    maxTravel = Infinity,
  ) {
    this.side = side;
    this.kind = kind;
    this.damage = damage;
    this.aoeRadius = aoeRadius;
    this.startX = startX;
    this.targetX = targetX;
    this.baseY = startY;
    this.pierce = pierce;
    this.maxTravel = maxTravel;
    this.x = startX;
    this.vx = directionOf(side) * speed;
    // scene có thể null trong test (không cần sprite).
    this.sprite = scene ? (scene.add.circle(startX, startY, pierce ? 8 : 6, color) as never) : undefined;
  }

  /** Di chuyển theo dt; cập nhật y hình học (cung với arc) chỉ để hiển thị. */
  advance(dtSeconds: number): void {
    this.x += this.vx * dtSeconds;
    if (!this.sprite) return;
    this.sprite.x = this.x;
    if (this.kind === 'arc') {
      const span = this.targetX - this.startX || 1;
      const p = Math.min(1, Math.max(0, (this.x - this.startX) / span));
      this.sprite.y = this.baseY - 90 * Math.sin(Math.PI * p);
    } else {
      this.sprite.y = this.baseY;
    }
  }

  /** arc: đã tới điểm rơi mục tiêu chưa. */
  reachedTarget(): boolean {
    return directionOf(this.side) * (this.x - this.targetX) >= 0;
  }

  /** Đã bay quá quãng đường tối đa (đạn hết tầm → biến mất). */
  expired(): boolean {
    return Math.abs(this.x - this.startX) >= this.maxTravel;
  }

  kill(): void {
    this.alive = false;
    this.sprite?.destroy();
  }
}
