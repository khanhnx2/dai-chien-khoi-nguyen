import type { Side } from '../config/game-config';
import type { Unit } from './unit';

/** Lính địch gần điểm `x` nhất trong `range` (bỏ qua cùng phe/chết/bất khả xâm). Dùng chung cho mọi thực thể tự bắn (nóc thành, đại bác). */
export function nearestEnemyInRange(units: Unit[], side: Side, x: number, range: number): Unit | null {
  let best: Unit | null = null;
  let bestD = range;
  for (const u of units) {
    if (u.side === side || u.isDead() || !u.isTargetable()) continue;
    const d = Math.abs(u.x - x);
    if (d <= bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}
