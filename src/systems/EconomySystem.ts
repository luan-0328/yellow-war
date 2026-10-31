import { BALANCE } from "../config/balanceConfig";
import type { SideState } from "../types/match";
export class EconomySystem {
  static spend(side: SideState, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0 || side.gold < amount)
      return false;
    side.gold -= amount;
    side.spent += amount;
    return true;
  }
  static deposit(side: SideState) {
    side.gold += BALANCE.mineYield;
    side.earned += BALANCE.mineYield;
  }
}
