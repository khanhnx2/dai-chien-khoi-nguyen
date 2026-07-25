import Phaser from 'phaser';
import { GAME_WIDTH, Side, UPGRADES, UPGRADE_ORDER, UpgradeType } from '../config/game-config';
import type { Economy } from '../systems/economy';
import type { Upgrades } from '../systems/upgrades';

/** Panel nâng cấp người chơi (góc phải trên): 3 nút, hiện cấp + chi phí, mờ khi thiếu vàng/tối đa. */
export class UpgradePanel {
  private readonly playerSide: Side;
  private readonly buttons = new Map<UpgradeType, Phaser.GameObjects.Text>();

  constructor(scene: Phaser.Scene, playerSide: Side, onUpgrade: (type: UpgradeType) => void) {
    this.playerSide = playerSide;
    UPGRADE_ORDER.forEach((type, i) => {
      const btn = scene.add
        .text(GAME_WIDTH - 12, 16 + i * 42, '', {
          fontSize: '13px',
          color: '#ffffff',
          backgroundColor: '#1e293b',
          padding: { x: 8, y: 5 },
        })
        .setOrigin(1, 0) // canh phải để không tràn mép màn hình
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => onUpgrade(type));
      this.buttons.set(type, btn);
    });
  }

  update(economy: Economy, upgrades: Upgrades): void {
    for (const [type, btn] of this.buttons) {
      const level = upgrades.getLevel(this.playerSide, type);
      const maxed = upgrades.isMaxed(this.playerSide, type);
      if (maxed) {
        btn.setText(`${UPGRADES[type].label} MAX`).setAlpha(0.5);
        continue;
      }
      const cost = upgrades.nextCost(this.playerSide, type);
      btn.setText(`${UPGRADES[type].label} L${level}→${level + 1} · ${cost}💰`);
      btn.setAlpha(economy.canAfford(this.playerSide, cost) ? 1 : 0.5);
    }
  }
}
