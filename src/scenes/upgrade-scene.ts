import Phaser from 'phaser';
import {
  BASE,
  ECONOMY,
  GAME_WIDTH,
  GAME_HEIGHT,
  META_GROUPS,
  META_UPGRADES,
  MetaUpgradeDef,
  SideMods,
  UNITS,
  UnitType,
} from '../config/game-config';
import { buyUpgrade, computePlayerMods, getCoins, getLevel, isMaxed, nextCost } from '../systems/meta-upgrades';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { clayButton, type ClayButton } from '../ui/ui-kit';
import { sound } from '../audio/sound-manager';

/** Tab đối tượng → loại lính (để hiện chỉ số quân hiện tại ở đầu tab). */
const GROUP_UNIT: Record<string, UnitType> = {
  'Bộ binh': UnitType.BoBinh,
  'Cung thủ': UnitType.CungThu,
  'Giáp binh': UnitType.GiapBinh,
  Father: UnitType.Father,
};

/** Hệ số → phần trăm dễ đọc (1.18 → "+18%", 0.94 → "-6%"). */
function pct(factor: number): string {
  return `${factor >= 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%`;
}

/**
 * 2 dòng chỉ số HIỆN TẠI của đối tượng đang chọn (đã nhân hệ số nâng cấp vĩnh viễn).
 * Tab lính: máu/sức mạnh/tốc/tầm/giá/hồi. Tab Thành & Chung: số tương ứng.
 */
function statsLines(group: string, mods: SideMods): string[] {
  const type = GROUP_UNIT[group];
  if (type) {
    const u = UNITS[type];
    const hp = Math.round(u.hp * mods.unitHp[type]);
    const dmg = Math.round(u.damage * mods.unitDmg[type]);
    const cost = Math.round(u.cost * mods.unitCost[type]);
    const spawnCd = ((u.spawnCooldownMs * mods.unitSpawnCd[type]) / 1000).toFixed(1);
    const atkCd = (u.attackCooldownMs / 1000).toFixed(1);
    return [
      `❤️ Máu ${hp}      ⚔️ Sức mạnh ${dmg}      👟 Tốc độ ${u.speed}      🎯 Tầm ${u.range}`,
      `💰 Giá ${cost}      ⏱️ Hồi đẻ ${spawnCd}s      🔁 Nhịp đánh ${atkCd}s`,
    ];
  }
  if (group === 'Thành') {
    const baseHp = Math.round(BASE.maxHp * mods.baseHp);
    return [
      `🏰 Máu thành ${baseHp}`,
      `🥚 Sát thương nóc ${pct(mods.roofDmg)}      ⏱️ Hồi chiêu nóc ${pct(mods.roofCd)}`,
    ];
  }
  // Chung: thu nhập nền/giây.
  const income = (ECONOMY.incomePerSecond * mods.income).toFixed(1);
  return [`💰 Thu nhập nền ${income}/giây`];
}

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

    this.buildStatsPanel(group);

    const defs = META_UPGRADES.filter((d) => d.group === group);
    defs.forEach((def, i) => this.buildRow(def, 214 + i * 70));
  }

  /** Khung chỉ số hiện tại của đối tượng đang chọn (đầu mỗi tab). */
  private buildStatsPanel(group: string): void {
    const lines = statsLines(group, computePlayerMods());
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.85);
    panel.lineStyle(2, COLORS.panelBorder, 1);
    panel.fillRoundedRect(40, 118, GAME_WIDTH - 80, 68, 12);
    panel.strokeRoundedRect(40, 118, GAME_WIDTH - 80, 68, 12);
    this.rows.add(panel);

    this.rows.add(
      this.add
        .text(GAME_WIDTH / 2, 130, 'Chỉ số hiện tại', { fontFamily: FONT, fontSize: '13px', color: COLORS.textGold })
        .setOrigin(0.5, 0),
    );
    lines.forEach((line, i) => {
      this.rows.add(
        this.add
          .text(GAME_WIDTH / 2, 150 + i * 22, line, { fontFamily: FONT, fontSize: '16px', color: COLORS.textLight })
          .setOrigin(0.5, 0),
      );
    });
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
          this.selectTab(this.group); // dựng lại: cập nhật chỉ số + giá/khả năng mua mọi hàng
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
