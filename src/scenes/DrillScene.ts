import Phaser from "phaser";
import { UNITS } from "../config/unitConfig";
import { OrderSystem } from "../systems/OrderSystem";
import { MOTION } from "../config/motionConfig";
import { Unit } from "../entities/Unit";
import { Mine } from "../entities/Mine";
import { SpawnSystem } from "../systems/SpawnSystem";
import type { UnitRuntime } from "../types/unit";
import { drawWorld } from "../ui/WorldArt";
import { CombatEffects } from "../ui/CombatEffects";
import { GameButton, bindButtonKeyboard, panel, text } from "../ui/primitives";
import { audio } from "../services/AudioService";

type Mode = "march" | "mine" | "attack" | "idle" | "formation";
const MODES: Mode[] = ["march", "mine", "attack", "idle", "formation"];
const LABELS = ["行军", "采矿", "战斗", "待机", "防守列队"];
export class DrillScene extends Phaser.Scene {
  private clock = 0;
  private paused = false;
  private mode: Mode = "march";
  private direction: 1 | -1 = 1;
  private actors: {
    unit: UnitRuntime;
    view: Unit;
    x: number;
    lastPhase: number;
    label: Phaser.GameObjects.Text;
  }[] = [];
  private buttons: GameButton[] = [];
  private effects!: CombatEffects;
  private pauseButton!: GameButton;
  private inspectTimer = 0;
  constructor() {
    super("Drill");
  }
  create() {
    this.clock = 0;
    this.paused = false;
    this.mode = "march";
    this.direction = 1;
    this.actors = [];
    this.inspectTimer = 0;
    drawWorld(this);
    new Mine(this, 210);
    this.effects = new CombatEffects(this);
    panel(this, 20, 20, 1240, 82);
    text(this, 44, 31, "伙伴演练", 27, "#f0c457");
    text(this, 44, 72, "先看清每一个动作，再率领伙伴出征。", 14, "#c8c6b3");
    const back = new GameButton(this, 1090, 39, 145, 46, "返回菜单", () =>
      this.scene.start("Menu", { help: false }),
    );
    panel(this, 20, 119, 1240, 91);
    const compact = this.scale.displaySize.width < 1000;
    this.buttons = MODES.map(
      (mode, i) =>
        new GameButton(
          this,
          32 + i * 148,
          128,
          140,
          compact ? 74 : 62,
          `${LABELS[i]}  [${i + 1}]`,
          () => this.setMode(mode),
        ),
    );
    const flip = new GameButton(
      this,
      784,
      128,
      204,
      compact ? 74 : 62,
      "切换左右朝向",
      () => {
        this.direction = this.direction === 1 ? -1 : 1;
        this.effects.clear();
      },
    );
    this.pauseButton = new GameButton(
      this,
      1000,
      128,
      235,
      compact ? 74 : 62,
      "暂停演练  [P]",
      () => this.togglePause(),
    );
    UNITS.forEach((config, i) => {
      const x = 155 + i * 187,
        u = SpawnSystem.create(config.type, "player", i + 1);
      u.x = x;
      u.y = 578;
      u.state = "moving";
      u.attackTimer = 0;
      const view = new Unit(
        this,
        config,
        x,
        u.y,
        config.type === "giant" ? 260 : 185,
        "player",
        true,
      );
      const label = text(this, x, 612, config.name, 19, "#fff1ca").setOrigin(
        0.5,
      );
      this.actors.push({ unit: u, view, x, lastPhase: -1, label });
    });
    panel(this, 20, 639, 1240, 61);
    text(this, 44, 649, "1–5 切换动作 · P 暂停观察 · Esc 返回菜单", 16);
    text(
      this,
      44,
      677,
      "正式对局：1–6 招募伙伴，A 进攻 / D 防守 / R 集合。演练不消耗金币。",
      13,
      "#c8c6b3",
    );
    bindButtonKeyboard(this, [back, ...this.buttons, flip, this.pauseButton]);
    const key = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Escape") this.scene.start("Menu", { help: false });
      if (e.key.toLowerCase() === "p") this.togglePause();
      const i = Number(e.key) - 1;
      if (i >= 0 && i < MODES.length) this.setMode(MODES[i]);
    };
    this.input.keyboard?.on("keydown", key);
    this.events.once("shutdown", () =>
      this.input.keyboard?.off("keydown", key),
    );
    this.setMode(
      new URLSearchParams(location.search).get("view") === "formation"
        ? "formation"
        : "march",
    );
  }
  private togglePause() {
    this.paused = !this.paused;
    this.pauseButton.setLabel(this.paused ? "继续演练  [P]" : "暂停演练  [P]");
    this.describe();
  }
  private setMode(mode: Mode) {
    this.mode = mode;
    this.clock = 0;
    this.effects.clear();
    for (const actor of this.actors) actor.lastPhase = -1;
    this.buttons.forEach((button, i) => button.setSelected(MODES[i] === mode));
    this.describe();
  }
  private describe() {
    this.game.canvas.setAttribute(
      "aria-label",
      `Yellow War 伙伴演练，当前${LABELS[MODES.indexOf(this.mode)]}，${this.paused ? "已暂停" : "正在播放"}。1至5切换动作，P暂停，Esc返回。`,
    );
  }
  update(_time: number, delta: number) {
    if (this.paused) return;
    const dt = Math.min(delta / 1000, 0.1);
    this.clock += dt;
    for (const [i, actor] of this.actors.entries()) {
      const u = actor.unit,
        profile = MOTION[u.type];
      u.motionTime = this.clock + i * 0.2;
      u.attackElapsed = -1;
      u.pendingAttack = undefined;
      u.facing = this.direction;
      if (this.mode === "march") {
        const p = (this.clock * 0.65) % 4;
        u.x = actor.x + (p < 2 ? p - 1 : 3 - p) * 30 * this.direction;
        u.facing = ((p < 2 ? 1 : -1) * this.direction) as 1 | -1;
        u.state = "moving";
      } else {
        u.x = actor.x;
        u.state = "idle";
        if (this.mode === "mine" && u.type === "miner") {
          u.state = "mining";
          u.timer = 2.5 - (this.clock % 2.5);
          const phase = (this.clock % 2.5) % 0.78;
          if (actor.lastPhase >= 0 && actor.lastPhase < 0.5 && phase >= 0.5)
            this.effects.add({
              kind: "mine",
              team: "player",
              type: "miner",
              x: u.x + 40,
              y: u.y,
              direction: u.facing,
            });
          actor.lastPhase = phase;
        }
        if (this.mode === "attack") {
          const phase = (this.clock + i * 0.13) % UNITS[i].attackInterval;
          u.state = "attacking";
          u.attackElapsed =
            phase < profile.windup + profile.recovery ? phase : -1;
          if (
            actor.lastPhase >= 0 &&
            actor.lastPhase < profile.windup &&
            phase >= profile.windup
          ) {
            this.effects.add({
              kind: "attack",
              team: "player",
              type: u.type,
              x: u.x,
              y: u.y,
              direction: u.facing,
            });
            audio.play(
              u.type === "giant"
                ? "heavy"
                : u.type === "mage"
                  ? "magic"
                  : u.type === "archer"
                    ? "bow"
                    : "slash",
            );
          }
          actor.lastPhase = phase;
        }
      }
      if (this.mode === "formation") {
        const slot = OrderSystem.defensePosition(
          u,
          this.actors.map((a) => a.unit),
        );
        u.x = u.type === "miner" ? 210 : slot.x;
        u.y = u.type === "miner" ? 578 : slot.y;
        u.state = u.type === "miner" ? "mining" : "idle";
        u.timer = 2.5 - (this.clock % 2.5);
        u.facing = 1;
      } else u.y = 578;
      actor.label.setPosition(u.x, 612);
      actor.view.sync(this, u);
      if (actor.view.footfall) this.effects.step(u.x, u.y, u.type === "giant");
    }
    this.effects.update(dt);
    this.inspectTimer -= dt;
    if (this.inspectTimer <= 0) {
      this.inspectTimer = 0.15;
      this.game.canvas.dataset.drill = JSON.stringify({
        mode: this.mode,
        clock: this.clock,
        paused: this.paused,
        actors: this.actors.map(({ unit, view }) => ({
          type: unit.type,
          x: unit.x,
          y: unit.y,
          phase: unit.attackElapsed,
          facing: unit.facing,
          renderer: view.sprite.type,
          vertices:
            view.sprite instanceof Phaser.GameObjects.Mesh2D
              ? [
                  view.sprite.vertices[0],
                  view.sprite.vertices[1],
                  ...view.sprite.vertices.slice(-8, -4),
                ]
              : [],
        })),
      });
    }
  }
}
