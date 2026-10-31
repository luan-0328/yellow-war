import test from "node:test";
import assert from "node:assert/strict";
import { BattleModel } from "../src/game/BattleModel";
import { UNIT_CONFIG } from "../src/config/unitConfig";
import { BALANCE as B } from "../src/config/balanceConfig";
import { CombatSystem } from "../src/systems/CombatSystem";
import { SpawnSystem } from "../src/systems/SpawnSystem";
import type { UnitType } from "../src/types/unit";
function advance(model: BattleModel, seconds: number) {
  for (let t = 0; t < seconds; t += 0.1) {
    model.update(0.1);
    model.events.length = 0;
  }
}
test("矿工完成真实往返才交付，每个周期只交付一次", () => {
  const m = new BattleModel(1);
  advance(m, 4);
  assert.equal(m.state.player.gold, 400);
  advance(m, 2);
  assert.equal(m.state.player.gold, 455);
  advance(m, 1);
  assert.equal(m.state.player.gold, 455);
});
test("招募扣款一次；金币不足、暂停、基地死亡、人口满均不扣款", () => {
  const m = new BattleModel(1);
  assert.equal(m.recruit("swordsman"), null);
  assert.equal(m.state.player.gold, 250);
  assert.equal(m.population("player"), 2);
  assert.match(m.recruit("giant")!, /金币不足/);
  assert.equal(m.state.player.gold, 250);
  m.pause();
  assert.match(m.recruit("miner")!, /当前/);
  m.resume();
  m.state.player.baseHp = 0;
  assert.match(m.recruit("miner")!, /基地/);
  m.state.player.baseHp = 1800;
  m.state.player.gold = 10000;
  while (m.population("player") < 30) assert.equal(m.recruit("miner"), null);
  const gold = m.state.player.gold;
  assert.match(m.recruit("miner")!, /人口/);
  assert.equal(m.state.player.gold, gold);
});
test("暂停冻结经济、投射物、AI、移动与所有战斗计时", () => {
  const m = new BattleModel(2);
  m.recruit("archer");
  advance(m, 12);
  m.pause();
  const before = JSON.stringify({
    state: m.state,
    units: m.units,
    shots: m.shots,
  });
  advance(m, 30);
  assert.equal(
    JSON.stringify({ state: m.state, units: m.units, shots: m.shots }),
    before,
  );
  m.resume();
  advance(m, 1);
  assert.notEqual(m.state.elapsed, 12);
});
test("死亡矿工不会交付、死亡战斗单位不再攻击；盾矛兵减伤20%", () => {
  const m = new BattleModel(1),
    miner = m.units[0];
  miner.carrying = true;
  miner.x = B.homeX.player;
  CombatSystem.damage(miner, 1000);
  advance(m, 1);
  assert.equal(m.state.player.gold, 400);
  assert.equal(m.population("player"), 0);
  const shield = SpawnSystem.create("spearman", "player", 42);
  assert.equal(CombatSystem.damage(shield, 100), 80);
  assert.equal(shield.hp, 200);
  const fighter = SpawnSystem.create("giant", "player", 44);
  fighter.x = 1150;
  CombatSystem.damage(fighter, 9999);
  m.units.push(fighter);
  advance(m, 3);
  assert.equal(m.state.enemy.baseHp, 1800);
});
test("箭矢命中后才扣血，目标先死亡则投射物销毁", () => {
  const m = new BattleModel(1);
  m.units = [];
  const archer = SpawnSystem.create("archer", "player", 10),
    target = SpawnSystem.create("swordsman", "enemy", 11);
  archer.x = 400;
  target.x = 610;
  archer.state = target.state = "idle";
  archer.attackTimer = 0;
  target.attackTimer = 10;
  m.units.push(archer, target);
  m.update(0.1);
  assert.equal(target.hp, 180);
  assert.equal(m.shots.length, 1);
  CombatSystem.damage(target, 1000);
  advance(m, 0.5);
  assert.equal(m.shots.length, 0);
});
test("法师和巨人对敌人溅射，不伤友军", () => {
  for (const type of ["mage", "giant"] as UnitType[]) {
    const m = new BattleModel(1);
    m.units = [];
    const attacker = SpawnSystem.create(type, "player", 10);
    attacker.x = 500;
    attacker.state = "idle";
    attacker.attackTimer = 0;
    const a = SpawnSystem.create("giant", "enemy", 11),
      b = SpawnSystem.create("giant", "enemy", 12),
      ally = SpawnSystem.create("giant", "player", 13);
    a.x = 560;
    b.x = 580;
    ally.x = 550;
    a.state = b.state = ally.state = "idle";
    a.attackTimer = b.attackTimer = ally.attackTimer = 100;
    m.units.push(attacker, a, b, ally);
    advance(m, 0.5);
    assert.ok(a.hp < 900);
    assert.ok(b.hp < 900);
    assert.equal(ally.hp, 900);
  }
});
test("集合与防守改变战斗单位目标，矿工仍采矿", () => {
  const m = new BattleModel(1);
  m.recruit("swordsman");
  const u = m.units.find((u) => u.type === "swordsman")!;
  u.x = 600;
  u.state = "idle";
  m.order("rally");
  advance(m, 2);
  assert.ok(u.x < 600);
  assert.ok(m.units[0].state === "mining" || m.units[0].state === "moving");
  m.order("hold");
  advance(m, 6);
  assert.ok(u.x <= B.defenseX.player + 5);
});
test("AI 在对等经济与人口约束下生产，无无限金币", () => {
  const m = new BattleModel(99);
  advance(m, 100);
  for (const team of ["player", "enemy"] as const) {
    const s = m.state[team];
    assert.equal(s.gold, B.initialGold + s.earned - s.spent);
    assert.ok(s.gold >= 0);
    assert.ok(m.population(team) <= 30);
  }
  assert.ok(m.state.enemy.recruited > 3);
});
test("正常规则下不操作会失败，结束后冻结；新局完全重置", () => {
  const m = new BattleModel(5);
  advance(m, 600);
  assert.equal(m.state.status, "defeat");
  const snapshot = JSON.stringify(m.state);
  advance(m, 20);
  assert.equal(JSON.stringify(m.state), snapshot);
  const fresh = new BattleModel(5);
  assert.equal(fresh.state.player.gold, 400);
  assert.equal(fresh.state.elapsed, 0);
  assert.equal(fresh.units.length, 2);
  assert.equal(fresh.shots.length, 0);
});
test("真实采矿与招募策略可获胜，不注入额外金币或修改敌方生命", () => {
  const m = new BattleModel(8);
  let cooldown = 0;
  for (let t = 0; t < 900 && m.state.status === "playing"; t += 0.1) {
    cooldown -= 0.1;
    if (cooldown <= 0) {
      cooldown = 1;
      const count = (type: UnitType) =>
        m.units.filter(
          (u) => u.team === "player" && u.hp > 0 && u.type === type,
        ).length;
      let type: UnitType;
      if (count("miner") < 6) type = "miner";
      else if (count("spearman") < 2) type = "spearman";
      else if (count("mage") < 3) type = "mage";
      else if (count("giant") < 3) type = "giant";
      else type = count("archer") < 3 ? "archer" : "swordsman";
      if (m.state.player.gold >= UNIT_CONFIG[type].cost) m.recruit(type);
    }
    m.update(0.1);
    m.events.length = 0;
  }
  assert.equal(m.state.status, "victory");
  assert.equal(
    m.state.player.gold,
    400 + m.state.player.earned - m.state.player.spent,
  );
  console.log(
    `Full match victory at ${m.state.elapsed.toFixed(1)}s, recruited ${m.state.player.recruited}, kills ${m.state.player.kills}`,
  );
});
