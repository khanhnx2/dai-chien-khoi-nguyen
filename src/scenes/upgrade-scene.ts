import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, META_GROUPS, META_UPGRADES } from '../config/game-config';
import { getCoins } from '../systems/meta-upgrades';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { clayButton, type ClayButton } from '../ui/ui-kit';
import { buildStatsPanel, buildUpgradeRow } from '../ui/upgrade-row';

/** Shop nâng cấp vĩnh viễn: tab theo đối tượng, mua bằng xu. */
export class UpgradeScene extends Phaser.Scene {
  private group = META_GROUPS[0];
  private coinsText!: Phaser.GameObjects.Text;
  private tabButtons = new Map<string, ClayButton>();
  private rows!: Phaser.GameObjects.Container;

  constructor() {
    super('upgrade');
  }

  create(): void {
    this.group = META_GROUPS[0];
    this.tabButtons.clear();
    drawGradientBg(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 34, 'NÂNG CẤP', { fontFamily: FONT, fontSize: '34px', color: COLORS.textLight, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#1a1030', 6);

    this.coinsText = this.add
      .text(GAME_WIDTH - 16, 20, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.textGold, fontStyle: 'bold' })
      .setOrigin(1, 0);

    // Tabs.
    META_GROUPS.forEach((g, i) => {
      const btn = clayButton(this, {
        x: 90 + i * 130,
        y: 90,
        width: 120,
        height: 42,
        label: g,
        fill: COLORS.slate,
        fontSize: 15,
        onClick: () => this.selectTab(g),
      });
      this.tabButtons.set(g, btn);
    });

    // Nút về menu.
    clayButton(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 34,
      width: 180,
      height: 46,
      label: '◀ Về menu',
      fill: COLORS.blue,
      fontSize: 18,
      onClick: () => this.scene.start('menu'),
    });

    this.rows = this.add.container(0, 0);
    this.selectTab(this.group);
    this.refreshCoins();
  }

  private refreshCoins(): void {
    this.coinsText.setText(`Xu: ${getCoins()} 🪙`);
  }

  private selectTab(group: string): void {
    this.group = group;
    for (const [g, btn] of this.tabButtons) btn.setFill(g === group ? COLORS.blue : COLORS.slate);
    this.rows.removeAll(true);

    buildStatsPanel(this, this.rows, group);

    const onBought = () => {
      this.refreshCoins();
      this.selectTab(this.group); // dựng lại: cập nhật chỉ số + giá/khả năng mua mọi hàng
    };
    const defs = META_UPGRADES.filter((d) => d.group === group);
    defs.forEach((def, i) => buildUpgradeRow(this, this.rows, def, 214 + i * 70, onBought));
  }
}
