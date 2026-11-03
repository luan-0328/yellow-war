import test from "node:test";
import assert from "node:assert/strict";
import {
  createCharacterGrid,
  deformGrid,
  poseForUnit,
  restPose,
} from "../src/entities/CharacterMotion";
import { SpawnSystem } from "../src/systems/SpawnSystem";
import { BattleModel } from "../src/game/BattleModel";
import { CombatSystem } from "../src/systems/CombatSystem";
import { MOTION } from "../src/config/motionConfig";

test("静止网格保留原始立绘位置和 UV，左右脚能够交替抬起", () => {
  const { vertices, indices } = createCharacterGrid(230, 350, {
    u0: 0,
    v0: 0,
    u1: 1,
    v1: 1,
  });
  const base = vertices.slice();
  deformGrid(vertices, base, 230, 350, restPose(), "swordsman");
  assert.deepEqual(vertices, base);
  assert.equal(indices.length, 12 * 22 * 8);
  const u = SpawnSystem.create("swordsman", "player", 1);
  u.state = "moving";
  const left = poseForUnit(u, Math.PI / 2, true),
    right = poseForUnit(u, Math.PI * 1.5, true);
  assert.ok(left.liftLeft > 0 && left.liftRight === 0);
  assert.ok(right.liftRight > 0 && right.liftLeft === 0);
  deformGrid(vertices, base, 230, 350, left, "swordsman");
  assert.notDeepEqual(vertices, base);
  for (let i = 2; i < base.length; i += 4) {
    assert.equal(vertices[i], base[i]);
    assert.equal(vertices[i + 1], base[i + 1]);
  }
});
test("武器蓄力与出手姿势不同，脸部中心保持原来宽度", () => {
  const u = SpawnSystem.create("swordsman", "player", 1);
  u.state = "attacking";
  u.attackElapsed = MOTION.swordsman.windup * 0.9;
  const windup = poseForUnit(u, 0, false);
  u.attackElapsed = MOTION.swordsman.windup + 0.02;
  const strike = poseForUnit(u, 0, false);
  assert.ok(windup.leftArm < 0 && strike.leftArm > 0);
  assert.ok(windup.lean < 0 && strike.lean > 0);
  const base = [100, 60, 0.4, 0.2, 130, 60, 0.6, 0.2],
    v = base.slice();
  deformGrid(v, base, 230, 350, strike, "swordsman");
  assert.equal(v[4] - v[0], 30);
});
test("近战蓄力完成才命中，死亡取消尚未出手的攻击", () => {
  const m = new BattleModel(1);
  const a = SpawnSystem.create("swordsman", "player", 10),
    b = SpawnSystem.create("giant", "enemy", 11);
  a.x = 500;
  b.x = 545;
  a.state = b.state = "idle";
  a.attackTimer = 0;
  b.attackTimer = 99;
  m.units = [a, b];
  m.update(0.1);
  assert.equal(b.hp, 900);
  assert.ok(a.pendingAttack);
  m.update(0.2);
  assert.equal(b.hp, 874);
  a.attackTimer = 0;
  a.pendingAttack = undefined;
  m.update(0.05);
  assert.ok(a.pendingAttack);
  CombatSystem.damage(a, 999);
  const hp = b.hp;
  m.update(0.25);
  assert.equal(b.hp, hp);
  assert.equal(a.pendingAttack, undefined);
});
test("蓄力期间目标离开射程，不会隔空造成近战伤害", () => {
  const m = new BattleModel(1);
  const a = SpawnSystem.create("swordsman", "player", 10),
    b = SpawnSystem.create("giant", "enemy", 11);
  a.x = 500;
  b.x = 545;
  a.state = b.state = "idle";
  a.attackTimer = 0;
  b.attackTimer = 99;
  m.units = [a, b];
  m.update(0.1);
  b.x = 900;
  m.update(0.25);
  assert.equal(b.hp, 900);
});
test("无实际位移时没有脚步循环，减少动态效果时取消呼吸", () => {
  const u = SpawnSystem.create("miner", "player", 1);
  u.state = "idle";
  u.motionTime = 0.2;
  const pose = poseForUnit(u, 1, false, true);
  assert.equal(pose.stride, 0);
  assert.equal(pose.breath, 0);
});
