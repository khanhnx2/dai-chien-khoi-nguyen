import type Phaser from 'phaser';
import {
  DIFFICULTIES,
  Difficulty,
  SPAWN_ORDER,
  Side,
  UNITS,
  UPGRADE_ORDER,
  UnitType,
  enemyOf,
  unitThatBeats,
} from '../config/game-config';
import type { Base } from '../entities/base';
import type { Projectile } from '../entities/projectile';
import type { Unit } from '../entities/unit';
import type { Economy } from '../systems/economy';
import type { SpawnManager } from '../systems/spawn';
import type { SpecialAbility } from '../systems/special-ability';
import type { Upgrades } from '../systems/upgrades';

/** Ngữ cảnh trận cho AI ra quyết định (đọc/ghi qua các hệ thống chung). */
export interface AiContext {
  now: number;
  units: Unit[];
  projectiles: Projectile[];
  economy: Economy;
  spawn: SpawnManager;
  upgrades: Upgrades;
  special: SpecialAbility;
  bases: Record<Side, Base>;
  scene: Phaser.Scene | null;
}

const UPGRADE_GOLD_THRESHOLD = 160;

/**
 * AI cầm 1 phe theo mức khó: định kỳ đẻ lính phản kèo và (tuỳ mức) mua nâng cấp.
 * KHÔNG dùng kỹ năng đặc biệt — chiêu đặc biệt chỉ dành cho người chơi.
 */
export class BasicAi {
  private readonly side: Side;
  private readonly difficulty: Difficulty;
  private nextDecisionAt = 0;

  constructor(side: Side, difficulty: Difficulty = Difficulty.Normal) {
    this.side = side;
    this.difficulty = difficulty;
  }

  update(ctx: AiContext): void {
    if (ctx.now < this.nextDecisionAt) return;
    const cfg = DIFFICULTIES[this.difficulty];
    this.nextDecisionAt = ctx.now + cfg.decisionIntervalMs;

    if (cfg.buysUpgrades) this.maybeBuyUpgrade(ctx);
    this.maybeSpawn(ctx);
  }

  private maybeBuyUpgrade(ctx: AiContext): void {
    if (ctx.economy.getGold(this.side) < UPGRADE_GOLD_THRESHOLD) return;
    for (const type of UPGRADE_ORDER) {
      if (ctx.upgrades.isMaxed(this.side, type)) continue;
      if (ctx.economy.canAfford(this.side, ctx.upgrades.nextCost(this.side, type))) {
        ctx.upgrades.tryBuy(this.side, type, ctx.economy, ctx.bases[this.side]);
        return;
      }
    }
  }

  private maybeSpawn(ctx: AiContext): void {
    const desired = this.pickUnit(ctx.units);
    if (ctx.economy.canAfford(this.side, UNITS[desired].cost)) {
      ctx.spawn.trySpawn(this.side, desired, ctx.economy, ctx.units, ctx.now);
      return;
    }
    // Phương án B: chưa đủ tiền loại mong muốn → đẻ loại ĐẮT NHẤT vẫn mua được
    // (tránh vàng dồn lại rồi chỉ đẻ mỗi lính rẻ).
    const fallback = this.bestAffordable(ctx);
    if (fallback) ctx.spawn.trySpawn(this.side, fallback, ctx.economy, ctx.units, ctx.now);
  }

  /** Loại lính đắt nhất mà hiện đủ vàng mua, hoặc null nếu không mua nổi loại nào. */
  private bestAffordable(ctx: AiContext): UnitType | null {
    let best: UnitType | null = null;
    for (const type of SPAWN_ORDER) {
      if (!ctx.economy.canAfford(this.side, UNITS[type].cost)) continue;
      if (best === null || UNITS[type].cost > UNITS[best].cost) best = type;
    }
    return best;
  }

  private randomType(): UnitType {
    return SPAWN_ORDER[Math.floor(Math.random() * SPAWN_ORDER.length)];
  }

  /**
   * Chọn loại lính: khắc chế loại địch đông nhất (hoà thì chọn ngẫu nhiên trong
   * các loại đồng hạng); không có địch → ngẫu nhiên; ~25% "thăm dò" chọn đại
   * để khó đoán và không đơn điệu.
   */
  private pickUnit(units: Unit[]): UnitType {
    if (Math.random() < 0.25) return this.randomType();

    const enemy = enemyOf(this.side);
    // Chỉ đếm 3 lính cơ bản (bỏ qua Father — AI không cần phản kèo tướng người chơi).
    const counts: Partial<Record<UnitType, number>> = {
      [UnitType.BoBinh]: 0,
      [UnitType.CungThu]: 0,
      [UnitType.GiapBinh]: 0,
    };
    let total = 0;
    for (const u of units) {
      if (u.side === enemy && counts[u.type] !== undefined) {
        counts[u.type]!++;
        total++;
      }
    }
    if (total === 0) return this.randomType();

    const max = Math.max(...SPAWN_ORDER.map((t) => counts[t] ?? 0));
    const topTypes = SPAWN_ORDER.filter((t) => (counts[t] ?? 0) === max);
    const common = topTypes[Math.floor(Math.random() * topTypes.length)];
    return unitThatBeats(common);
  }
}
