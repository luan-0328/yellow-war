import Phaser from "phaser";
import { drawBase, drawWorld } from "../ui/WorldArt";
import { GameButton, bindButtonKeyboard, text } from "../ui/primitives";
import { UNIT_CONFIG } from "../config/unitConfig";
import { Unit } from "../entities/Unit";
import { Mine } from "../entities/Mine";
import { BattleModel } from "../game/BattleModel";
import { HUD } from "../ui/HUD";
import { RecruitPanel } from "../ui/RecruitPanel";
import { CommandPanel } from "../ui/CommandPanel";
import type { Command } from "../types/match";
import { audio } from "../services/AudioService";
import { CombatEffects } from "../ui/CombatEffects";

export class BattleScene extends Phaser.Scene {
  private model!: BattleModel;
  private views = new Map<number, Unit>();
  private hud!: HUD;
  private recruits!: RecruitPanel;
  private commands!: CommandPanel;
  private effects!: Phaser.GameObjects.Graphics;
  private combatEffects!: CombatEffects;
  private orderFlag!: Phaser.GameObjects.Graphics;
  private orderLabel!: Phaser.GameObjects.Text;
  private finished = false;
  private noticeTimer = 0;
  private inspectTimer = 0;
  constructor() {
    super("Battle");
  }
  create() {
    this.input.enabled = true;
    if (this.input.keyboard) this.input.keyboard.enabled = true;
    this.model = new BattleModel();
    this.views = new Map();
    this.finished = false;
    this.noticeTimer = 8;
    this.inspectTimer = 0;
    drawWorld(this);
    drawBase(this, 85);
    drawBase(this, 1195, true);
    new Mine(this, 250);
    new Mine(this, 1030);
    this.orderFlag = this.add.graphics().setDepth(520);
    this.orderLabel = text(this, 1115, 605, "进攻目标", 12, "#ffe2a0")
      .setOrigin(0.5)
      .setDepth(610);
    this.effects = this.add.graphics().setDepth(625);
    this.combatEffects = new CombatEffects(this);
    this.hud = new HUD(this);
    this.commands = new CommandPanel(this, (command) => this.order(command));
    this.recruits = new RecruitPanel(
      this,
      (type) => {
        const error = this.model.recruit(type);
        this.notify(
          error || `已招募${UNIT_CONFIG[type].name}，前往我方营地集合。`,
        );
      },
      (message) => this.notify(message, 3),
    );
    const compact = this.scale.displaySize.width < 1000;
    const pause = new GameButton(
      this,
      1095,
      compact ? 21 : 38,
      142,
      compact ? 82 : 46,
      compact ? "暂停" : "暂停  [Esc]",
      () => this.pause(),
    );
    bindButtonKeyboard(this, [
      pause,
      ...this.commands.buttons,
      ...this.recruits.buttons,
    ]);
    const keyboard = (event: KeyboardEvent) => {
      if (this.model.state.status !== "playing" || event.repeat) return;
      if (event.key === "Escape") {
        this.pause();
        return;
      }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 6) {
        this.recruits.buttons[index].activate();
        return;
      }
      const orders: Record<string, Command> = {
        a: "advance",
        d: "hold",
        r: "rally",
      };
      if (orders[event.key.toLowerCase()])
        this.order(orders[event.key.toLowerCase()]);
    };
    const resume = () => {
      this.model.resume();
      this.input.enabled = true;
      if (this.input.keyboard) this.input.keyboard.enabled = true;
      this.game.canvas.setAttribute(
        "aria-label",
        "战斗继续。1 至 6 招募，A 进攻 D 防守 R 集合，Esc 暂停。",
      );
    };
    const hidden = () => {
      if (document.hidden) this.pause();
    };
    this.input.keyboard?.on("keydown", keyboard);
    this.game.events.on("resume-match", resume);
    document.addEventListener("visibilitychange", hidden);
    this.events.once("shutdown", () => {
      this.input.keyboard?.off("keydown", keyboard);
      this.game.events.off("resume-match", resume);
      document.removeEventListener("visibilitychange", hidden);
      this.scene.stop("Pause");
    });
    this.render(0);
    audio.unlock();
  }
  private order(command: Command) {
    this.model.order(command);
    const labels = {
      advance: "进攻：全军向敌方营地推进。",
      hold: "防守：守住我方防线，迎击靠近的敌人。",
      rally: "集合：战斗单位返回营地前方，矿工继续采矿。",
    };
    this.notify(labels[command]);
  }
  private notify(message: string, seconds = 4) {
    this.hud.notice.setText(message);
    this.noticeTimer = seconds;
  }
  private pause() {
    if (this.model.state.status !== "playing") return;
    this.model.pause();
    this.input.enabled = false;
    if (this.input.keyboard) this.input.keyboard.enabled = false;
    this.game.canvas.setAttribute(
      "aria-label",
      "战场已暂停。Enter 继续，Tab 选择音量、静音或返回菜单。",
    );
    this.scene.launch("Pause");
  }
  update(_time: number, delta: number) {
    if (!this.model || this.finished) return;
    if (this.model.state.status === "paused") return;
    const dt = Math.min(delta / 1000, 0.1);
    this.model.update(dt);
    this.render(dt);
    if (
      this.model.state.status === "victory" ||
      this.model.state.status === "defeat"
    ) {
      this.finished = true;
      this.scene.start("Result", { match: structuredClone(this.model.state) });
    }
  }
  private render(dt: number) {
    const ids = new Set(this.model.units.map((u) => u.id));
    for (const [id, view] of this.views)
      if (!ids.has(id)) {
        view.destroy();
        this.views.delete(id);
      }
    for (const unit of this.model.units) {
      let view = this.views.get(unit.id);
      if (!view) {
        view = new Unit(
          this,
          UNIT_CONFIG[unit.type],
          unit.x,
          unit.y,
          undefined,
          unit.team,
          true,
        );
        this.views.set(unit.id, view);
        view.sprite.setInteractive({ useHandCursor: true });
        view.sprite.on("pointerdown", () =>
          this.notify(
            `${UNIT_CONFIG[unit.type].name} · ${UNIT_CONFIG[unit.type].description}`,
          ),
        );
      }
      view.sync(this, unit);
      if (view.footfall)
        this.combatEffects.step(unit.x, unit.y, unit.type === "giant");
    }
    for (const event of this.model.events) {
      this.combatEffects.add(event);
      if (event.kind === "deposit" && event.team === "player") {
        audio.play("deposit");
      }
      if (event.kind === "attack")
        audio.play(
          event.type === "giant"
            ? "heavy"
            : event.type === "mage"
              ? "magic"
              : event.type === "archer"
                ? "bow"
                : "slash",
        );
      if (event.kind === "hit") audio.play("hit");
      if (event.kind === "mine" && event.team === "player") audio.play("mine");
    }
    this.model.events.length = 0;
    const g = this.effects.clear();
    for (const shot of this.model.shots) {
      const direction = shot.team === "player" ? 1 : -1;
      if (shot.type === "mage") {
        g.fillStyle(0x7bd9ff, 0.22).fillCircle(shot.x, shot.y, 13);
        g.fillStyle(0xc5f5ff).fillCircle(shot.x, shot.y, 5);
      } else {
        g.lineStyle(3, 0x503c24).lineBetween(
          shot.x - 16 * direction,
          shot.y + 2,
          shot.x + 7 * direction,
          shot.y,
        );
        g.fillStyle(0xe8e3d0).fillTriangle(
          shot.x + 11 * direction,
          shot.y,
          shot.x + 3 * direction,
          shot.y - 4,
          shot.x + 3 * direction,
          shot.y + 4,
        );
      }
    }
    this.combatEffects.update(dt);
    const command = this.model.state.player.command,
      flagX = command === "advance" ? 1115 : command === "hold" ? 380 : 330;
    this.orderFlag
      .clear()
      .lineStyle(2, 0x604a28)
      .lineBetween(flagX, 584, flagX, 540)
      .fillStyle(0xf0c457, 0.85)
      .fillTriangle(flagX, 540, flagX + 27, 546, flagX, 555);
    this.orderLabel
      .setX(flagX)
      .setText(
        command === "advance"
          ? "进攻目标"
          : command === "hold"
            ? "我方防线"
            : "集合点",
      );
    this.hud.update(this.model);
    this.recruits.update(this.model);
    this.commands.update(this.model.state.player.command);
    this.noticeTimer -= dt;
    if (this.noticeTimer <= 0)
      this.hud.notice.setText(
        "A 进攻  /  D 防守  /  R 集合  ·  1–6 招募  ·  Esc 暂停",
      );
    this.inspectTimer -= dt;
    if (this.inspectTimer <= 0) {
      this.inspectTimer = 0.25;
      const s = this.model.state;
      this.game.canvas.setAttribute(
        "aria-label",
        `Yellow War 战斗。金币 ${s.player.gold}，人口 ${this.model.population("player")}，我方基地 ${Math.ceil(s.player.baseHp)}，敌方基地 ${Math.ceil(s.enemy.baseHp)}。按 1 至 6 招募，A 进攻 D 防守 R 集合，Esc 暂停。`,
      );
      if (import.meta.env.DEV)
        this.game.canvas.dataset.match = JSON.stringify({
          status: s.status,
          time: s.elapsed,
          player: s.player,
          enemy: s.enemy,
          population: this.model.population("player"),
          enemyPopulation: this.model.population("enemy"),
          units: this.model.units.map((u) => ({
            type: u.type,
            team: u.team,
            hp: u.hp,
            x: Math.round(u.x),
            state: u.state,
          })),
          shots: this.model.shots.length,
        });
    }
  }
}
