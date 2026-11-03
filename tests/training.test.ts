import test from "node:test";
import assert from "node:assert/strict";
import { BattleModel } from "../src/game/BattleModel";
import { BALANCE as B } from "../src/config/balanceConfig";
import { SpawnSystem } from "../src/systems/SpawnSystem";

function advance(m: BattleModel, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 100); i++) m.update(0.01);
}

test("训练顺序完成才出营，后排不会同时倒计时，暂停不推进训练", () => {
  const m = new BattleModel(1);
  m.recruit("swordsman");
  m.recruit("miner");
  assert.equal(m.population("player"), 1);
  assert.equal(m.reservedPopulation("player"), 3);
  advance(m, 2);
  assert.equal(m.population("player"), 1);
  assert.equal(m.training.player[1].remaining, 3);
  m.pause();
  const before = JSON.stringify(m.training);
  advance(m, 10);
  assert.equal(JSON.stringify(m.training), before);
  m.resume();
  advance(m, 2.05);
  assert.equal(m.population("player"), 2);
  assert.equal(m.training.player[0].unit.type, "miner");
  assert.ok(m.training.player[0].remaining > 2.9);
  advance(m, 3);
  assert.equal(m.population("player"), 3);
  assert.equal(m.training.player.length, 0);
});

test("40 人口包含队列，可连续排超过5名，满员不扣款，阵亡后可补兵", () => {
  const m = new BattleModel(1);
  m.state.player.gold = 10000;
  for (let i = 0; i < B.populationCap - 1; i++)
    assert.equal(m.recruit("miner"), null);
  assert.equal(m.training.player.length, 39);
  assert.equal(m.reservedPopulation("player"), 40);
  const gold = m.state.player.gold;
  assert.match(m.recruit("miner")!, /人口/);
  assert.equal(m.state.player.gold, gold);
  m.units[0].hp = 0;
  assert.equal(m.recruit("swordsman"), null);
  assert.equal(m.reservedPopulation("player"), 40);
  assert.equal(m.state.player.gold, gold - 150);
  assert.equal(m.recruit("miner", "enemy"), null);
  assert.equal(m.population("enemy"), 1);
  advance(m, 3.05);
  assert.equal(m.population("enemy"), 2);
});

test("新增矿点实际分配矿工，三个矿点均可采矿交付且不重复发钱", () => {
  const m = new BattleModel(1);
  m.state.player.gold = 1000;
  for (let i = 0; i < 5; i++) m.recruit("miner");
  const assignments = [0, ...m.training.player.map((e) => e.unit.mineIndex)];
  assert.deepEqual(assignments, [0, 1, 2, 0, 1, 2]);
  const delivered = new Set<number>();
  for (let t = 0; t < 24; t += 0.1) {
    const carrying = m.units
      .filter((u) => u.team === "player" && u.carrying)
      .map((u) => ({ id: u.id, mine: u.mineIndex ?? 0 }));
    m.update(0.1);
    for (const previous of carrying)
      if (m.units.some((u) => u.id === previous.id && u.hp > 0 && !u.carrying))
        delivered.add(previous.mine);
  }
  assert.deepEqual([...delivered].sort(), [0, 1, 2]);
  const miners = m.units.filter(
    (u) => u.team === "player" && u.type === "miner",
  );
  assert.equal(miners.length, 6);
  assert.equal(new Set(miners.map((u) => m.miningSpot(u).index)).size, 3);
  assert.equal(
    new Set(miners.map((u) => `${m.miningSpot(u).x},${m.miningSpot(u).y}`))
      .size,
    6,
  );
  assert.ok(m.state.player.earned > 0);
  assert.equal(m.state.player.gold, 1000 - 500 + m.state.player.earned);
});

test("加宽战场可以走过旧屏幕边界，结束对局清理训练", () => {
  const m = new BattleModel(1);
  m.units = [SpawnSystem.create("swordsman", "player", 99)];
  m.units[0].state = "idle";
  m.units[0].x = 1250;
  advance(m, 2);
  assert.ok(m.units[0].x > 1380);
  assert.ok(B.baseX.enemy > 3000);
  m.recruit("miner");
  m.state.player.baseHp = 0;
  m.update(0.01);
  assert.equal(m.state.status, "defeat");
  assert.equal(m.training.player.length, 0);
});
