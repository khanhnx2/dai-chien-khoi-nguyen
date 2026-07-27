import { Side, TITAN_AOE_RADIUS, TITAN_AURA_HP_FRAC, TITAN_KNOCKBACK, TITAN_STUN_MS, directionOf, enemyOf } from '../config/game-config';
import type { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import { nearestEnemyUnit } from './combat';
import { sound } from '../audio/sound-manager';

/**
 * Hành vi titan (Capibara/Totoro), 1 frame. Khác lính thường: cập nhật cờ hào quang
 * theo máu (>2/3 → bật, chặn đạn xuyên Father). Đánh cận chiến chậm, không khắc chế.
 * KHÔNG charge/rút lui như hero. Circular import với combat (nearestEnemyUnit) chỉ
 * dùng ở function-level → an toàn (giống hero-behavior).
 */
export function updateTitan(
  unit: Unit,
  units: Unit[],
  bases: Record<Side, Base>,
  dtSeconds: number,
  now: number,
): void {
  unit.setAura(unit.hp / unit.maxHp > TITAN_AURA_HP_FRAC);

  const enemyBase = bases[enemyOf(unit.side)];
  const nearest = nearestEnemyUnit(unit, units);
  const baseDist = Math.abs(enemyBase.frontX - unit.x);
  const attackUnit = nearest !== null && nearest.dist <= unit.stats.range && nearest.dist <= baseDist;
  const attackBase = !attackUnit && baseDist <= unit.stats.range;
  const ready = now - unit.lastAttackAt >= unit.stats.attackCooldownMs;

  if (attackUnit && nearest) {
    if (ready) {
      // Cầm cây tre đập DIỆN RỘNG: trúng MỌI lính địch trong bán kính → sát thương + đẩy lùi + choáng.
      for (const other of units) {
        if (other.side === unit.side || other.isDead() || !other.isTargetable()) continue;
        if (Math.abs(other.x - unit.x) > TITAN_AOE_RADIUS) continue;
        other.takeDamage(unit.attackDamage);
        if (other.isDead()) continue;
        other.moveBy(-directionOf(other.side) * TITAN_KNOCKBACK); // đẩy lùi về phía thành chúng
        other.stunnedUntil = now + TITAN_STUN_MS; // choáng
        other.showStun();
      }
      unit.lastAttackAt = now;
      unit.attackFx(nearest.target.x);
      sound.play('slash');
    }
  } else if (attackBase) {
    if (ready) {
      enemyBase.takeDamage(unit.attackDamage);
      unit.lastAttackAt = now;
      unit.attackFx(enemyBase.frontX);
      sound.play('slash');
    }
  } else {
    unit.moveBy(directionOf(unit.side) * unit.stats.speed * dtSeconds); // tiến chậm về thành địch
  }
}
