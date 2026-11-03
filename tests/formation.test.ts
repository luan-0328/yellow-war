import test from "node:test";
import assert from "node:assert/strict";
import { BattleModel } from "../src/game/BattleModel";
import { BALANCE as B } from "../src/config/balanceConfig";
import { SpawnSystem } from "../src/systems/SpawnSystem";
import { OrderSystem } from "../src/systems/OrderSystem";
import type { UnitType } from "../src/types/unit";

const ranks: UnitType[] = ["giant", "spearman", "swordsman", "archer", "mage"];
test("防守按重装到远程列队，后排远离矿区，敌方镜像排列", () => {
  for (const team of ["player", "enemy"] as const) {
    const units = ranks.map((type, i) => SpawnSystem.create(type, team, i + 1));
    const slots = units.map((u) => OrderSystem.defensePosition(u, units));
    for (let i = 1; i < slots.length; i++) {
      assert.equal(
        (slots[i - 1].x - slots[i].x) * (team === "player" ? 1 : -1),
        140,
      );
    }
    assert.ok(Math.abs(slots.at(-1)!.x - B.mineX[team]) >= 250);
    assert.equal(slots[0].x, B.defenseX[team]);
  }
});

test("点击防守后真实回到各自位置，不被分离逻辑挤散；死亡后补位", () => {
  const m = new BattleModel(1);
  m.units = [...ranks, "swordsman", "swordsman" as UnitType].map((type, i) =>
    SpawnSystem.create(type as UnitType, "player", i + 10),
  );
  for (const u of m.units) {
    u.x = 140;
    u.state = "idle";
  }
  m.order("hold");
  // Keep enemy economy idle so this test measures formation arrival without combat.
  m.state.enemy.gold = 0;
  for (let i = 0; i < 400; i++) m.update(0.1);
  const check = () => {
    for (const u of m.units.filter((u) => u.hp > 0)) {
      const slot = OrderSystem.defensePosition(u, m.units);
      assert.ok(Math.abs(u.x - slot.x) < 3);
      assert.ok(Math.abs(u.y - slot.y) < 1);
      assert.equal(u.state, "idle");
      assert.equal(u.facing, 1);
    }
  };
  check();
  const dead = m.units.find((u) => u.type === "swordsman")!;
  dead.hp = 0;
  for (let i = 0; i < 100; i++) m.update(0.1);
  check();
  assert.equal(
    new Set(m.units.map((u) => `${u.x},${u.y}`)).size,
    m.units.length,
  );
});

test("防守不追逐射程外敌人，进入射程后才还击", () => {
  const m = new BattleModel(1);
  const a = SpawnSystem.create("swordsman", "player", 1);
  const b = SpawnSystem.create("giant", "enemy", 2);
  m.units = [a, b];
  m.order("hold");
  const slot = OrderSystem.defensePosition(a, m.units);
  a.x = slot.x;
  a.y = slot.y;
  a.state = "idle";
  a.attackTimer = 0;
  b.x = a.x + 200;
  b.state = "spawning";
  b.timer = 100;
  m.update(0.1);
  assert.equal(a.x, slot.x);
  assert.equal(a.pendingAttack, undefined);
  b.x = a.x + 40;
  m.update(0.1);
  assert.ok(a.pendingAttack);
});
