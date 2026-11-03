import Phaser from "phaser";
import type { Team, UnitConfig, UnitRuntime } from "../types/unit";
import { BALANCE } from "../config/balanceConfig";
import { COLORS } from "../game/gameConfig";
import { MOTION } from "../config/motionConfig";
import {
  createCharacterGrid,
  deformGrid,
  poseForUnit,
} from "./CharacterMotion";
// Phaser 4.2.1 implements these methods in Mesh2D.js but omits them from its .d.ts.
interface CharacterMesh extends Phaser.GameObjects.Mesh2D {
  setTint(color: number): this;
  setTintMode(mode: number): this;
  clearTint(): this;
}

/** Static original portrait in menus; original-texture Mesh2D skin in battle. */
export class Unit {
  readonly sprite: Phaser.GameObjects.Image | CharacterMesh;
  private marker: Phaser.GameObjects.Graphics;
  private health?: Phaser.GameObjects.Graphics;
  private base?: number[];
  private walkPhase = 0;
  private lastX: number;
  private renderHeight: number;
  private lastStep = 0;
  footfall = false;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(
    scene: Phaser.Scene,
    readonly config: UnitConfig,
    public x: number,
    public footY: number,
    height = config.displayHeight,
    team: Team = "player",
    animated = false,
  ) {
    this.lastX = x;
    this.renderHeight = height;
    this.marker = scene.add.graphics().setDepth(footY - 0.5);
    const key = `${config.type}-display`,
      frame = scene.textures.get(key).get("body");
    if (animated && scene.game.renderer.type === Phaser.WEBGL) {
      const grid = createCharacterGrid(frame.width, frame.height, frame);
      this.base = grid.vertices.slice();
      const mesh = scene.add.mesh2d(
        x,
        footY,
        key,
        grid.vertices,
        grid.indices,
      ) as CharacterMesh;
      mesh.indicesOrdered = grid.indices;
      mesh
        .setUseOrderedIndices(true)
        .setSize(frame.width, frame.height)
        .setOrigin(0.5, 1);
      this.sprite = mesh;
      for (let i = 0; i < mesh.vertices.length; i += 4) {
        mesh.vertices[i] -= frame.width / 2;
        mesh.vertices[i + 1] -= frame.height;
      }
    } else
      this.sprite = scene.add.image(x, footY, key, "body").setOrigin(0.5, 1);
    this.sprite.setDepth(footY).setScale(height / frame.height);
    this.setTeam(team);
  }
  sync(scene: Phaser.Scene, unit: UnitRuntime) {
    const distance = unit.x - this.lastX,
      moving = Math.abs(distance) > 0.015 && unit.hp > 0;
    this.walkPhase +=
      (Math.abs(distance) * Math.PI * 2) / MOTION[unit.type].stride;
    const step = Math.floor(this.walkPhase / Math.PI);
    this.footfall = moving && step !== this.lastStep;
    this.lastStep = step;
    this.lastX = unit.x;
    this.x = unit.x;
    this.footY = unit.y;
    const pose = poseForUnit(unit, this.walkPhase, moving, this.reduced);
    this.sprite.setPosition(unit.x, unit.y).setDepth(unit.y);
    this.marker.setDepth(unit.y - 0.5);
    this.setTeam(unit.team);
    if (this.base && this.sprite instanceof Phaser.GameObjects.Mesh2D) {
      const mesh = this.sprite;
      deformGrid(
        mesh.vertices,
        this.base,
        mesh.width,
        mesh.height,
        pose,
        unit.type,
      );
      // Mesh2D's vertex transformer does not apply Image's origin or flip flags.
      for (let i = 0; i < mesh.vertices.length; i += 4) {
        mesh.vertices[i] = (mesh.vertices[i] - mesh.width / 2) * unit.facing;
        mesh.vertices[i + 1] -= mesh.height;
      }
    } else {
      this.sprite
        .setFlipX(unit.facing < 0)
        .setY(unit.y + pose.drop * this.renderHeight);
    }
    this.sprite.setAngle(unit.hp <= 0 ? unit.facing * pose.death * 65 : 0);
    this.health ??= scene.add.graphics();
    const y = unit.y - this.renderHeight - 12;
    this.health
      .clear()
      .setDepth(unit.y + 0.2)
      .fillStyle(0x152326, 0.85)
      .fillRoundedRect(unit.x - 23, y, 46, 5, 2);
    this.health
      .fillStyle(unit.team === "player" ? COLORS.blue : COLORS.red)
      .fillRect(unit.x - 22, y + 1, (44 * unit.hp) / this.config.maxHp, 3);
    if (unit.carrying) {
      this.health
        .fillStyle(0x6c482b)
        .fillRoundedRect(unit.x + 22, unit.y - 77, 17, 21, 4);
      this.health
        .fillStyle(COLORS.gold)
        .fillTriangle(
          unit.x + 23,
          unit.y - 70,
          unit.x + 30,
          unit.y - 81,
          unit.x + 37,
          unit.y - 70,
        );
    }
    if (unit.state === "mining") {
      this.health
        .fillStyle(0x24302b, 0.75)
        .fillRect(unit.x - 16, unit.y + 8, 32, 3);
      this.health
        .fillStyle(COLORS.gold)
        .fillRect(
          unit.x - 16,
          unit.y + 8,
          32 * (1 - unit.timer / BALANCE.mineDuration),
          3,
        );
    }
    if (unit.hitTimer > 0)
      this.sprite.setTint(0xffe7b0).setTintMode(Phaser.TintModes.FILL);
    else this.sprite.clearTint();
    const deadAlpha =
      unit.hp > 0
        ? 1
        : Math.max(0, 1 - unit.deathTimer / BALANCE.deathDuration);
    this.sprite.setAlpha(
      deadAlpha *
        (unit.state === "spawning"
          ? 0.5 + 0.5 * (1 - unit.timer / BALANCE.spawnDuration)
          : 1),
    );
    this.marker.setAlpha(deadAlpha);
    this.health.setAlpha(deadAlpha);
  }
  destroy() {
    this.sprite.destroy();
    this.marker.destroy();
    this.health?.destroy();
  }
  setTeam(team: Team, selected = false) {
    this.sprite.setFlipX(team === "enemy");
    const width = Math.max(55, this.sprite.displayWidth * 0.77);
    this.marker
      .clear()
      .fillStyle(0x222a24, 0.23)
      .fillEllipse(this.x, this.footY + 1, width + 12, 13);
    this.marker
      .lineStyle(
        selected ? 2 : 1.5,
        team === "player" ? COLORS.blue : COLORS.red,
        selected ? 1 : 0.5,
      )
      .strokeEllipse(this.x, this.footY + 1, width, 12);
  }
}
