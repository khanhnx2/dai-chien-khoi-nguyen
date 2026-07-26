import { GAME_WIDTH, Side, directionOf, enemyOf, titanDefByType } from '../config/game-config';
import type { Base } from '../entities/base';
import type { Projectile } from '../entities/projectile';
import type { Unit } from '../entities/unit';

const STRAIGHT_HIT_DIST = 22;

/** Cập nhật đạn 1 frame: di chuyển, va chạm, gây sát thương, dọn đạn chết. */
export function updateProjectiles(
  projectiles: Projectile[],
  units: Unit[],
  bases: Record<Side, Base>,
  dtSeconds: number,
): void {
  for (const p of projectiles) {
    if (!p.alive) continue;
    p.advance(dtSeconds);

    const enemyBase = bases[enemyOf(p.side)];

    if (p.kind === 'arc') {
      if (p.reachedTarget()) {
        explode(p, units, enemyBase);
        p.kill();
      }
    } else if (p.pierce) {
      pierceThrough(p, units, enemyBase);
    } else {
      const hit = nearestEnemyWithin(p, units, STRAIGHT_HIT_DIST);
      if (hit) {
        hit.takeDamage(p.damage);
        p.kill();
      } else if (directionOf(p.side) * (p.x - enemyBase.frontX) >= 0) {
        enemyBase.takeDamage(p.damage);
        p.kill();
      }
    }

    if (p.x < -20 || p.x > GAME_WIDTH + 20 || p.expired()) p.kill();
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    if (!projectiles[i].alive) projectiles.splice(i, 1);
  }
}

/**
 * Đạn xuyên (Father): trúng mọi lính địch trên đường (mỗi lính 1 lần), KHÔNG bị cản.
 * Đạn tiếp tục bay; chạm thành địch thì gây sát thương 1 lần rồi dừng.
 * NGOẠI LỆ: titan địch còn hào quang → gây sát thương rồi DỪNG (không xuyên qua lính sau).
 */
function pierceThrough(p: Projectile, units: Unit[], enemyBase: Base): void {
  for (const u of units) {
    if (u.side === p.side || u.isDead() || !u.isTargetable() || p.hitUnits.has(u)) continue;
    if (Math.abs(u.x - p.x) <= STRAIGHT_HIT_DIST) {
      u.takeDamage(p.damage);
      // Hào quang titan chặn: đạn dừng ngay tại titan, không xuyên tới lính phía sau.
      // Chỉ kích khi titan là ĐỊCH của nguồn đạn xuyên (Father) — hiện Father & titan đều
      // của người chơi nên chưa gặp nhau; sẽ có tác dụng khi titan vào quân tiếp viện của Máy.
      if (titanDefByType(u.type) && u.auraActive) {
        p.kill();
        return;
      }
      p.hitUnits.add(u);
    }
  }
  if (!p.hitBase && directionOf(p.side) * (p.x - enemyBase.frontX) >= 0) {
    enemyBase.takeDamage(p.damage);
    p.hitBase = true;
    p.kill(); // dừng ở tường thành
  }
}

/**
 * Đạn arc rơi trúng mục tiêu.
 * - aoeRadius > 0 (kỹ năng Mưa trứng): NỔ DIỆN RỘNG — trúng mọi lính địch trong bán kính.
 * - aoeRadius ≤ 0 (trứng nóc thành): ĐƠN MỤC TIÊU — chỉ 1 lính gần điểm rơi nhất.
 * Chỉ Tướng (đạn xuyên) & kỹ năng tay bấm mới đánh nhiều mục tiêu.
 */
function explode(p: Projectile, units: Unit[], enemyBase: Base): void {
  if (p.aoeRadius <= 0) {
    const hit = nearestEnemyWithin(p, units, STRAIGHT_HIT_DIST);
    if (hit) hit.takeDamage(p.damage);
    else if (Math.abs(enemyBase.frontX - p.x) <= STRAIGHT_HIT_DIST) enemyBase.takeDamage(p.damage);
    return;
  }
  for (const u of units) {
    if (u.side === p.side || u.isDead() || !u.isTargetable()) continue;
    if (Math.abs(u.x - p.x) <= p.aoeRadius) u.takeDamage(p.damage);
  }
  if (Math.abs(enemyBase.frontX - p.x) <= p.aoeRadius) enemyBase.takeDamage(p.damage);
}

function nearestEnemyWithin(p: Projectile, units: Unit[], dist: number): Unit | null {
  let best: Unit | null = null;
  let bestD = dist;
  for (const u of units) {
    if (u.side === p.side || u.isDead() || !u.isTargetable()) continue;
    const d = Math.abs(u.x - p.x);
    if (d <= bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}
