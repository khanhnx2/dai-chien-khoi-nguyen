import { ECONOMY, Side } from '../config/game-config';

/** Quản lý vàng 2 phe: thu nhập nền theo thời gian + bounty giết lính. */
export class Economy {
  private gold: Record<Side, number> = {
    [Side.Khoi]: ECONOMY.startingGold,
    [Side.Nguyen]: ECONOMY.startingGold,
  };
  /** Thu nhập cộng thêm từ nâng cấp (mỗi phe). */
  private bonusIncome: Record<Side, number> = {
    [Side.Khoi]: 0,
    [Side.Nguyen]: 0,
  };

  update(dtSeconds: number): void {
    this.gold[Side.Khoi] += (ECONOMY.incomePerSecond + this.bonusIncome[Side.Khoi]) * dtSeconds;
    this.gold[Side.Nguyen] += (ECONOMY.incomePerSecond + this.bonusIncome[Side.Nguyen]) * dtSeconds;
  }

  addIncome(side: Side, amount: number): void {
    this.bonusIncome[side] += amount;
  }

  getGold(side: Side): number {
    return this.gold[side];
  }

  canAfford(side: Side, cost: number): boolean {
    return this.gold[side] >= cost;
  }

  spend(side: Side, cost: number): boolean {
    if (!this.canAfford(side, cost)) return false;
    this.gold[side] -= cost;
    return true;
  }

  reward(side: Side, amount: number): void {
    this.gold[side] += amount;
  }
}
