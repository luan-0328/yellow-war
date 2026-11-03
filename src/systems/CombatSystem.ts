import type { UnitRuntime } from "../types/unit";
export class CombatSystem {
  static damage(target: UnitRuntime, amount: number) {
    if (target.hp <= 0) return 0;
    const actual = amount * (target.type === "spearman" ? 0.8 : 1);
    target.hp = Math.max(0, target.hp - actual);
    target.hitTimer = 0.15;
    if (target.hp <= 0) {
      target.state = "dying";
      target.deathTimer = 0;
      target.carrying = false;
      target.pendingAttack = undefined;
    }
    return actual;
  }
  static nearest(
    unit: UnitRuntime,
    units: UnitRuntime[],
    maxDistance = Infinity,
  ) {
    let result: UnitRuntime | undefined,
      distance = maxDistance;
    for (const other of units) {
      if (other.team === unit.team || other.hp <= 0) continue;
      const d = Math.abs(other.x - unit.x);
      if (d < distance) {
        result = other;
        distance = d;
      }
    }
    return result;
  }
}
