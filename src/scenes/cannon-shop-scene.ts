import Phaser from 'phaser';
import { CANNON_MIN_STAGE, CANNON_UNLOCK, CANNON_UPGRADES, GAME_WIDTH, GAME_HEIGHT } from '../config/game-config';
import { getCoins, nextCost } from '../systems/meta-upgrades';
import { isCannonUnlocked, unlockCannon } from '../systems/cannon-shop';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { clayButton } from '../ui/ui-kit';
import { buildStatsPanel, buildUpgradeRow } from '../ui/upgrade-row';
import { sound } from '../audio/sound-manager';

/** Shop Đại bác: mở khoá 1 lần bằng xu, sau đó 2 nâng cấp (Sát thương / Giảm hồi chiêu). */
export class CannonShopScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('cannon');
  }

  create(): void {
    drawGradientBg(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 30, '💣 ĐẠI BÁC', { fontFamily: FONT, fontSize: '30px', color: COLORS.textLight, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#1a1030', 6);

    this.coinsText = this.add
      .text(GAME_WIDTH - 16, 16, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.textGold, fontStyle: 'bold' })
      .setOrigin(1, 0);

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
    buildStatsPanel(this, this.content, 'Đại bác', 100);

    if (isCannonUnlocked()) {
      this.content.add(
        this.add
          .text(GAME_WIDTH / 2, 190, `✅ Đã mở khoá — tự bắn từ màn ${CANNON_MIN_STAGE}. Nâng cấp:`, {
            fontFamily: FONT, fontSize: '15px', color: COLORS.textGold,
          })
          .setOrigin(0.5),
      );
      CANNON_UPGRADES.forEach((def, i) => buildUpgradeRow(this, this.content, def, 230 + i * 60, () => this.rebuild()));
      return;
    }
    this.buildUnlockButton();
  }

  /** Chưa sở hữu: nút mở khoá lớn (đủ xu → xanh). */
  private buildUnlockButton(): void {
    const cost = nextCost(CANNON_UNLOCK);
    const affordable = getCoins() >= cost;
    const btn = clayButton(this, {
      x: GAME_WIDTH / 2,
      y: 250,
      width: 320,
      height: 64,
      label: `🔓 Mở khoá Đại bác · ${cost} 🪙`,
      fill: affordable ? COLORS.green : COLORS.slate,
      fontSize: 20,
      onClick: () => {
        if (unlockCannon()) {
          sound.play('special');
          this.rebuild();
        }
      },
    });
    btn.setEnabled(affordable);
    this.content.add(btn.container);
    this.content.add(
      this.add
        .text(GAME_WIDTH / 2, 190, `Vũ khí công thành: tự bắn 1000 dmg mỗi 5s, đơn mục tiêu. Chỉ hoạt động từ màn ${CANNON_MIN_STAGE}.`, {
          fontFamily: FONT, fontSize: '15px', color: COLORS.textMuted, align: 'center', wordWrap: { width: GAME_WIDTH - 100 },
        })
        .setOrigin(0.5),
    );
  }
}
