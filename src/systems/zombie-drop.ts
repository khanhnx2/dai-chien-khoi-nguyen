import {
  UnitType,
  ZOMBIE_DROP_COUNT,
  ZOMBIE_DROP_INTERVAL_MS,
  ZOMBIE_MIN_STAGE,
  ZOMBIE_TRIGGER_HP_FRAC,
  zombieDropZone,
  zombieWaveCount,
  type Side,
} from '../config/game-config';
import type { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import type { SpawnManager } from './spawn';

/**
 * Zombie đổ bộ cứu Máy: 1 LẦN/trận, kích khi máu thành Máy LẦN ĐẦU ≤ ZOMBIE_TRIGGER_HP_FRAC
 * (mất 25%, chỉ từ màn ≥ ZOMBIE_MIN_STAGE). Sau khi kích, mỗi ZOMBIE_DROP_INTERVAL_MS đẻ
 * ZOMBIE_DROP_COUNT zombie tại X ngẫu nhiên nửa sân Máy (dù rơi), đủ `zombieWaveCount(stage)`
 * đợt (base 10, +1 mỗi 10 màn) rồi dừng. Hệ thống độc lập, KHÔNG sửa ReinforcementManager.
 */
export class ZombieDropManager {
  private triggered = false;
  private wavesLeft = 0;
  private nextDropAt = 0;

  /** Trả 'start' đúng frame kích hoạt (toast), 'drop' mỗi đợt rơi tiếp theo, false nếu không có gì. */
  update(
    stage: number,
    aiSide: Side,
    bases: Record<Side, Base>,
    spawn: SpawnManager,
    units: Unit[],
    now: number,
  ): 'start' | 'drop' | false {
    if (stage < ZOMBIE_MIN_STAGE) return false;

    let justTriggered = false;
    if (!this.triggered) {
      const base = bases[aiSide];
      if (base.hp / base.maxHp > ZOMBIE_TRIGGER_HP_FRAC) return false;
      this.triggered = true;
      this.wavesLeft = zombieWaveCount(stage);
      this.nextDropAt = now; // đẻ đợt đầu ngay
      justTriggered = true;
    }
    if (this.wavesLeft <= 0) return false;
    if (now < this.nextDropAt) return false;

    this.wavesLeft--;
    this.nextDropAt += ZOMBIE_DROP_INTERVAL_MS;
    const [lo, hi] = zombieDropZone(aiSide);
    for (let i = 0; i < ZOMBIE_DROP_COUNT; i++) {
      const x = lo + Math.random() * (hi - lo);
      spawn.forceSpawnAt(aiSide, UnitType.Zombie, units, x, true);
    }
    return justTriggered ? 'start' : 'drop';
  }
}
