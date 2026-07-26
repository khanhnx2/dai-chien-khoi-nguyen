import type Phaser from 'phaser';
import { LANE_Y, Side, UnitType, damageMultiplier, directionOf, enemyOf } from '../config/game-config';
import type { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import { Projectile } from '../entities/projectile';
import type { Economy } from './economy';
import { updateSumo } from './hero-behavior';
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

    // Hero Sumo có máy trạng thái riêng (lao tới / rút lui hồi máu) — xử lý ở module riêng.
    if (unit.type === UnitType.Sumo) {
      updateSumo(unit, units, bases, dtSeconds, now);
      continue;
    }

    const enemyBase = bases[enemyOf(unit.side)];
    const nearest = nearestEnemyUnit(unit, units);
    const baseDist = Math.abs(enemyBase.frontX - unit.x);

    // Chọn mục tiêu gần hơn giữa lính địch và thành địch.
    const attackUnit = nearest !== null && nearest.dist <= unit.stats.range && nearest.dist <= baseDist;
    const attackBase = !attackUnit && baseDist <= unit.stats.range;
    const ready = now - unit.lastAttackAt >= unit.stats.attackCooldownMs;

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
            unit.attackDamage,
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
        unit.moveBy(directionOf(unit.side) * unit.stats.speed * dtSeconds);
      }
      continue;
    }

    const attackSfx = () => sound.play(unit.type === UnitType.CungThu ? 'arrow' : 'slash');

    if (attackUnit && nearest) {
      if (ready) {
        const dmg = unit.attackDamage * damageMultiplier(unit.type, nearest.target.type);
        nearest.target.takeDamage(dmg);
        unit.lastAttackAt = now;
        unit.attackFx(nearest.target.x);
        attackSfx(); // chém / bắn tên
      }
    } else if (attackBase) {
      if (ready) {
        enemyBase.takeDamage(unit.attackDamage);
        unit.lastAttackAt = now;
        unit.attackFx(enemyBase.frontX);
        attackSfx();
      }
    } else {
      // Ngoài tầm: tiến về phía thành địch.
      unit.moveBy(directionOf(unit.side) * unit.stats.speed * dtSeconds);
    }
  }

  // Dọn lính chết + cộng bounty cho phe đối diện.
  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i];
    if (unit.isDead()) {
      economy.reward(enemyOf(unit.side), unit.stats.reward);
      unit.destroy();
      units.splice(i, 1);
    }
  }
}
