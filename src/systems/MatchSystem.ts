import { BALANCE } from "../config/balanceConfig";
import type { MatchState, SideState } from "../types/match";
const side = (): SideState => ({
  gold: BALANCE.initialGold,
  baseHp: BALANCE.baseHp,
  command: "advance",
  recruited: 0,
  kills: 0,
  earned: 0,
  spent: 0,
});
export class MatchSystem {
  static create(): MatchState {
    return { status: "playing", elapsed: 0, player: side(), enemy: side() };
  }
  static check(state: MatchState) {
    if (state.status !== "playing") return false;
    if (state.player.baseHp <= 0) state.status = "defeat";
    else if (state.enemy.baseHp <= 0) state.status = "victory";
    return state.status !== "playing";
  }
}
