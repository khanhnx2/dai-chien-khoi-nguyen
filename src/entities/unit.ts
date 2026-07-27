import type Phaser from 'phaser';
import {
  BAMBOO_FACE_KEY,
  FATHER_FACE_KEY,
  LANE_Y,
  SIDE_INFO,
  Side,
  UNITS,
  UNIT_EMOJI,
  UnitType,
  baseXOf,
  directionOf,
  heroDefByType,
  titanDefByType,
  type UnitStats,
} from '../config/game-config';

/** Lính 1 phe: nền tròn màu phe + emoji loại lính (kéo–búa–bao), có máu riêng. */
export class Unit {
  readonly side: Side;
  readonly type: UnitType;
  readonly stats: UnitStats;
  /** Máu tối đa & sát thương HIỆU DỤNG (base × hệ số phe theo mức khó). */
  readonly maxHp: number;
  readonly attackDamage: number;
  x: number;
  hp: number;
  /** Thời điểm (ms) đánh gần nhất — dùng cho nhịp đánh. */
  lastAttackAt = 0;
  /** Hero (Sumo): đang rút lui về hậu phương hồi máu? */
  retreating = false;
  /** Hero: thời điểm (ms) kêu gần nhất — tiết chế tiếng kêu. */
  lastCryAt = 0;
  /** Titan: vòng hào quang còn hiệu lực (chặn đạn xuyên Father)? */
  auraActive = false;

  private readonly scene: Phaser.Scene;
  private readonly disc: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Text | Phaser.GameObjects.Image;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  /** Titan: vòng hào quang (chỉ tạo cho titan). */
  private readonly aura?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, side: Side, type: UnitType, startX: number, hpMult = 1, dmgMult = 1, drop = false) {
    this.scene = scene;
    this.side = side;
    this.type = type;
    this.stats = UNITS[type];
    this.maxHp = this.stats.hp * hpMult;
    this.attackDamage = this.stats.damage * dmgMult;
    this.x = startX;
    this.hp = this.maxHp;

    const y = LANE_Y - this.stats.size / 2;
    this.disc = scene.add.circle(startX, y, this.stats.size / 2 + 2, SIDE_INFO[side].color).setAlpha(0.9);
    // Titan: vòng hào quang vàng quanh unit (bật/tắt theo máu). Ban đầu đầy máu → bật.
    if (titanDefByType(type)) {
      this.aura = scene.add.circle(startX, y, this.stats.size / 2 + 8).setStrokeStyle(3, 0xfde047).setAlpha(0.9);
      this.auraActive = true;
    }
    // Father & các hero (Sumo/Labubu) & titan dùng ảnh thật; các lính khác dùng emoji.
    const faceKey =
      type === UnitType.Father ? FATHER_FACE_KEY : (heroDefByType(type)?.faceKey ?? titanDefByType(type)?.faceKey ?? null);
    this.icon = faceKey
      ? scene.add.image(startX, y, faceKey).setDisplaySize(this.stats.size, this.stats.size)
      : scene.add.text(startX, y, UNIT_EMOJI[type], { fontSize: `${this.stats.size - 6}px` }).setOrigin(0.5);
    this.hpBar = scene.add
      .rectangle(startX - this.stats.size / 2, y - this.stats.size / 2 - 6, this.stats.size, 4, 0x22c55e)
      .setOrigin(0, 0.5);

    // Titan: rơi từ trời — dời mọi phần lên cao rồi tween về vị trí gốc (nảy nhẹ).
    if (drop) {
      const DROP_HEIGHT = 260;
      const parts: Phaser.GameObjects.Components.Transform[] = [this.disc, this.icon, this.hpBar];
      if (this.aura) parts.push(this.aura);
      for (const part of parts) {
        const targetY = part.y;
        part.y = targetY - DROP_HEIGHT;
        scene.tweens.add({ targets: part, y: targetY, duration: 420, ease: 'Bounce.easeOut' });
      }
    }
  }

  moveBy(dx: number): void {
    this.x += dx;
    this.disc.x = this.x;
    this.icon.x = this.x;
    this.hpBar.x = this.x - this.stats.size / 2;
    if (this.aura) this.aura.x = this.x;
  }

  /** Titan: bật/tắt vòng hào quang (khi qua ngưỡng máu). No-op nếu không phải titan. */
  setAura(active: boolean): void {
    if (!this.aura || active === this.auraActive) return;
    this.auraActive = active;
    this.aura.setVisible(active);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.hpBar.width = this.stats.size * (this.hp / this.maxHp);
  }

  /** Hồi máu (Sumo ở hậu phương), kẹp trần maxHp. */
  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.hpBar.width = this.stats.size * (this.hp / this.maxHp);
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  /** Đã lùi về (tại/sau) Thành của phe mình — vùng an toàn hồi máu. */
  isBehindOwnBase(): boolean {
    return directionOf(this.side) * (this.x - baseXOf(this.side)) <= 0;
  }

  /** Có thể bị địch nhắm/bắn? Sumo đang hồi ở hậu phương thì bất khả xâm. */
  isTargetable(): boolean {
    return !this.retreating || !this.isBehindOwnBase();
  }

  /**
   * Hiệu ứng đòn đánh (gọi mỗi lần ra đòn): cung thủ bắn mũi tên bay tới mục tiêu;
   * bộ binh / giáp binh vung kiếm chém ở phía trước. Thuần hình ảnh, tự huỷ.
   */
  attackFx(targetX: number): void {
    const y = LANE_Y - this.stats.size / 2;
    // Titan: vung cây tre (xoay quanh gốc như cầm gậy đập xuống), tự huỷ.
    if (titanDefByType(this.type)) {
      const dir = directionOf(this.side);
      const bamboo = this.scene.add
        .image(this.x + dir * (this.stats.size / 2), LANE_Y, BAMBOO_FACE_KEY)
        .setDisplaySize(22, 84)
        .setOrigin(0.5, 1);
      this.scene.tweens.add({
        targets: bamboo,
        angle: { from: -dir * 80, to: dir * 45 },
        duration: 220,
        ease: 'Cubic.easeIn',
        onComplete: () => bamboo.destroy(),
      });
      return;
    }
    if (this.type === UnitType.CungThu) {
      const arrow = this.scene.add.rectangle(this.x, y, 16, 3, 0xfacc15);
      this.scene.tweens.add({ targets: arrow, x: targetX, duration: 160, onComplete: () => arrow.destroy() });
    } else {
      const dir = directionOf(this.side);
      const slash = this.scene.add
        .text(this.x + dir * (this.stats.size / 2 + 4), y, '⚔️', { fontSize: '20px' })
        .setOrigin(0.5);
      this.scene.tweens.add({
        targets: slash,
        scale: { from: 0.6, to: 1.3 },
        alpha: { from: 1, to: 0 },
        duration: 200,
        onComplete: () => slash.destroy(),
      });
    }
  }

  destroy(): void {
    this.disc.destroy();
    this.icon.destroy();
    this.hpBar.destroy();
    this.aura?.destroy();
  }
}
