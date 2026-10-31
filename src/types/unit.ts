export type UnitType =
  "miner" | "swordsman" | "archer" | "spearman" | "mage" | "giant";
export type Team = "player" | "enemy";
export interface UnitConfig {
  type: UnitType;
  name: string;
  role: string;
  description: string;
  displayHeight: number;
  cost: number;
  maxHp: number;
  damage: number;
  attackInterval: number;
  attackRange: number;
  moveSpeed: number;
  attackKind: "melee" | "projectile" | "aoe";
}
export type UnitState =
  | "spawning"
  | "idle"
  | "moving"
  | "attacking"
  | "mining"
  | "returning"
  | "retreating"
  | "dying";
export interface UnitRuntime {
  id: number;
  type: UnitType;
  team: Team;
  hp: number;
  x: number;
  y: number;
  state: UnitState;
  timer: number;
  attackTimer: number;
  deathTimer: number;
  carrying: boolean;
  hitTimer: number;
}
