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
  ZOMBIE_FACE_KEY,
  baseXOf,
  directionOf,
  heroDefByType,
  titanDefByType,
  type UnitStats,
} from '../config/game-config';
import { showDamagePopup } from '../ui/damage-popup';

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
  /** Thời điểm (ms) hết choáng — trong lúc choáng, unit bỏ lượt (không đi/đánh). */
  stunnedUntil = 0;

  private readonly scene: Phaser.Scene;
  private readonly disc: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Text | Phaser.GameObjects.Image;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  /** Số máu hiện tại hiển thị trên đầu. */
  private readonly hpText: Phaser.GameObjects.Text;
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
    // Father & các hero (Sumo/Labubu) & titan & zombie dùng ảnh thật; các lính khác dùng emoji.
    const faceKey =
      type === UnitType.Father
        ? FATHER_FACE_KEY
        : type === UnitType.Zombie
          ? ZOMBIE_FACE_KEY
          : (heroDefByType(type)?.faceKey ?? titanDefByType(type)?.faceKey ?? null);
    this.icon = faceKey
      ? scene.add.image(startX, y, faceKey).setDisplaySize(this.stats.size, this.stats.size)
      : scene.add.text(startX, y, UNIT_EMOJI[type], { fontSize: `${this.stats.size - 6}px` }).setOrigin(0.5);
    this.hpBar = scene.add
      .rectangle(startX - this.stats.size / 2, y - this.stats.size / 2 - 6, this.stats.size, 4, 0x22c55e)
      .setOrigin(0, 0.5);
    // Số máu trên đầu (trên thanh máu).
    this.hpText = scene.add
      .text(startX, y - this.stats.size / 2 - 15, `${Math.ceil(this.hp)}`, { fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 })
      .setOrigin(0.5);

    // Titan/Zombie: rơi từ trời — dời mọi phần lên cao rồi tween về vị trí gốc.
    if (drop) {
      const DROP_HEIGHT = 260;
      const parts: Phaser.GameObjects.Components.Transform[] = [this.disc, this.icon, this.hpBar, this.hpText];
      if (this.aura) parts.push(this.aura);

      if (type === UnitType.Zombie) {
        // Zombie: rơi CHẬM (không nảy). Thân KHÔNG tween trục X — combat gọi moveBy() mỗi
        // frame (ghi đè part.x = this.x) nên tween X trên thân sẽ bị xoá ngay, vô tác dụng.
        // Đung đưa theo gió thể hiện qua DÙ (không bị moveBy đụng tới) lắc ngang khi rơi.
        const FALL_DURATION = 1800;
        for (const part of parts) {
          const targetY = part.y;
          part.y = targetY - DROP_HEIGHT;
          scene.tweens.add({ targets: part, y: targetY, duration: FALL_DURATION, ease: 'Sine.easeIn' });
        }

        const SWAY_AMPLITUDE = 18;
        const SWAY_HALF_MS = 260;
        const swayLoops = Math.max(1, Math.round(FALL_DURATION / (SWAY_HALF_MS * 2)));
        const parachuteY = y - this.stats.size / 2 - 14;
        const parachute = scene.add.circle(startX, parachuteY - DROP_HEIGHT, 16, 0xf1f5f9).setAlpha(0.95);
        scene.tweens.add({
          targets: parachute,
          y: parachuteY,
          duration: FALL_DURATION,
          ease: 'Sine.easeIn',
          onComplete: () => parachute.destroy(),
        });
        scene.tweens.add({
          targets: parachute,
          x: startX + SWAY_AMPLITUDE,
          duration: SWAY_HALF_MS,
          yoyo: true,
          repeat: swayLoops - 1,
          ease: 'Sine.easeInOut',
        });
      } else {
        // Titan: rơi nhanh, nảy nhẹ khi chạm đất (giữ nguyên hành vi cũ).
        for (const part of parts) {
          const targetY = part.y;
          part.y = targetY - DROP_HEIGHT;
          scene.tweens.add({ targets: part, y: targetY, duration: 420, ease: 'Bounce.easeOut' });
        }
      }
    }
  }

  moveBy(dx: number): void {
    this.x += dx;
    this.disc.x = this.x;
    this.icon.x = this.x;
    this.hpBar.x = this.x - this.stats.size / 2;
    this.hpText.x = this.x;
    if (this.aura) this.aura.x = this.x;
  }

  /** Đồng bộ thanh máu + số máu trên đầu với hp hiện tại. */
  private refreshHp(): void {
    this.hpBar.width = this.stats.size * (this.hp / this.maxHp);
    this.hpText.setText(`${Math.ceil(this.hp)}`);
  }

  /** Titan: bật/tắt vòng hào quang (khi qua ngưỡng máu). No-op nếu không phải titan. */
  setAura(active: boolean): void {
    if (!this.aura || active === this.auraActive) return;
    this.auraActive = active;
    this.aura.setVisible(active);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.refreshHp();
    // Số sát thương bay lên tại vị trí trúng đòn.
    showDamagePopup(this.scene, this.x, LANE_Y - this.stats.size - 10, amount);
  }

  /** Hồi máu (Sumo ở hậu phương), kẹp trần maxHp. */
  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.refreshHp();
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

  /** Choáng: hiện 💫 trên đầu, bay lên mờ dần rồi tự huỷ. Thuần hình ảnh. */
  showStun(): void {
    const star = this.scene.add
      .text(this.x, LANE_Y - this.stats.size - 6, '💫', { fontSize: '16px' })
      .setOrigin(0.5);
    this.scene.tweens.add({
      targets: star,
      y: star.y - 12,
      alpha: { from: 1, to: 0 },
      duration: 900,
      onComplete: () => star.destroy(),
    });
  }

  destroy(): void {
    this.disc.destroy();
    this.icon.destroy();
    this.hpBar.destroy();
    this.hpText.destroy();
    this.aura?.destroy();
  }
}
