import type Phaser from 'phaser';
import {
  AI_HERO_MIN_STAGE,
  AI_TITAN_MIN_STAGE,
  AI_ZOMBIE_MIN_STAGE,
  DIFFICULTIES,
  Difficulty,
  SPAWN_ORDER,
  Side,
  UNITS,
  UPGRADE_ORDER,
  UnitType,
  enemyOf,
  heroForSide,
  titanDefByType,
  titanForSide,
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
  stage: number;
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
 * Từ các mốc màn (AI_HERO/TITAN/ZOMBIE_MIN_STAGE), AI được ưu tiên mua Hero/Titan/Zombie phe mình
 * mỗi lượt quyết định (không qua cơ chế mở khoá bằng xu — AI không có tiến trình vĩnh viễn).
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
    if (this.maybeBuySpecialUnit(ctx)) return; // mua được Hero/Titan/Zombie lượt này → bỏ qua đẻ lính thường
    this.maybeSpawn(ctx);
  }

  /**
   * Từ các mốc màn: ưu tiên mua Hero/Titan/Zombie phe mình (đủ vàng + hết hồi chiêu).
   * Thử MỌI loại đã mở (không dừng ở loại đầu tiên mua được) — mỗi loại có hồi chiêu/giá
   * riêng nên không tranh chấp nhau (hero rẻ/nhanh mua liên tục không được chặn titan đắt/chậm).
   * Trả true nếu mua được ít nhất 1 loại (bỏ qua đẻ lính thường lượt này).
   */
  private maybeBuySpecialUnit(ctx: AiContext): boolean {
    const candidates: UnitType[] = [];
    if (ctx.stage >= AI_HERO_MIN_STAGE) {
      const hero = heroForSide(this.side)?.unitType;
      if (hero) candidates.push(hero);
    }
    if (ctx.stage >= AI_TITAN_MIN_STAGE) {
      const titan = titanForSide(this.side)?.unitType;
      if (titan) candidates.push(titan);
    }
    if (ctx.stage >= AI_ZOMBIE_MIN_STAGE) candidates.push(UnitType.Zombie);

    let boughtAny = false;
    for (const type of candidates) {
      const result = titanDefByType(type)
        ? ctx.spawn.trySpawnTitan(this.side, type, ctx.economy, ctx.units, ctx.now)
        : ctx.spawn.trySpawn(this.side, type, ctx.economy, ctx.units, ctx.now);
      if ('unit' in result) boughtAny = true;
    }
    return boughtAny;
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
