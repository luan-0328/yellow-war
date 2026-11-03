import type { UnitType } from "../types/unit";

export interface MotionProfile {
  windup: number;
  recovery: number;
  stride: number;
  weight: number;
  leftArm: number;
  rightArm: number;
  lunge: number;
}
/** Timings are gameplay seconds; amplitudes are relative to the existing illustration. */
export const MOTION: Record<UnitType, MotionProfile> = {
  miner: {
    windup: 0.22,
    recovery: 0.28,
    stride: 43,
    weight: 0.7,
    leftArm: 0.5,
    rightArm: 0.12,
    lunge: 0.02,
  },
  swordsman: {
    windup: 0.2,
    recovery: 0.3,
    stride: 46,
    weight: 0.8,
    leftArm: 0.65,
    rightArm: 0.2,
    lunge: 0.075,
  },
  archer: {
    windup: 0.25,
    recovery: 0.27,
    stride: 48,
    weight: 0.65,
    leftArm: 0.14,
    rightArm: 0.26,
    lunge: 0.012,
  },
  spearman: {
    windup: 0.28,
    recovery: 0.34,
    stride: 53,
    weight: 1,
    leftArm: 0.24,
    rightArm: 0.13,
    lunge: 0.08,
  },
  mage: {
    windup: 0.38,
    recovery: 0.37,
    stride: 59,
    weight: 0.8,
    leftArm: 0.22,
    rightArm: 0.15,
    lunge: 0.015,
  },
  giant: {
    windup: 0.46,
    recovery: 0.46,
    stride: 68,
    weight: 1.8,
    leftArm: 0.56,
    rightArm: 0.56,
    lunge: 0.028,
  },
};
