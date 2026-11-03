import Phaser from "phaser";
import { BALANCE as B } from "../config/balanceConfig";
import { UNIT_CONFIG } from "../config/unitConfig";
import type { BattleModel } from "../game/BattleModel";
import { GameButton, panel, text } from "./primitives";

/** Training and map overview stay on screen while the battlefield scrolls. */
export class BattleNavigation {
  private queueText: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Graphics;
  private map: Phaser.GameObjects.Graphics;
  readonly buttons: GameButton[];
  constructor(
    scene: Phaser.Scene,
    private camera: Phaser.Cameras.Scene2D.Camera,
  ) {
    panel(scene, 20, 194, 440, 78);
    this.queueText = text(scene, 36, 203, "", 15);
    this.progress = scene.add.graphics();
    panel(scene, 476, 194, 784, 78);
    this.buttons = [
      new GameButton(scene, 486, 202, 80, 60, "我方", () =>
        camera.setScroll(0, 0),
      ),
      new GameButton(scene, 1170, 202, 80, 60, "敌方", () =>
        camera.setScroll(B.worldWidth - 1280, 0),
      ),
    ];
    text(
      scene,
      580,
      199,
      "战线全览 · 点击定位 / 拖动战场 / ← →",
      13,
      "#c8c6b3",
    );
    this.map = scene.add.graphics();
    const seek = (pointer: Phaser.Input.Pointer) => {
      const worldX =
        Phaser.Math.Clamp((pointer.x - 580) / 574, 0, 1) * B.worldWidth;
      camera.setScroll(
        Phaser.Math.Clamp(worldX - 640, 0, B.worldWidth - 1280),
        0,
      );
    };
    scene.add
      .zone(580, 228, 574, 34)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", seek);
    const move = (pointer: Phaser.Input.Pointer) => {
      if (
        pointer.isDown &&
        pointer.downX >= 580 &&
        pointer.downX <= 1154 &&
        pointer.downY >= 228 &&
        pointer.downY <= 262
      )
        seek(pointer);
    };
    scene.input.on("pointermove", move);
    scene.events.once("shutdown", () => scene.input.off("pointermove", move));
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
    g.fillStyle(0x111c1c).fillRect(36, 258, 408, 4);
    if (active)
      g.fillStyle(0xf0c457).fillRect(
        36,
        258,
        408 * (1 - active.remaining / active.duration),
        4,
      );
    const map = this.map.clear();
    map.fillStyle(0x111c1c).fillRoundedRect(580, 228, 574, 34, 3);
    map.lineStyle(2, 0x7a7955).lineBetween(586, 249, 1148, 249);
    for (const u of model.units) {
      if (u.hp <= 0) continue;
      map
        .fillStyle(u.team === "player" ? 0xf0c457 : 0xd88169)
        .fillRect(
          580 + (u.x / B.worldWidth) * 574 - 2,
          u.type === "miner" ? 246 : 237,
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
        .fillRect(580 + (B.baseX[team] / B.worldWidth) * 574 - 4, 234, 8, 20);
    }
    map
      .lineStyle(1.5, 0xffedb2)
      .strokeRect(
        580 + (this.camera.scrollX / B.worldWidth) * 574,
        229,
        (1280 / B.worldWidth) * 574,
        32,
      );
  }
}
