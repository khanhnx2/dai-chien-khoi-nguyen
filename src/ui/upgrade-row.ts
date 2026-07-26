// Helper dùng chung cho các màn shop (NÂNG CẤP & Quán Phở Anh Khôi): dòng chỉ số
// hiện tại + hàng nâng cấp (mua bằng xu). Dùng chung kho meta (buyUpgrade áp cho mọi
// MetaUpgradeDef, kể cả HERO_UPGRADES) → DRY giữa 2 scene.

import Phaser from 'phaser';
import { BASE, ECONOMY, GAME_WIDTH, MetaUpgradeDef, SideMods, UNITS, UnitType } from '../config/game-config';
import { buyUpgrade, computePlayerMods, getCoins, getLevel, isMaxed, nextCost } from '../systems/meta-upgrades';
import { COLORS, FONT } from './theme';
import { clayButton } from './ui-kit';
import { sound } from '../audio/sound-manager';

/** Nhãn nhóm → loại lính (để hiện chỉ số quân hiện tại). */
const GROUP_UNIT: Record<string, UnitType> = {
  'Bộ binh': UnitType.BoBinh,
  'Cung thủ': UnitType.CungThu,
  'Giáp binh': UnitType.GiapBinh,
  Father: UnitType.Father,
  Sumo: UnitType.Sumo,
  Labubu: UnitType.Labubu,
  Capibara: UnitType.Capibara,
  Totoro: UnitType.Totoro,
};

/** Hệ số → phần trăm dễ đọc (1.18 → "+18%", 0.94 → "-6%"). */
function pct(factor: number): string {
  return `${factor >= 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%`;
}

/**
 * 2 dòng chỉ số HIỆN TẠI của đối tượng (đã nhân hệ số nâng cấp vĩnh viễn).
 * Nhóm lính (kể cả Sumo): máu/sức mạnh/tốc/tầm/giá/hồi. Nhóm Thành & Chung: số tương ứng.
 */
export function statsLines(group: string, mods: SideMods): string[] {
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
  const income = (ECONOMY.incomePerSecond * mods.income).toFixed(1);
  return [`💰 Thu nhập nền ${income}/giây`];
}

/** Khung "Chỉ số hiện tại" của nhóm đang chọn; `top` = mép trên panel. */
export function buildStatsPanel(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  group: string,
  top = 118,
): void {
  const lines = statsLines(group, computePlayerMods());
  const panel = scene.add.graphics();
  panel.fillStyle(COLORS.panel, 0.85);
  panel.lineStyle(2, COLORS.panelBorder, 1);
  panel.fillRoundedRect(40, top, GAME_WIDTH - 80, 68, 12);
  panel.strokeRoundedRect(40, top, GAME_WIDTH - 80, 68, 12);
  container.add(panel);
  container.add(
    scene.add
      .text(GAME_WIDTH / 2, top + 12, 'Chỉ số hiện tại', { fontFamily: FONT, fontSize: '13px', color: COLORS.textGold })
      .setOrigin(0.5, 0),
  );
  lines.forEach((line, i) => {
    container.add(
      scene.add
        .text(GAME_WIDTH / 2, top + 32 + i * 22, line, { fontFamily: FONT, fontSize: '16px', color: COLORS.textLight })
        .setOrigin(0.5, 0),
    );
  });
}

/** 1 hàng nâng cấp (nhãn + cấp + nút mua). `onBought` gọi sau khi mua thành công. */
export function buildUpgradeRow(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  def: MetaUpgradeDef,
  y: number,
  onBought: () => void,
): void {
  const label = scene.add.text(70, y - 14, def.label, { fontFamily: FONT, fontSize: '20px', color: COLORS.textLight });
  const info = scene.add.text(70, y + 12, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.textMuted });
  container.add([label, info]);

  const buy = clayButton(scene, {
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
        onBought();
      }
    },
  });
  container.add(buy.container);

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
}
