import {
  HERO_CHARGE_MULT,
  HERO_CRY_THROTTLE_MS,
  HERO_HEAL_FRAC_PER_SEC,
  HERO_RETREAT_HP_FRAC,
  HERO_RETREAT_SPEED_MULT,
  HERO_VISION_RANGE,
  Side,
  directionOf,
  enemyOf,
  heroDefByType,
} from '../config/game-config';
import type { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import { nearestEnemyUnit } from './combat';
import { sound } from '../audio/sound-manager';
import type { Sfx } from '../audio/sound-manager';

/**
 * Máy trạng thái hero (Sumo/Labubu — giống hệt nhau), 1 frame. Thay logic mặc định:
 * - ≤50% máu → rút lui về hậu phương (vẫn dính đòn dọc đường); về sau Thành thì bất
 *   khả xâm + hồi máu; đầy máu → lao lại.
 * - Bình thường: địch trong tầm đánh → đánh nhịp nhanh (kèm tiếng kêu tiết chế); địch
 *   trong tầm nhìn (ngoài tầm đánh) → lao tới ×4; else tiến tốc thường / đánh Thành.
 */
export function updateHero(
  unit: Unit,
  units: Unit[],
  bases: Record<Side, Base>,
  dtSeconds: number,
  now: number,
): void {
  const dir = directionOf(unit.side);
  const enemyBase = bases[enemyOf(unit.side)];

  // Kích rút lui (hysteresis: bật ở ≤50%, chỉ tắt khi đầy máu bên dưới).
  if (!unit.retreating && unit.hp / unit.maxHp <= HERO_RETREAT_HP_FRAC) unit.retreating = true;

  if (unit.retreating) {
    if (unit.isBehindOwnBase()) {
      unit.heal(unit.maxHp * HERO_HEAL_FRAC_PER_SEC * dtSeconds);
      if (unit.hp >= unit.maxHp) unit.retreating = false; // đầy máu → lao lại
    } else {
      unit.moveBy(-dir * unit.stats.speed * HERO_RETREAT_SPEED_MULT * dtSeconds); // chạy về, vẫn bị bắn
    }
    return;
  }

  const nearest = nearestEnemyUnit(unit, units);
  const baseDist = Math.abs(enemyBase.frontX - unit.x);
  const attackUnit = nearest !== null && nearest.dist <= unit.stats.range && nearest.dist <= baseDist;
  const attackBase = !attackUnit && baseDist <= unit.stats.range;
  const ready = now - unit.lastAttackAt >= unit.stats.attackCooldownMs;

  if (attackUnit && nearest) {
    if (ready) {
      nearest.target.takeDamage(unit.attackDamage); // hero không khắc chế → không nhân hệ số
      unit.lastAttackAt = now;
      unit.attackFx(nearest.target.x);
      cry(unit, now);
    }
  } else if (attackBase) {
    if (ready) {
      enemyBase.takeDamage(unit.attackDamage);
      unit.lastAttackAt = now;
      unit.attackFx(enemyBase.frontX);
      cry(unit, now);
    }
  } else if (nearest !== null && nearest.dist <= HERO_VISION_RANGE) {
    unit.moveBy(dir * unit.stats.speed * HERO_CHARGE_MULT * dtSeconds); // thấy địch → lao tới ×4
  } else {
    unit.moveBy(dir * unit.stats.speed * dtSeconds); // tiến thường về thành địch
  }
}

/** Tiếng kêu khi đánh (chó sủa / Labubu), theo hero, tiết chế để không liên thanh. */
function cry(unit: Unit, now: number): void {
  if (now - unit.lastCryAt < HERO_CRY_THROTTLE_MS) return;
  unit.lastCryAt = now;
  const sfx = heroDefByType(unit.type)?.sfx;
  if (sfx) sound.play(sfx as Sfx);
}
