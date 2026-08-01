import type Phaser from 'phaser';
import { LANE_Y, Side, TITAN_DEATH_HEAL_FRAC, UnitType, damageMultiplier, directionOf, enemyOf, heroDefByType, titanDefByType } from '../config/game-config';
import type { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import { Projectile } from '../entities/projectile';
import type { Economy } from './economy';
import { updateHero } from './hero-behavior';
import { updateTitan } from './titan-behavior';
import { sound } from '../audio/sound-manager';

const FATHER_BOLT_SPEED = 520;
const FATHER_BOLT_COLOR = 0xa855f7;
/** Đạn Father bay tối đa 1.5× tầm xa rồi biến mất. */
const FATHER_BOLT_TRAVEL_FACTOR = 1.5;

/** Lính địch gần nhất theo khoảng cách tuyệt đối (hoặc null). Bỏ qua lính bất khả xâm (Sumo đang hồi). */
export function nearestEnemyUnit(unit: Unit, units: Unit[]): { target: Unit; dist: number } | null {
  let best: Unit | null = null;
  let bestDist = Infinity;
  for (const other of units) {
    if (other.side === unit.side || other.isDead() || !other.isTargetable()) continue;
    const dist = Math.abs(other.x - unit.x);
    if (dist < bestDist) {
      bestDist = dist;
      best = other;
    }
  }
  return best ? { target: best, dist: bestDist } : null;
}

/**
 * Cập nhật 1 frame: mỗi lính tìm mục tiêu gần nhất (lính địch hoặc thành địch),
 * trong tầm thì đánh theo nhịp, ngoài tầm thì tiến về thành địch.
 * Trả về true nếu có lính chết (để scene dọn + cộng bounty đã xử lý ở đây).
 */
export function updateBattle(
  units: Unit[],
  bases: Record<Side, Base>,
  economy: Economy,
  dtSeconds: number,
  now: number,
  projectiles?: Projectile[],
  scene?: Phaser.Scene | null,
): void {
  for (const unit of units) {
    if (unit.isDead()) continue;
    if (now < unit.stunnedUntil) continue; // choáng: bỏ lượt (không đi/đánh) — vẫn bị nhắm & ăn damage

    // Hero (Sumo/Labubu) có máy trạng thái riêng (lao tới / rút lui hồi máu).
    if (heroDefByType(unit.type)) {
      updateHero(unit, units, bases, dtSeconds, now);
      continue;
    }
    // Titan (Capibara/Totoro): tiến chậm + đánh cận chiến + cập nhật cờ hào quang.
    if (titanDefByType(unit.type)) {
      updateTitan(unit, units, bases, dtSeconds, now);
      continue;
    }

    const enemyBase = bases[enemyOf(unit.side)];
    const nearest = nearestEnemyUnit(unit, units);
    const baseDist = Math.abs(enemyBase.frontX - unit.x);

    // Chọn mục tiêu gần hơn giữa lính địch và thành địch.
    const attackUnit = nearest !== null && nearest.dist <= unit.stats.range && nearest.dist <= baseDist;
    const attackBase = !attackUnit && baseDist <= unit.stats.range;
    const ready = now - unit.lastAttackAt >= unit.stats.attackCooldownMs;

    // Zombie "cuồng nộ": ≤50% máu → ×4 tốc độ + ×4 sát thương.
    const rage = unit.type === UnitType.Zombie && unit.hp / unit.maxHp <= 0.5 ? 4 : 1;
    const speed = unit.stats.speed * rage;
    const dmg = unit.attackDamage * rage;

    // Father: có bất kỳ mục tiêu trong tầm → bắn đạn ma thuật XUYÊN (đạn tự lo sát thương).
    if (unit.stats.piercing && projectiles) {
      if ((attackUnit || attackBase) && ready) {
        unit.lastAttackAt = now;
        projectiles.push(
          new Projectile(
            scene ?? null,
            unit.side,
            'straight',
            unit.x,
            enemyBase.frontX,
            dmg,
            0,
            FATHER_BOLT_SPEED,
            FATHER_BOLT_COLOR,
            LANE_Y - unit.stats.size / 2,
            true,
            unit.stats.range * FATHER_BOLT_TRAVEL_FACTOR,
          ),
        );
        sound.play('magic'); // bắn phép
      } else if (!attackUnit && !attackBase) {
        unit.moveBy(directionOf(unit.side) * speed * dtSeconds);
      }
      continue;
    }

    const attackSfx = () => sound.play(unit.type === UnitType.CungThu ? 'arrow' : 'slash');

    if (attackUnit && nearest) {
      if (ready) {
        const dmgFinal = dmg * damageMultiplier(unit.type, nearest.target.type);
        nearest.target.takeDamage(dmgFinal);
        unit.lastAttackAt = now;
        unit.attackFx(nearest.target.x);
        attackSfx(); // chém / bắn tên
      }
    } else if (attackBase) {
      if (ready) {
        enemyBase.takeDamage(dmg);
        unit.lastAttackAt = now;
        unit.attackFx(enemyBase.frontX);
        attackSfx();
      }
    } else {
      // Ngoài tầm: tiến về phía thành địch.
      unit.moveBy(directionOf(unit.side) * speed * dtSeconds);
    }
  }

  // Dọn lính chết + cộng bounty cho phe đối diện.
  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i];
    if (unit.isDead()) {
      // Titan chết → hồi 1% máu tối đa cho mọi lính còn sống CÙNG PHE.
      if (titanDefByType(unit.type)) {
        for (const ally of units) {
          if (ally.side === unit.side && ally !== unit && !ally.isDead()) {
            ally.heal(ally.maxHp * TITAN_DEATH_HEAL_FRAC);
          }
        }
      }
      economy.reward(enemyOf(unit.side), unit.stats.reward);
      unit.destroy();
      units.splice(i, 1);
    }
  }
}
