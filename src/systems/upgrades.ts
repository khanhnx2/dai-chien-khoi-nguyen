import {
  Side,
  UPGRADES,
  UPGRADE_EFFECT,
  UpgradeType,
  upgradeCost,
} from '../config/game-config';
import type { Base } from '../entities/base';
import type { Economy } from './economy';

type LevelMap = Record<UpgradeType, number>;

function zeroLevels(): LevelMap {
  return {
    [UpgradeType.Income]: 0,
    [UpgradeType.BaseHp]: 0,
    [UpgradeType.RoofDamage]: 0,
  };
}

/** Quản lý nâng cấp 2 phe: trừ vàng, tăng cấp, áp hiệu ứng lên kinh tế/thành/nóc. */
export class Upgrades {
  private levels: Record<Side, LevelMap> = {
    [Side.Khoi]: zeroLevels(),
    [Side.Nguyen]: zeroLevels(),
  };

  getLevel(side: Side, type: UpgradeType): number {
    return this.levels[side][type];
  }

  isMaxed(side: Side, type: UpgradeType): boolean {
    return this.levels[side][type] >= UPGRADES[type].maxLevel;
  }

  /** Chi phí mua cấp tiếp theo (dựa trên cấp hiện tại). */
  nextCost(side: Side, type: UpgradeType): number {
    return upgradeCost(type, this.levels[side][type]);
  }

  /** Hệ số sát thương nóc thành theo số cấp Sức bắn đã mua. */
  roofDamageMultiplier(side: Side): number {
    return 1 + this.levels[side][UpgradeType.RoofDamage] * UPGRADE_EFFECT.roofDamagePerLevel;
  }

  tryBuy(side: Side, type: UpgradeType, economy: Economy, base: Base): boolean {
    if (this.isMaxed(side, type)) return false;
    if (!economy.spend(side, this.nextCost(side, type))) return false;

    this.levels[side][type]++;
    switch (type) {
      case UpgradeType.Income:
        economy.addIncome(side, UPGRADE_EFFECT.incomePerLevel);
        break;
      case UpgradeType.BaseHp:
        base.raiseMaxHpAndHeal(UPGRADE_EFFECT.baseHpPerLevel);
        break;
      case UpgradeType.RoofDamage:
        // Hiệu ứng đọc qua roofDamageMultiplier khi nóc thành bắn.
        break;
    }
    return true;
  }
}
