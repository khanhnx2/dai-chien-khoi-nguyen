import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SPAWN_ORDER,
  SIDE_INFO,
  SPECIAL,
  Side,
  UNITS,
  UnitType,
  enemyOf,
} from '../config/game-config';
import type { Economy } from '../systems/economy';
import type { SpawnManager } from '../systems/spawn';
import type { SpecialAbility } from '../systems/special-ability';

interface HudCallbacks {
  onSpawn: (type: UnitType) => void;
  onSpecial: () => void;
}

/** HUD người chơi: vàng + 3 nút đẻ lính + nút kỹ năng đặc biệt (mờ khi chưa dùng được). */
export class BattleHud {
  private readonly playerSide: Side;
  private readonly aiSide: Side;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly aiGoldText: Phaser.GameObjects.Text;
  private readonly buttons = new Map<UnitType, Phaser.GameObjects.Text>();
  private readonly specialBtn: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, playerSide: Side, cb: HudCallbacks) {
    this.playerSide = playerSide;
    this.aiSide = enemyOf(playerSide);
    this.goldText = scene.add.text(16, 16, '', { fontSize: '20px', color: '#fde047' });
    // Vàng của Máy (đối thủ) — màu xám nhạt để phân biệt với vàng người chơi.
    this.aiGoldText = scene.add.text(16, 44, '', { fontSize: '16px', color: '#94a3b8' });

    PLAYER_SPAWN_ORDER.forEach((type, i) => {
      const stats = UNITS[type];
      const btn = scene.add
        .text(14 + i * 132, GAME_HEIGHT - 46, `${stats.label}\n${stats.cost}💰`, {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#334155',
          padding: { x: 8, y: 8 },
        })
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => cb.onSpawn(type));
      this.buttons.set(type, btn);
    });

    this.specialBtn = scene.add
      .text(GAME_WIDTH - 170, GAME_HEIGHT - 46, '', {
        fontSize: '15px',
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#7c3aed',
        padding: { x: 12, y: 8 },
      })
      .setInteractive({ useHandCursor: true });
    this.specialBtn.on('pointerdown', () => cb.onSpecial());
  }

  update(now: number, economy: Economy, spawn: SpawnManager, special: SpecialAbility): void {
    const gold = Math.floor(economy.getGold(this.playerSide));
    this.goldText.setText(`${SIDE_INFO[this.playerSide].label} — Vàng: ${gold}💰`);
    const aiGold = Math.floor(economy.getGold(this.aiSide));
    this.aiGoldText.setText(`Máy (${SIDE_INFO[this.aiSide].label}) — Vàng: ${aiGold}💰`);

    for (const [type, btn] of this.buttons) {
      const cdLeft = spawn.cooldownLeft(this.playerSide, type, now);
      const ready = cdLeft <= 0 && economy.canAfford(this.playerSide, UNITS[type].cost);
      btn.setAlpha(ready ? 1 : 0.45);
      const suffix = cdLeft > 0 ? `\n${(cdLeft / 1000).toFixed(1)}s` : '';
      btn.setText(`${UNITS[type].label}\n${UNITS[type].cost}💰${suffix}`);
    }

    const spCd = special.cooldownLeft(this.playerSide, now);
    this.specialBtn.setAlpha(spCd <= 0 ? 1 : 0.45);
    const spLabel = SPECIAL[this.playerSide].label;
    this.specialBtn.setText(spCd > 0 ? `${spLabel}\n${(spCd / 1000).toFixed(0)}s` : `${spLabel}\n⚡SẴN`);
  }
}
