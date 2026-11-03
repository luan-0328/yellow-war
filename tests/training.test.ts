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

test("队列上限和预留人口禁止超额扣款，敌人也必须训练", () => {
  const m = new BattleModel(1);
  m.state.player.gold = 10000;
  for (let i = 0; i < B.queueLimit; i++) assert.equal(m.recruit("giant"), null);
  const gold = m.state.player.gold;
  assert.match(m.recruit("miner")!, /队列/);
  assert.equal(m.state.player.gold, gold);
  m.training.player.length = 0;
  while (m.population("player") < 29)
    m.units.push(SpawnSystem.create("miner", "player", 100 + m.units.length));
  assert.equal(m.recruit("miner"), null);
  const cappedGold = m.state.player.gold;
  assert.match(m.recruit("miner")!, /人口/);
  assert.equal(m.state.player.gold, cappedGold);
  assert.equal(m.recruit("miner", "enemy"), null);
  assert.equal(m.population("enemy"), 1);
  advance(m, 3.05);
  assert.equal(m.population("enemy"), 2);
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
