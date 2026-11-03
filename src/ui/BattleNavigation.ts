import Phaser from "phaser";
import { compactUI } from "./responsive";
import { BALANCE as B } from "../config/balanceConfig";
import { UNIT_CONFIG } from "../config/unitConfig";
import type { BattleModel } from "../game/BattleModel";
import { GameButton, panel, text } from "./primitives";

/** Training and map overview stay on screen while the battlefield scrolls. */
export class BattleNavigation {
  private top = 194;
  private height = 78;
  private mapTop = 228;
  private queueX = 20;
  private queueWidth = 440;
  private mapLeft = 580;
  private mapWidth = 574;
  private detach!: () => void;
  private scene!: Phaser.Scene;
  private queueText: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Graphics;
  private map: Phaser.GameObjects.Graphics;
  readonly buttons: GameButton[];
  constructor(
    scene: Phaser.Scene,
    private camera: Phaser.Cameras.Scene2D.Camera,
  ) {
    const compact = compactUI(scene);
    const width = scene.scale.gameSize.width;
    this.top = compact ? 120 : 194;
    this.height = compact ? 114 : 78;
    this.queueX = compact ? 476 : 20;
    this.queueWidth = compact ? Math.max(350, (width - 500) * 0.45) : 440;
    const mapX = compact ? this.queueX + this.queueWidth + 16 : 476;
    this.mapLeft = mapX + 108;
    this.mapWidth = Math.max(80, width - 118 - this.mapLeft);
    this.mapTop = this.top + (compact ? 58 : 34);
    panel(scene, this.queueX, this.top, this.queueWidth, this.height);
    this.queueText = text(
      scene,
      this.queueX + 16,
      this.top + 9,
      "",
      compact ? 20 : 15,
    ).setWordWrapWidth(this.queueWidth - 32);
    this.progress = scene.add.graphics();
    panel(scene, mapX, this.top, width - 20 - mapX, this.height);
    this.buttons = [
      new GameButton(
        scene,
        mapX + 8,
        this.top + 7,
        88,
        compact ? 100 : 60,
        "我方",
        () => camera.setScroll(0, 0),
      ),
      new GameButton(
        scene,
        width - 108,
        this.top + 7,
        88,
        compact ? 100 : 60,
        "敌方",
        () => camera.setScroll(Math.max(0, B.worldWidth - camera.width), 0),
      ),
    ];
    text(
      scene,
      this.mapLeft,
      this.top + 6,
      compact ? "拖动战场 / 点击定位" : "战线全览 · 点击定位 / 拖动战场 / ← →",
      compact ? 18 : 13,
      "#c8c6b3",
    );
    this.map = scene.add.graphics();
    const seek = (pointer: Phaser.Input.Pointer) => {
      const worldX =
        Phaser.Math.Clamp((pointer.x - this.mapLeft) / this.mapWidth, 0, 1) *
        B.worldWidth;
      camera.setScroll(
        Phaser.Math.Clamp(
          worldX - camera.width / 2,
          0,
          Math.max(0, B.worldWidth - camera.width),
        ),
        0,
      );
    };
    const zoneTop = this.top + (compact ? 7 : 34);
    scene.add
      .zone(this.mapLeft, zoneTop, this.mapWidth, compact ? 100 : 34)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", seek);
    const move = (pointer: Phaser.Input.Pointer) => {
      if (
        pointer.isDown &&
        pointer.downX >= this.mapLeft &&
        pointer.downX <= this.mapLeft + this.mapWidth &&
        pointer.downY >= zoneTop &&
        pointer.downY <= this.top + this.height - 5
      )
        seek(pointer);
    };
    scene.input.on("pointermove", move);
    this.detach = () => scene.input.off("pointermove", move);
    scene.events.once("shutdown", this.detach);
    this.scene = scene;
  }
  destroy() {
    this.detach();
    this.scene.events.off("shutdown", this.detach);
  }
  update(model: BattleModel) {
    const queue = model.training.player;
    const active = queue[0];
    this.queueText.setText(
      active
        ? [
            `训练 ${UNIT_CONFIG[active.unit.type].name} · ${Math.ceil(active.remaining)} 秒  (${queue.length}/5)`,
            queue.length > 1
              ? `等候：${queue
                  .slice(1)
                  .map((e) => UNIT_CONFIG[e.unit.type].name)
                  .join(" · ")}`
              : "完成后从我方营地出发",
          ]
        : ["营地待命 · 训练队列 0/5", "点击下方兵种，按顺序训练出营"],
    );
    const g = this.progress.clear();
    g.fillStyle(0x111c1c).fillRect(
      this.queueX + 16,
      this.top + this.height - 14,
      this.queueWidth - 32,
      4,
    );
    if (active)
      g.fillStyle(0xf0c457).fillRect(
        this.queueX + 16,
        this.top + this.height - 14,
        (this.queueWidth - 32) * (1 - active.remaining / active.duration),
        4,
      );
    const map = this.map.clear();
    map
      .fillStyle(0x111c1c)
      .fillRoundedRect(this.mapLeft, this.mapTop, this.mapWidth, 34, 3);
    map
      .lineStyle(2, 0x7a7955)
      .lineBetween(
        this.mapLeft + 6,
        this.mapTop + 21,
        this.mapLeft + this.mapWidth - 6,
        this.mapTop + 21,
      );
    for (const u of model.units) {
      if (u.hp <= 0) continue;
      map
        .fillStyle(u.team === "player" ? 0xf0c457 : 0xd88169)
        .fillRect(
          this.mapLeft + (u.x / B.worldWidth) * this.mapWidth - 2,
          this.mapTop + (u.type === "miner" ? 18 : 9),
          4,
          u.type === "miner" ? 6 : 12,
        );
    }
    for (const [team, color] of [
      ["player", 0x70b8c4],
      ["enemy", 0xd88169],
    ] as const) {
      map
        .fillStyle(color)
        .fillRect(
          this.mapLeft + (B.baseX[team] / B.worldWidth) * this.mapWidth - 4,
          this.mapTop + 6,
          8,
          20,
        );
    }
    map
      .lineStyle(1.5, 0xffedb2)
      .strokeRect(
        this.mapLeft + (this.camera.scrollX / B.worldWidth) * this.mapWidth,
        this.mapTop + 1,
        (this.camera.width / B.worldWidth) * this.mapWidth,
        32,
      );
  }
}
