import type { MatchState, Command } from "../types/match";
import type { Team } from "../types/unit";
export class OrderSystem {
  static issue(state: MatchState, command: Command, team: Team = "player") {
    if (state.status === "playing") state[team].command = command;
  }
}
