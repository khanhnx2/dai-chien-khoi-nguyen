import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, HEROES, HeroDef } from '../config/game-config';
import { getCoins, nextCost } from '../systems/meta-upgrades';
import { isHeroUnlocked, unlockHero } from '../systems/hero-shop';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { avatarFrame, clayButton } from '../ui/ui-kit';
import { buildStatsPanel, buildUpgradeRow } from '../ui/upgrade-row';
import { sound } from '../audio/sound-manager';

interface HeroSceneData {
  heroId?: string;
}

/** Shop hero: mua mở khoá + nâng cấp 1 hero (Sumo/Labubu) bằng xu. Hero chọn qua init data. */
export class HeroScene extends Phaser.Scene {
  private hero!: HeroDef;
  private coinsText!: Phaser.GameObjects.Text;
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('hero');
  }

  init(data: HeroSceneData): void {
    this.hero = HEROES.find((h) => h.id === data.heroId) ?? HEROES[0];
  }

  create(): void {
    drawGradientBg(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 30, this.hero.shopTitle, { fontFamily: FONT, fontSize: '30px', color: COLORS.textLight, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#1a1030', 6);

    this.coinsText = this.add
      .text(GAME_WIDTH - 16, 16, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.textGold, fontStyle: 'bold' })
      .setOrigin(1, 0);

    // Avatar hero + tên.
    avatarFrame(this, GAME_WIDTH / 2, 98, this.hero.faceKey, 76, this.hero.menuFill);
    this.add
      .text(GAME_WIDTH / 2, 142, this.hero.statsGroup, { fontFamily: FONT, fontSize: '20px', color: COLORS.textLight, fontStyle: 'bold' })
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

    buildStatsPanel(this, this.content, this.hero.statsGroup, 172);

    if (!isHeroUnlocked(this.hero)) {
      this.buildUnlockButton();
      return;
    }
    this.hero.upgrades.forEach((def, i) => buildUpgradeRow(this, this.content, def, 300 + i * 66, () => this.rebuild()));
  }

  /** Chưa sở hữu: nút mở khoá lớn (đủ xu → xanh). */
  private buildUnlockButton(): void {
    const cost = nextCost(this.hero.unlock);
    const affordable = getCoins() >= cost;
    const btn = clayButton(this, {
      x: GAME_WIDTH / 2,
      y: 320,
      width: 320,
      height: 64,
      label: `🔓 Mở khoá ${this.hero.statsGroup} · ${cost} 🪙`,
      fill: affordable ? COLORS.green : COLORS.slate,
      fontSize: 20,
      onClick: () => {
        if (unlockHero(this.hero)) {
          sound.play('special');
          this.rebuild();
        }
      },
    });
    btn.setEnabled(affordable);
    this.content.add(btn.container);
    this.content.add(
      this.add
        .text(GAME_WIDTH / 2, 260, `Mở khoá để chiêu mộ ${this.hero.statsGroup} — hero riêng của phe!`, {
          fontFamily: FONT, fontSize: '15px', color: COLORS.textMuted,
        })
        .setOrigin(0.5),
    );
  }
}
