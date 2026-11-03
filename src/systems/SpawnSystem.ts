import { BALANCE } from "../config/balanceConfig";
import { UNIT_CONFIG } from "../config/unitConfig";
import type { MatchState } from "../types/match";
import type { Team, UnitRuntime, UnitType } from "../types/unit";
import { EconomySystem } from "./EconomySystem";
export class SpawnSystem {
  static recruit(
    state: MatchState,
    units: UnitRuntime[],
    type: UnitType,
    team: Team,
    id: number,
    queued = 0,
  ): UnitRuntime | string {
    if (state.status !== "playing") return "当前无法招募";
    if (state[team].baseHp <= 0) return "基地已被摧毁";
    if (
      units.filter((u) => u.team === team && u.hp > 0).length + queued >=
      BALANCE.populationCap
    )
      return "人口已满（30 / 30）";
    if (!EconomySystem.spend(state[team], UNIT_CONFIG[type].cost))
      return "金币不足，需要 " + UNIT_CONFIG[type].cost + " 金币";
    state[team].recruited++;
    return this.create(type, team, id);
  }
  static create(type: UnitType, team: Team, id: number): UnitRuntime {
    return {
      id,
      type,
      team,
      hp: UNIT_CONFIG[type].maxHp,
      x: BALANCE.homeX[team],
      y: BALANCE.groundY + ((id % 3) - 1) * 7,
      state: "spawning",
      timer: BALANCE.spawnDuration,
      attackTimer: 0.35,
      deathTimer: 0,
      carrying: false,
      hitTimer: 0,
      facing: team === "player" ? 1 : -1,
      motionTime: 0,
      attackElapsed: -1,
    };
  }
}
