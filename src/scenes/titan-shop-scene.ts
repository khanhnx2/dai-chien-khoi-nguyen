import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TITANS, TitanDef } from '../config/game-config';
import { getCoins, nextCost } from '../systems/meta-upgrades';
import { isTitanUnlocked, unlockTitan } from '../systems/titan-shop';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { avatarFrame, clayButton } from '../ui/ui-kit';
import { buildStatsPanel, buildUpgradeRow } from '../ui/upgrade-row';
import { sound } from '../audio/sound-manager';

interface TitanSceneData {
  titanId?: string;
}

/** Shop titan: CHỈ mở khoá 1 titan (Capibara/Totoro) bằng xu — không nâng cấp. */
export class TitanShopScene extends Phaser.Scene {
  private titan!: TitanDef;
  private coinsText!: Phaser.GameObjects.Text;
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('titan');
  }

  init(data: TitanSceneData): void {
    this.titan = TITANS.find((t) => t.id === data.titanId) ?? TITANS[0];
  }

  create(): void {
    drawGradientBg(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 30, this.titan.shopTitle, { fontFamily: FONT, fontSize: '30px', color: COLORS.textLight, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#1a1030', 6);

    this.coinsText = this.add
      .text(GAME_WIDTH - 16, 16, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.textGold, fontStyle: 'bold' })
      .setOrigin(1, 0);

    avatarFrame(this, GAME_WIDTH / 2, 98, this.titan.faceKey, 76, this.titan.menuFill);
    this.add
      .text(GAME_WIDTH / 2, 142, this.titan.statsGroup, { fontFamily: FONT, fontSize: '20px', color: COLORS.textLight, fontStyle: 'bold' })
      .setOrigin(0.5, 0);

    clayButton(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 32,
      width: 180,
      height: 46,
      label: '◀ Về menu',
      fill: COLORS.blue,
      fontSize: 18,
      onClick: () => this.scene.start('menu'),
    });

    this.content = this.add.container(0, 0);
    this.rebuild();
  }

  private rebuild(): void {
    this.coinsText.setText(`Xu: ${getCoins()} 🪙`);
    this.content.removeAll(true);
    buildStatsPanel(this, this.content, this.titan.statsGroup, 172);

    if (isTitanUnlocked(this.titan)) {
      this.content.add(
        this.add
          .text(GAME_WIDTH / 2, 260, `✅ Đã mở khoá — đẻ trong trận (200 vàng). Nâng cấp:`, {
            fontFamily: FONT, fontSize: '15px', color: COLORS.textGold,
          })
          .setOrigin(0.5),
      );
      this.titan.upgrades.forEach((def, i) => buildUpgradeRow(this, this.content, def, 300 + i * 60, () => this.rebuild()));
      return;
    }
    this.buildUnlockButton();
  }

  /** Chưa sở hữu: nút mở khoá lớn (đủ xu → xanh). */
  private buildUnlockButton(): void {
    const cost = nextCost(this.titan.unlock);
    const affordable = getCoins() >= cost;
    const btn = clayButton(this, {
      x: GAME_WIDTH / 2,
      y: 320,
      width: 320,
      height: 64,
      label: `🔓 Mở khoá ${this.titan.statsGroup} · ${cost} 🪙`,
      fill: affordable ? COLORS.green : COLORS.slate,
      fontSize: 20,
      onClick: () => {
        if (unlockTitan(this.titan)) {
          sound.play('special');
          this.rebuild();
        }
      },
    });
    btn.setEnabled(affordable);
    this.content.add(btn.container);
    this.content.add(
      this.add
        .text(GAME_WIDTH / 2, 260, `Tank khổng lồ: rơi từ trời, hào quang chặn phép xuyên, chết hồi máu toàn quân!`, {
          fontFamily: FONT, fontSize: '15px', color: COLORS.textMuted,
        })
        .setOrigin(0.5),
    );
  }
}
