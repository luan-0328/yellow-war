import { UNIT_CONFIG } from "../config/unitConfig";
import type { UnitRuntime, UnitType } from "../types/unit";
export class EnemyAISystem {
  static choose(
    units: UnitRuntime[],
    gold: number,
    random: () => number,
  ): UnitType | undefined {
    const own = units.filter((u) => u.team === "enemy" && u.hp > 0),
      count = (t: UnitType) => own.filter((u) => u.type === t).length;
    let type: UnitType;
    if (count("miner") < 3) type = "miner";
    else if (count("swordsman") + count("spearman") < 2) type = "swordsman";
    else if (gold >= 500 && random() < 0.35) type = "giant";
    else if (count("archer") + count("mage") < Math.ceil((own.length - 3) / 2))
      type = random() < 0.55 ? "archer" : "mage";
    else type = random() < 0.5 ? "spearman" : "swordsman";
    return gold >= UNIT_CONFIG[type].cost ? type : undefined;
  }
}
