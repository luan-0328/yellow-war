import { MOTION } from "../config/motionConfig";
import type { UnitRuntime, UnitType } from "../types/unit";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export interface Pose {
  stride: number;
  liftLeft: number;
  liftRight: number;
  leftArm: number;
  rightArm: number;
  lean: number;
  drop: number;
  breath: number;
  recoil: number;
  death: number;
  draw: number;
}
export const restPose = (): Pose => ({
  stride: 0,
  liftLeft: 0,
  liftRight: 0,
  leftArm: 0,
  rightArm: 0,
  lean: 0,
  drop: 0,
  breath: 0,
  recoil: 0,
  death: 0,
  draw: 0,
});

/** Original pixels are skinned to a small 2D grid. No generated replacement art. */
export function poseForUnit(
  u: UnitRuntime,
  walkPhase: number,
  moving: boolean,
  reduced = false,
): Pose {
  const pose = restPose(),
    profile = MOTION[u.type];
  if (u.hp <= 0) {
    pose.death = clamp(u.deathTimer / 0.6);
    pose.drop = 0.09 * pose.death;
    return pose;
  }
  if (!reduced) pose.breath = Math.sin(u.motionTime * 2.6 + u.id) * 0.002;
  if (moving) {
    const wave = Math.sin(walkPhase),
      amp = reduced ? 0.6 : 1;
    const heavy = u.type === "giant";
    pose.stride = wave * (heavy ? 0.085 : 0.07) * amp;
    pose.liftLeft = Math.max(0, wave) * (heavy ? 0.054 : 0.039) * amp;
    pose.liftRight = Math.max(0, -wave) * (heavy ? 0.054 : 0.039) * amp;
    pose.leftArm = wave * (heavy ? 0.22 : 0.11);
    pose.rightArm = -wave * (heavy ? 0.22 : 0.11);
    pose.lean = 0.012 + (heavy ? Math.cos(walkPhase) * 0.01 : 0);
    pose.drop = -(1 + Math.cos(walkPhase * 2)) * (heavy ? 0.007 : 0.004);
  }
  if (u.state === "mining") {
    const t = ((2.5 - u.timer) % 0.78) / 0.78;
    const swing =
      t < 0.65 ? -Math.pow(t / 0.65, 2) : 0.75 * (1 - (t - 0.65) / 0.35);
    pose.leftArm = swing * 0.52;
    pose.rightArm = -swing * 0.08;
    pose.lean = swing * 0.035;
    pose.drop = Math.max(0, swing) * 0.018;
  }
  if (u.attackElapsed >= 0) {
    const t = u.attackElapsed,
      wind = profile.windup;
    const charge = t < wind ? Math.pow(t / wind, 1.7) : 0;
    const strike =
      t >= wind ? Math.exp((-(t - wind) * 10) / profile.weight) : 0;
    const swing = -charge + 1.1 * strike;
    pose.leftArm = swing * profile.leftArm;
    pose.rightArm = -swing * profile.rightArm;
    pose.lean = -charge * 0.025 + strike * profile.lunge;
    pose.drop =
      u.type === "giant" ? charge * 0.05 + strike * 0.045 : -charge * 0.007;
    if (u.type === "archer") pose.draw = charge * 0.045 - strike * 0.012;
    if (u.type === "mage") pose.breath = -charge * 0.013;
  }
  pose.recoil = (u.hitTimer / 0.15) * 0.028;
  return pose;
}

/** Mutates a preallocated x/y/u/v vertex buffer in place, with face and feet protected. */
export function deformGrid(
  vertices: number[],
  base: readonly number[],
  width: number,
  height: number,
  pose: Pose,
  type: UnitType,
) {
  const robe = type === "mage";
  for (let i = 0; i < base.length; i += 4) {
    const x = base[i],
      y = base[i + 1],
      nx = x / width,
      ny = y / height;
    const upper = 1 - smooth(0.7, 0.94, ny),
      leg = smooth(robe ? 0.87 : 0.77, 0.98, ny);
    const side = nx < 0.5 ? -1 : 1,
      sideWeight = smooth(0.02, 0.16, Math.abs(nx - 0.5));
    let dx = pose.stride * width * side * leg * sideWeight;
    let dy =
      -(side < 0 ? pose.liftLeft : pose.liftRight) * height * leg * sideWeight;
    dx += (pose.lean - pose.recoil) * height * upper;
    dy += (pose.drop + pose.breath) * height * upper;
    const arm = (left: boolean) => {
      const edge = left ? nx : 1 - nx;
      if (type === "giant") {
        // Broad shoulders share pixels with the torso: constrain skinning to the
        // outer forearms, rather than rotating the neck and belly along with them.
        const mask =
          (1 - smooth(0.11, 0.24, edge)) *
          smooth(0.38, 0.52, ny) *
          (1 - smooth(0.79, 0.87, ny));
        const swing =
          (left ? pose.leftArm : -pose.rightArm) / MOTION.giant.leftArm;
        dx += (left ? 1 : -1) * swing * width * 0.025 * mask;
        dy += swing * height * (swing < 0 ? 0.085 : 0.025) * mask;
        return;
      }
      const mask =
        (1 - smooth(0.19, 0.4, edge)) *
        Math.max(smooth(0.36, 0.49, ny), 1 - smooth(0.14, 0.22, edge)) *
        (1 - smooth(0.78, 0.91, ny));
      const angle = (left ? pose.leftArm : pose.rightArm) * mask;
      if (!angle) return;
      const px = (left ? 0.29 : 0.74) * width,
        py = 0.57 * height;
      const rx = x - px,
        ry = y - py,
        c = Math.cos(angle),
        s = Math.sin(angle);
      dx += rx * (c - 1) - ry * s;
      dy += rx * s + ry * (c - 1);
    };
    arm(true);
    arm(false);
    dx -=
      pose.draw *
      width *
      (1 - smooth(0.25, 0.49, nx)) *
      smooth(0.35, 0.52, ny) *
      (1 - smooth(0.7, 0.82, ny));
    vertices[i] = x + dx;
    vertices[i + 1] = y + dy;
  }
}

export function createCharacterGrid(
  width: number,
  height: number,
  uv: { u0: number; v0: number; u1: number; v1: number },
  columns = 12,
  rows = 22,
) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= rows; row++)
    for (let col = 0; col <= columns; col++)
      vertices.push(
        (width * col) / columns,
        (height * row) / rows,
        uv.u0 + ((uv.u1 - uv.u0) * col) / columns,
        uv.v0 + ((uv.v1 - uv.v0) * row) / rows,
      );
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col,
        b = a + columns + 1;
      indices.push(a, b, a + 1, 0, b, a + 1, b + 1, 0);
    }
  return { vertices, indices };
}
