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
import { BALANCE as B } from "../config/balanceConfig";
import { BattleNavigation } from "../ui/BattleNavigation";
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
  private navigation!: BattleNavigation;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private dragging = false;
  private lastDragX = 0;
  private pointerMoved = false;
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
    this.cameras.main.setBounds(0, 0, B.worldWidth, 720).setScroll(0, 0);
    this.dragging = false;
    this.pointerMoved = false;
    drawWorld(this, B.worldWidth);
    drawBase(this, B.baseX.player);
    drawBase(this, B.baseX.enemy, true);
    new Mine(this, B.mineX.player);
    new Mine(this, B.mineX.enemy);
    this.orderFlag = this.add.graphics().setDepth(520);
    this.orderLabel = text(this, 1115, 605, "进攻目标", 12, "#ffe2a0")
      .setOrigin(0.5)
      .setDepth(610);
    this.effects = this.add.graphics().setDepth(625);
    this.combatEffects = new CombatEffects(this);
    const worldObjects = new Set(this.children.list);
    this.hud = new HUD(this);
    this.commands = new CommandPanel(this, (command) => this.order(command));
    this.recruits = new RecruitPanel(
      this,
      (type) => {
        const error = this.model.recruit(type);
        this.notify(
          error ||
            `${UNIT_CONFIG[type].name}已加入训练队列，训练 ${UNIT_CONFIG[type].trainingTime} 秒。`,
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
    this.navigation = new BattleNavigation(this, this.cameras.main);
    // Keep HUD, buttons and their hit areas fixed; characters retain their world size.
    for (const child of this.children.list) {
      if (!worldObjects.has(child)) {
        const object = child as Phaser.GameObjects.Container;
        object.setScrollFactor(0).setDepth(2000 + object.depth);
      }
    }
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard?.addCapture(["LEFT", "RIGHT", "HOME", "END"]);
    const down = (p: Phaser.Input.Pointer) => {
      if (p.y > (compact ? 326 : 280) && p.y < 605) {
        this.dragging = true;
        this.lastDragX = p.x;
      }
    };
    const move = (p: Phaser.Input.Pointer) => {
      this.pointerMoved = true;
      if (this.dragging && p.isDown) {
        this.scrollBy(this.lastDragX - p.x);
        this.lastDragX = p.x;
      }
    };
    const up = () => {
      this.dragging = false;
    };
    this.input.on("pointerdown", down);
    this.input.on("pointermove", move);
    this.input.on("pointerup", up);
    this.input.on("pointerupoutside", up);
    this.events.once("shutdown", () => {
      this.input.off("pointerdown", down);
      this.input.off("pointermove", move);
      this.input.off("pointerup", up);
      this.input.off("pointerupoutside", up);
      this.input.keyboard?.removeCapture(["LEFT", "RIGHT", "HOME", "END"]);
    });
    bindButtonKeyboard(this, [
      pause,
      ...this.commands.buttons,
      ...this.recruits.buttons,
      ...this.navigation.buttons,
    ]);
    const keyboard = (event: KeyboardEvent) => {
      if (this.model.state.status !== "playing" || event.repeat) return;
      if (event.key === "Escape") {
        this.pause();
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        this.cameras.main.setScroll(
          event.key === "Home" ? 0 : B.worldWidth - 1280,
          0,
        );
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
    const portrait = () => {
      if (window.innerWidth < 768 && window.innerHeight > window.innerWidth)
        this.pause();
    };
    this.scale.on("resize", portrait);
    this.input.keyboard?.on("keydown", keyboard);
    this.game.events.on("resume-match", resume);
    document.addEventListener("visibilitychange", hidden);
    this.events.once("shutdown", () => {
      this.input.keyboard?.off("keydown", keyboard);
      this.scale.off("resize", portrait);
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
      hold: "防守列队：巨人 → 盾矛兵 → 剑士 → 弓箭手 → 法师。",
      rally: "集合：战斗单位返回营地前方，矿工继续采矿。",
    };
    this.notify(labels[command]);
    if (command === "hold") this.cameras.main.setScroll(0, 0);
  }
  private notify(message: string, seconds = 4) {
    this.hud.notice.setText(message);
    this.noticeTimer = seconds;
  }
  private pause() {
    if (this.model.state.status !== "playing") return;
    this.dragging = false;
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
    let pan =
      (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
    const pointer = this.input.activePointer;
    if (
      !pan &&
      this.pointerMoved &&
      !pointer.isDown &&
      !pointer.wasTouch &&
      pointer.y > (this.scale.displaySize.width < 1000 ? 326 : 280) &&
      pointer.y < 605
    ) {
      if (pointer.x < 28) pan = -1;
      else if (pointer.x > 1252) pan = 1;
    }
    this.scrollBy(pan * 760 * dt);
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
  private scrollBy(amount: number) {
    this.cameras.main.scrollX = Phaser.Math.Clamp(
      this.cameras.main.scrollX + amount,
      0,
      B.worldWidth - 1280,
    );
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
      flagX =
        command === "advance"
          ? B.baseX.enemy - 80
          : command === "hold"
            ? B.defenseX.player
            : B.rallyX.player;
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
    this.navigation.update(this.model);
    this.hud.update(this.model);
    this.recruits.update(this.model);
    this.commands.update(this.model.state.player.command);
    this.noticeTimer -= dt;
    if (this.noticeTimer <= 0)
      this.hud.notice.setText(
        "← → / 拖动看战场 · Home 回营 · 1–6 训练 · Esc 暂停",
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
          cameraX: this.cameras.main.scrollX,
          worldWidth: B.worldWidth,
          training: this.model.training.player.map((e) => ({
            type: e.unit.type,
            remaining: e.remaining,
          })),
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
            y: Math.round(u.y),
            x: Math.round(u.x),
            state: u.state,
          })),
          shots: this.model.shots.length,
        });
    }
  }
}
