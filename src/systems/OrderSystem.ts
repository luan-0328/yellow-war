import type { MatchState, Command } from "../types/match";
import { BALANCE as B } from "../config/balanceConfig";
import type { UnitRuntime, UnitType, Team } from "../types/unit";
export class OrderSystem {
  static defensePosition(unit: UnitRuntime, units: readonly UnitRuntime[]) {
    const ranks: Partial<Record<UnitType, number>> = {
      giant: 0,
      spearman: 1,
      swordsman: 2,
      archer: 3,
      mage: 4,
    };
    const rank = ranks[unit.type] ?? 4;
    const peers = units
      .filter((u) => u.team === unit.team && u.type === unit.type && u.hp > 0)
      .sort((a, b) => a.id - b.id);
    const slot = Math.max(
      0,
      peers.findIndex((u) => u.id === unit.id),
    );
    const direction = unit.team === "player" ? 1 : -1;
    return {
      x:
        B.defenseX[unit.team] -
        direction * (rank * 140 + Math.floor(slot / 4) * 18),
      y: B.groundY - 24 + (slot % 4) * 10,
    };
  }
  static issue(state: MatchState, command: Command, team: Team = "player") {
    if (state.status === "playing") state[team].command = command;
  }
}
