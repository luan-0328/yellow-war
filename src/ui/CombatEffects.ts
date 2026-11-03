import Phaser from "phaser";
import type { BattleEvent } from "../types/match";
import { text } from "./primitives";
interface Effect {
  kind: BattleEvent["kind"] | "step";
  x: number;
  y: number;
  age: number;
  life: number;
  direction: number;
  type?: BattleEvent["type"];
  color: number;
  label?: Phaser.GameObjects.Text;
}
/** Bounded, model-timed effects; pausing freezes sparks, trails and labels. */
export class CombatEffects {
  private graphics: Phaser.GameObjects.Graphics;
  private items: Effect[] = [];
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(private scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(624);
    scene.events.once("shutdown", () => this.clear());
  }
  add(event: BattleEvent) {
    if (this.items.length >= 100) {
      const old = this.items.shift();
      old?.label?.destroy();
    }
    if (event.kind === "end" || event.kind === "recruit") return;
    const color =
      event.type === "mage"
        ? 0x82dbff
        : event.team === "player"
          ? 0xffdf85
          : 0xf2b399;
    const item: Effect = {
      ...event,
      age: 0,
      life:
        event.kind === "deposit"
          ? 0.8
          : event.kind === "windup"
            ? 0.32
            : event.type === "giant"
              ? 0.5
              : 0.27,
      direction: event.direction ?? (event.team === "player" ? 1 : -1),
      color,
    };
    if (event.kind === "deposit" && event.team === "player")
      item.label = text(
        this.scene,
        event.x,
        event.y - 115,
        "+55 金币",
        17,
        "#ffe180",
      )
        .setOrigin(0.5)
        .setDepth(640);
    this.items.push(item);
  }
  step(x: number, y: number, giant = false) {
    if (this.reduced || this.items.length >= 100) return;
    this.items.push({
      kind: "step",
      x,
      y,
      age: 0,
      life: giant ? 0.38 : 0.24,
      direction: 1,
      color: 0xc6ae7c,
    });
  }
  update(dt: number) {
    const g = this.graphics.clear();
    this.items = this.items.filter((e) => {
      e.age += dt;
      if (e.age >= e.life) {
        e.label?.destroy();
        return false;
      }
      const p = e.age / e.life,
        a = 1 - p,
        d = e.direction;
      if (e.label) {
        e.label.setY(e.y - 115 - p * 26).setAlpha(a);
        return true;
      }
      if (e.kind === "step") {
        g.fillStyle(e.color, a * 0.24);
        for (let i = 0; i < 3; i++)
          g.fillEllipse(
            e.x + (i - 1) * p * 17,
            e.y - p * 8,
            8 + p * 10,
            3 + p * 3,
          );
        return true;
      }
      if (e.kind === "windup") {
        if (e.type === "mage")
          g.lineStyle(2, 0x82dbff, a * 0.7).strokeCircle(
            e.x - d * 35,
            e.y - 130,
            9 + p * 14,
          );
        if (e.type === "archer")
          g.lineStyle(1, 0xf3dc91, a * 0.7).lineBetween(
            e.x + d * 27,
            e.y - 124,
            e.x + d * (30 + p * 16),
            e.y - 88,
          );
        return true;
      }
      if (e.kind === "mine") {
        g.fillStyle(0xffd66a, a);
        for (let i = 0; i < 4; i++)
          g.fillRect(
            e.x + (i - 1.5) * p * 24,
            e.y - 18 - Math.sin(p * Math.PI) * (18 + i * 4),
            3,
            3,
          );
        return true;
      }
      if (e.kind === "attack") {
        if (e.type === "swordsman" || e.type === "miner") {
          const points: Phaser.Math.Vector2[] = [];
          for (let i = 0; i <= 12; i++) {
            const angle = -1.35 + (i / 12) * 2.4;
            points.push(
              new Phaser.Math.Vector2(
                e.x + d * (18 + Math.cos(angle) * (42 + p * 16)),
                e.y - 96 + Math.sin(angle) * (44 + p * 10),
              ),
            );
          }
          g.lineStyle(7 * (1 - p) + 1, 0xffedbf, a * 0.8).strokePoints(
            points,
            false,
          );
          g.lineStyle(2, 0xffffff, a * 0.7).strokePoints(points, false);
        } else if (e.type === "spearman") {
          g.lineStyle(4, 0xffefc0, a * 0.8).lineBetween(
            e.x + d * 18,
            e.y - 105,
            e.x + d * (72 + p * 35),
            e.y - 105,
          );
          g.lineStyle(1, 0xffffff, a).lineBetween(
            e.x + d * 15,
            e.y - 112,
            e.x + d * (67 + p * 35),
            e.y - 112,
          );
        } else if (e.type === "giant") {
          g.lineStyle(4, 0xf1d89a, a * 0.65).strokeEllipse(
            e.x + d * 48,
            e.y - 2,
            25 + p * 125,
            6 + p * 22,
          );
          g.lineStyle(2, 0x675338, a)
            .lineBetween(e.x + d * 45, e.y, e.x + d * 70, e.y + 7)
            .lineBetween(e.x + d * 70, e.y + 7, e.x + d * 90, e.y + 3);
        } else if (e.type === "archer") {
          const arrowX = e.x + d * (35 + p * 120),
            arrowY = e.y - 103;
          g.lineStyle(2, 0xefd8a2, a).lineBetween(
            arrowX - d * 24,
            arrowY,
            arrowX,
            arrowY,
          );
          g.fillStyle(0xf6efdc, a).fillTriangle(
            arrowX + d * 7,
            arrowY,
            arrowX - d * 2,
            arrowY - 4,
            arrowX - d * 2,
            arrowY + 4,
          );
        } else if (e.type === "mage")
          g.lineStyle(3, 0xa1edff, a).strokeCircle(
            e.x + d * 25,
            e.y - 112,
            7 + p * 25,
          );
        return true;
      }
      if (e.kind === "hit") {
        g.lineStyle(e.type === "giant" ? 3 : 2, e.color, a).strokeCircle(
          e.x,
          e.y,
          4 + p * (e.type === "mage" ? 30 : 18),
        );
        if (!this.reduced)
          for (let i = 0; i < 5; i++) {
            const angle = i * Math.PI * 0.4;
            g.lineStyle(2, e.color, a).lineBetween(
              e.x + Math.cos(angle) * p * 15,
              e.y + Math.sin(angle) * p * 15,
              e.x + Math.cos(angle) * (8 + p * 26),
              e.y + Math.sin(angle) * (8 + p * 26),
            );
          }
      }
      return true;
    });
  }
  clear() {
    for (const effect of this.items) effect.label?.destroy();
    this.items = [];
    this.graphics.clear();
  }
}
