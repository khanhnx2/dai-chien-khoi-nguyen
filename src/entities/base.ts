import type Phaser from 'phaser';
import { BASE, LANE_Y, Side, SIDE_INFO, baseXOf } from '../config/game-config';

const BUILDING_COLOR = 0x2b2b3a;

/** Thành = mặt tiền cửa hàng: nhà + mái hiên + biển hiệu + cửa; kèm thanh máu. */
export class Base {
  readonly side: Side;
  readonly x: number;
  hp: number;
  maxHp: number;

  private readonly hpBar: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, side: Side, hpMult = 1) {
    this.side = side;
    this.x = baseXOf(side);
    this.maxHp = BASE.maxHp * hpMult;
    this.hp = this.maxHp;

    const info = SIDE_INFO[side];
    const topY = LANE_Y - BASE.height;

    // Thân nhà.
    scene.add.rectangle(this.x, LANE_Y - BASE.height / 2, BASE.width, BASE.height, BUILDING_COLOR);
    // Mái hiên (màu phe) + vài sọc trắng.
    scene.add.rectangle(this.x, topY + 10, BASE.width + 10, 18, info.color);
    for (let i = -1; i <= 1; i++) {
      scene.add.rectangle(this.x + i * 24, topY + 10, 8, 18, 0xffffff).setAlpha(0.6);
    }
    // Biển hiệu tên quán.
    scene.add
      .text(this.x, topY + 40, info.sign, {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#111827',
        padding: { x: 6, y: 3 },
        align: 'center',
      })
      .setOrigin(0.5);
    // Cửa + cửa sổ.
    scene.add.rectangle(this.x, LANE_Y - 22, 28, 44, 0x111827);
    scene.add.rectangle(this.x, LANE_Y - 22, 28, 44).setStrokeStyle(2, info.color);

    // Thanh máu (trên nóc, chừa chỗ cho nhân vật nóc thành).
    const barY = topY - 62;
    scene.add.rectangle(this.x, barY, BASE.width, 8, 0x000000).setOrigin(0.5);
    this.hpBar = scene.add
      .rectangle(this.x - BASE.width / 2, barY, BASE.width, 8, 0x22c55e)
      .setOrigin(0, 0.5);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.refreshBar();
  }

  /** Nâng cấp máu thành: tăng máu tối đa + hồi ngần đó. */
  raiseMaxHpAndHeal(amount: number): void {
    this.maxHp += amount;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.refreshBar();
  }

  private refreshBar(): void {
    this.hpBar.width = BASE.width * (this.hp / this.maxHp);
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  /** Cạnh của thành đối diện lính đang tới (điểm lính đánh vào). */
  get frontX(): number {
    return this.side === Side.Khoi ? this.x + BASE.width / 2 : this.x - BASE.width / 2;
  }
}
