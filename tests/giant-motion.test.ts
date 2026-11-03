import test from "node:test";
import assert from "node:assert/strict";
import {
  createCharacterGrid,
  deformGrid,
  poseForUnit,
} from "../src/entities/CharacterMotion";
import { SpawnSystem } from "../src/systems/SpawnSystem";
import { MOTION } from "../src/config/motionConfig";

test("巨人蓄力和重击不翻转网格三角形或撕裂肩颈", () => {
  const grid = createCharacterGrid(365, 606, { u0: 0, v0: 0, u1: 1, v1: 1 }),
    base = grid.vertices.slice();
  const area = (v: number[], a: number, b: number, c: number) =>
    (v[b] - v[a]) * (v[c + 1] - v[a + 1]) -
    (v[b + 1] - v[a + 1]) * (v[c] - v[a]);
  for (let step = 0; step <= 30; step++) {
    const u = SpawnSystem.create("giant", "player", 1);
    u.attackElapsed =
      (step / 30) * (MOTION.giant.windup + MOTION.giant.recovery);
    deformGrid(
      grid.vertices,
      base,
      365,
      606,
      poseForUnit(u, 0, false),
      "giant",
    );
    for (let i = 0; i < grid.indices.length; i += 4) {
      const [a, b, c] = grid.indices.slice(i, i + 3).map((v) => v * 4);
      assert.ok(
        area(grid.vertices, a, b, c) * area(base, a, b, c) > 0,
        `fold at phase ${step}, triangle ${i / 4}`,
      );
    }
  }
});
