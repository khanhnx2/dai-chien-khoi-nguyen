import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  META_GROUPS,
  META_UPGRADES,
  MetaUpgradeDef,
} from '../config/game-config';
import { buyUpgrade, getCoins, getLevel, isMaxed, nextCost } from '../systems/meta-upgrades';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { clayButton, type ClayButton } from '../ui/ui-kit';
import { sound } from '../audio/sound-manager';

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

    const defs = META_UPGRADES.filter((d) => d.group === group);
    defs.forEach((def, i) => this.buildRow(def, 150 + i * 78));
  }

  private buildRow(def: MetaUpgradeDef, y: number): void {
    const label = this.add.text(70, y - 14, def.label, { fontFamily: FONT, fontSize: '20px', color: COLORS.textLight });
    const info = this.add.text(70, y + 12, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.textMuted });
    this.rows.add([label, info]);

    const buy = clayButton(this, {
      x: GAME_WIDTH - 150,
      y,
      width: 220,
      height: 54,
      label: '',
      fill: COLORS.green,
      fontSize: 16,
      onClick: () => {
        if (buyUpgrade(def)) {
          sound.play('spawn');
          this.refreshCoins();
          refresh();
        }
      },
    });
    this.rows.add(buy.container);

    const refresh = () => {
      const level = getLevel(def.id);
      info.setText(`Cấp ${level} / ${def.maxLevel}`);
      if (isMaxed(def)) {
        buy.setLabel('TỐI ĐA');
        buy.setFill(COLORS.slate);
        buy.setEnabled(false);
      } else {
        const cost = nextCost(def);
        buy.setLabel(`Nâng · ${cost} 🪙`);
        const affordable = getCoins() >= cost;
        buy.setFill(affordable ? COLORS.green : COLORS.slate);
        buy.setEnabled(affordable);
      }
    };
    refresh();
  }
}
