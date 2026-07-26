import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SPAWN_ORDER,
  SIDE_INFO,
  SPECIAL,
  SideMods,
  Side,
  UNITS,
  UnitType,
  enemyOf,
} from '../config/game-config';
import type { Economy } from '../systems/economy';
import { SpawnManager, unitCost } from '../systems/spawn';
import type { SpecialAbility } from '../systems/special-ability';
import { usableHero } from '../systems/hero-shop';
import { sound } from '../audio/sound-manager';

interface HudCallbacks {
  onSpawn: (type: UnitType) => void;
  onSpecial: () => void;
}

/** HUD người chơi: vàng + nút đẻ lính (giá đã áp nâng cấp) + kỹ năng + tắt âm. */
export class BattleHud {
  private readonly playerSide: Side;
  private readonly aiSide: Side;
  private readonly mods: Record<Side, SideMods>;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly aiGoldText: Phaser.GameObjects.Text;
  private readonly buttons = new Map<UnitType, Phaser.GameObjects.Text>();
  private readonly specialBtn: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, playerSide: Side, mods: Record<Side, SideMods>, cb: HudCallbacks) {
    this.playerSide = playerSide;
    this.aiSide = enemyOf(playerSide);
    this.mods = mods;
    this.goldText = scene.add.text(16, 16, '', { fontSize: '20px', color: '#fde047' });
    // Vàng của Máy (đối thủ) — màu xám nhạt để phân biệt với vàng người chơi.
    this.aiGoldText = scene.add.text(16, 44, '', { fontSize: '16px', color: '#94a3b8' });

    PLAYER_SPAWN_ORDER.forEach((type, i) => {
      const stats = UNITS[type];
      const btn = scene.add
        .text(14 + i * 132, GAME_HEIGHT - 46, `${stats.label}\n${unitCost(mods, playerSide, type)}💰`, {
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

    // Nút đẻ hero của phe đang chơi — chỉ khi đã mở khoá ở shop hero tương ứng.
    const hero = usableHero(playerSide);
    if (hero) {
      const type = hero.unitType;
      const btn = scene.add
        .text(14 + PLAYER_SPAWN_ORDER.length * 132, GAME_HEIGHT - 46, `${UNITS[type].label}\n${unitCost(mods, playerSide, type)}💰`, {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#be185d',
          padding: { x: 8, y: 8 },
        })
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => cb.onSpawn(type));
      this.buttons.set(type, btn);
    }

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

    // Nút bật/tắt âm thanh (góc trên phải, dưới panel nâng cấp).
    const muteBtn = scene.add
      .text(GAME_WIDTH - 12, 132, '', { fontSize: '13px', color: '#ffffff', backgroundColor: '#1e293b', padding: { x: 8, y: 5 } })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    const refreshMute = () => muteBtn.setText(sound.isMuted() ? '🔇 Âm: Tắt' : '🔊 Âm: Bật');
    refreshMute();
    muteBtn.on('pointerdown', () => {
      sound.setMuted(!sound.isMuted());
      if (!sound.isMuted()) sound.startMusic();
      refreshMute();
    });
  }

  update(now: number, economy: Economy, spawn: SpawnManager, special: SpecialAbility): void {
    const gold = Math.floor(economy.getGold(this.playerSide));
    this.goldText.setText(`${SIDE_INFO[this.playerSide].label} — Vàng: ${gold}💰`);
    const aiGold = Math.floor(economy.getGold(this.aiSide));
    this.aiGoldText.setText(`Máy (${SIDE_INFO[this.aiSide].label}) — Vàng: ${aiGold}💰`);

    for (const [type, btn] of this.buttons) {
      const cost = unitCost(this.mods, this.playerSide, type);
      const cdLeft = spawn.cooldownLeft(this.playerSide, type, now);
      const ready = cdLeft <= 0 && economy.canAfford(this.playerSide, cost);
      btn.setAlpha(ready ? 1 : 0.45);
      const suffix = cdLeft > 0 ? `\n${(cdLeft / 1000).toFixed(1)}s` : '';
      btn.setText(`${UNITS[type].label}\n${cost}💰${suffix}`);
    }

    const spCd = special.cooldownLeft(this.playerSide, now);
    this.specialBtn.setAlpha(spCd <= 0 ? 1 : 0.45);
    const spLabel = SPECIAL[this.playerSide].label;
    this.specialBtn.setText(spCd > 0 ? `${spLabel}\n${(spCd / 1000).toFixed(0)}s` : `${spLabel}\n⚡SẴN`);
  }
}
