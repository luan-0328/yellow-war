import type { Team, UnitType } from "./unit";
export type Command = "advance" | "hold" | "rally";
export type MatchStatus = "playing" | "paused" | "victory" | "defeat";
export interface SideState {
  gold: number;
  baseHp: number;
  command: Command;
  recruited: number;
  kills: number;
  earned: number;
  spent: number;
}
export interface MatchState {
  status: MatchStatus;
  elapsed: number;
  player: SideState;
  enemy: SideState;
}
export interface Shot {
  id: number;
  team: Team;
  type: UnitType;
  targetId: number | Team;
  x: number;
  y: number;
  damage: number;
  speed: number;
}
export interface BattleEvent {
  kind: "recruit" | "deposit" | "attack" | "hit" | "death" | "end";
  team: Team;
  x: number;
  y: number;
  type?: UnitType;
  value?: number;
}
